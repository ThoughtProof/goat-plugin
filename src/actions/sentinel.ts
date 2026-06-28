import { z } from 'zod';
import type { ActionDefinition } from '@goatnetwork/agentkit/core';
import type { ThoughtProofAdapter, SentinelVerifyInput, SentinelVerifyOutput } from '../adapters/types.js';

const inputSchema = z.object({
  claim: z.string().min(1, 'claim must not be empty — the agent reasoning or planned action to verify'),
  evidence: z.string().optional().describe('Supporting evidence or context for the claim'),
  mode: z.enum(['handoff', 'plan_revision', 'memory_write', 'output_synthesis', 'trade_execution', 'trade_reasoning', 'action_authorization'])
    .optional()
    .describe('Sentinel verification mode (default: output_synthesis)'),
  tier: z.enum(['checkpoint', 'standard'])
    .optional()
    .describe('Verification tier: standard (DEFAULT, ~$0.008, nano→swift cascade, 0 false-allows) or checkpoint (~$0.005, nano solo, high-volume low-stakes)'),
});

/**
 * Pre-execution verification via ThoughtProof Sentinel.
 *
 * Checks agent reasoning and planned actions BEFORE execution.
 * Returns ALLOW (safe to proceed), BLOCK (stop), or UNCERTAIN (escalate to RV).
 *
 * Cost: ~$0.008 per call (standard tier, nano→swift cascade). Designed for every agent decision cycle.
 */
export function thoughtproofSentinelAction(
  adapter: ThoughtProofAdapter,
): ActionDefinition<SentinelVerifyInput, SentinelVerifyOutput> {
  return {
    name: 'thoughtproof.sentinel',
    description:
      'Pre-execution verification: check agent reasoning before executing an action. ' +
      'Send the agent\'s planned action and reasoning as "claim", get back ALLOW, BLOCK, or UNCERTAIN. ' +
      'Use before every economic decision. Fast (~1-2s) and cheap (~$0.008, standard cascade). ' +
      'If UNCERTAIN, escalate to thoughtproof.verify for deeper analysis.',
    riskLevel: 'read',
    requiresConfirmation: false,
    networks: ['goat-mainnet', 'goat-testnet'],
    zodInputSchema: inputSchema,
    async execute(ctx, input) {
      return adapter.sentinelVerify(input, ctx.signal);
    },
  };
}