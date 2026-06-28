# GOAT Verified Agent — Live Showcase

A working demonstration that ThoughtProof verification runs inside a GOAT
AgentKit agent: every decision is verified before execution, and when the
verifier is uncertain, the agent gets the objections back and **re-plans** —
the strongest part of the loop (mirrors CB4A's reconsider pattern).

This is the GOAT counterpart to the CB4A trading experiment: instead of an
unused npm package, it's something you can run and point a partner at.

## What it shows

A stream of mixed GOAT-native agent decisions (cross-chain bridge, token
delegation, reputation feedback, token transfer):

```
Agent decision
  └─► Sentinel (output_synthesis, standard tier, ~$0.008)
        ├── ALLOW              → execute
        ├── BLOCK              → halt
        └── UNCERTAIN + objections
              └─► RE-PLAN: agent reconsiders the objections (Kimi)
                    ├── STAND_DOWN  → halt (the agent caught its own flaw)
                    ├── REVISE      → re-verify the corrected claim
                    └── REAFFIRM    → re-verify with a defense
              (fallback: if replan fails, escalate to RV deep verification)
```

Each verdict is appended to `verdicts.jsonl` and rendered by `dashboard.html`.
In live mode each verdict becomes an on-chain ERC-8004 reputation entry
(`erc8004.give_feedback`) → *"this agent has N independently verified decisions."*
Currently the reputation write is **shadow mode** (logged, not on-chain) —
Option A: verification loop made visible, zero on-chain risk.

## Run it

```bash
# Keys are read from ../../../verified-trading-agent/.env automatically:
#   THOUGHTPROOF_API_KEY (Sentinel/RV auth, X-Sentinel-Key)
#   MOONSHOT_API_KEY     (re-planning model, Kimi)
npx tsx examples/goat-showcase/runner.ts
```

Then open the dashboard (needs a server for the fetch of `_rows.json`):

```bash
cd examples/goat-showcase && python3 -m http.server 8137
# → http://localhost:8137/dashboard.html
```

## Files

| File | Purpose |
|------|---------|
| `runner.ts` | Drives the scenarios, calls Sentinel/RV, runs the re-plan loop, writes `verdicts.jsonl` |
| `replan.ts` | The reconsider() loop — feeds objections back to the agent model |
| `dashboard.html` | Visual verdict stream (TP brand, dark/#ffa726), renders the re-plan step |
| `verdicts.jsonl` | Last run's verdicts (machine log) |
| `_rows.json` | Slim verdict data the dashboard fetches |

## Notes

- Verdicts are **real API responses** — nothing hand-set. They vary slightly
  between runs (LLM non-determinism); that's authentic, not a bug.
- `action_authorization` mode needs a principal mandate to verify against;
  `output_synthesis` (used here) checks reasoning↔evidence faithfulness, which
  is the right mode for "is this decision well-grounded."
- To go live (Option B): wire the verdict → `erc8004.give_feedback` with a
  funded GOAT wallet + a registered ERC-8004 agent.
