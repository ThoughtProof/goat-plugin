/**
 * Re-planning loop for the GOAT showcase.
 *
 * Mirrors CB4A's reconsider() pattern (cb4a-verify/src/experiment/engine.ts):
 * when Sentinel/RV returns objections, feed them back to the agent's model so
 * it can STAND DOWN, REAFFIRM, or REVISE — then re-verify. This is the feature
 * Raul considers CB4A's strongest: the gate doesn't just block, it makes the
 * agent's reasoning better.
 *
 * Generic over decision types (not trading-specific): works for cross-chain,
 * delegation, reputation, transfers — any GOAT agent decision.
 *
 * Uses Moonshot/Kimi (same model CB4A defaults to) via OpenAI-compatible API.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MOONSHOT_URL = 'https://api.moonshot.ai/v1/chat/completions';
const MODEL = process.env.REPLAN_MODEL || 'kimi-k2.6';

/**
 * Resolve the replan model key. Prefer REPLAN_API_KEY / MOONSHOT_API_KEY from
 * env; if absent, read it directly from the shared agent .env file so the
 * showcase works without manual key plumbing (the file is the source of truth
 * for CB4A too).
 */
function resolveModelKey(): string {
  const fromEnv = process.env.REPLAN_API_KEY || process.env.MOONSHOT_API_KEY;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  // Fallback: read MOONSHOT_API_KEY straight from verified-trading-agent/.env
  try {
    const envPath = join(__dirname, '..', '..', '..', 'verified-trading-agent', '.env');
    const txt = readFileSync(envPath, 'utf-8');
    for (const line of txt.split('\n')) {
      const t = line.trim();
      if (t.startsWith('#') || !t.includes('=')) continue;
      const [k, ...rest] = t.split('=');
      if (k.trim() === 'MOONSHOT_API_KEY') {
        return rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* fall through */ }
  return '';
}

export interface RevisedDecision {
  /** STAND_DOWN = agent halts; REVISE/REAFFIRM = agent has a new/defended claim */
  outcome: 'STAND_DOWN' | 'REVISE' | 'REAFFIRM';
  /** The revised claim + evidence to re-verify (empty if STAND_DOWN) */
  newClaim: string;
  newEvidence: string;
  /** The model's explanation of what it did */
  rationale: string;
  raw: string;
}

function extractJson(text: string): any {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('no JSON in replan response');
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return JSON.parse(text.slice(start, i + 1)); }
  }
  throw new Error('unbalanced JSON in replan response');
}

/**
 * Feed Sentinel/RV objections back to the agent model. The model decides
 * whether to stand down, reaffirm, or revise the decision.
 */
export async function reconsider(params: {
  originalClaim: string;
  originalEvidence: string;
  actionType: string;
  objections: string[];
  apiKey: string;
}): Promise<RevisedDecision> {
  const modelKey = resolveModelKey();
  if (!modelKey) throw new Error('no replan model key (set MOONSHOT_API_KEY)');
  const objectionList = params.objections.map((o, i) => `${i + 1}. ${o}`).join('\n');

  const userMsg = `You are a GOAT-network agent. You proposed this action (${params.actionType}):

CLAIM (your reasoning): ${params.originalClaim}
EVIDENCE you cited: ${params.originalEvidence}

An independent verification system (ThoughtProof) reviewed your reasoning and flagged these concerns:
${objectionList}

Decide honestly. You have three options:
1. STAND_DOWN — the objections exposed a real flaw. Don't execute. (Good agents revise; no shame in halting.)
2. REAFFIRM — the objections miss key context. Explain specifically why each is wrong/irrelevant, keep the original claim.
3. REVISE — the objections are partly valid. Produce a corrected claim that addresses them (add the missing facts, tighten the scope, fix the premise) while keeping any real edge.

Respond ONLY with JSON:
{
  "outcome": "STAND_DOWN" | "REAFFIRM" | "REVISE",
  "newClaim": "the revised or reaffirmed reasoning (empty string if STAND_DOWN)",
  "newEvidence": "supporting evidence for the new claim (empty string if STAND_DOWN)",
  "rationale": "one sentence: what you did and why"
}`;

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are a careful autonomous agent that revises its decisions when verification flags real problems. Output only valid JSON.' },
      { role: 'user', content: userMsg },
    ],
    max_tokens: 4000,
    temperature: 1,
    response_format: { type: 'json_object' as const },
  };

  const MAX_ATTEMPTS = 3;
  let content = '';
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(MOONSHOT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${modelKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`replan model error ${res.status}: ${await res.text().catch(() => '')}`);
      const data = await res.json() as any;
      const msg = data?.choices?.[0]?.message ?? {};
      // kimi-k2.6 is a reasoning model: it sometimes exhausts the token budget
      // on reasoning_content and returns content=''. Fall back to reasoning_content
      // (which may contain the JSON) before giving up.
      content = (msg.content ?? '').trim() || (msg.reasoning_content ?? '').trim();
      if (!content) throw new Error('no JSON decision (empty content)');
      const parsed = extractJson(content);
      const outcome = String(parsed.outcome ?? 'STAND_DOWN').toUpperCase();
      return {
        outcome: (outcome === 'REVISE' || outcome === 'REAFFIRM') ? outcome as any : 'STAND_DOWN',
        newClaim: String(parsed.newClaim ?? ''),
        newEvidence: String(parsed.newEvidence ?? ''),
        rationale: String(parsed.rationale ?? ''),
        raw: content,
      };
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr ?? new Error('replan failed');
}
