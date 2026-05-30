// ThoughtProof Plugin for GOAT AgentKit
// Epistemic verification layer: Sentinel (triage) + RV (deep verification)

export { thoughtproofSentinelAction } from './actions/sentinel.js';
export { thoughtproofVerifyAction } from './actions/verify.js';
export { thoughtproofAttestAction } from './actions/attest.js';
export { thoughtproofStatusAction } from './actions/status.js';

export { HttpThoughtProofAdapter } from './adapters/http-thoughtproof.js';

export type {
  ThoughtProofAdapter,
  ThoughtProofConfig,
  X402Signer,
  Verdict,
  SentinelVerifyInput,
  SentinelVerifyOutput,
  RVTier,
  RVVerifyInput,
  RVVerifyOutput,
  AttestationSource,
  AttestInput,
  AttestOutput,
  StatusOutput,
} from './adapters/types.js';

export type { ReputationHookConfig } from './hooks/reputation.js';
export { submitReputationFeedback } from './hooks/reputation.js';
