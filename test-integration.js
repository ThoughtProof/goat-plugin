#!/usr/bin/env node

// Simple integration test to verify the package can be imported and used
import {
  thoughtproofSentinelAction,
  thoughtproofVerifyAction,
  thoughtproofAttestAction,
  thoughtproofStatusAction,
  HttpThoughtProofAdapter,
} from './dist/index.js';

console.log('✅ Successfully imported all exports from @thoughtproof/goat-plugin');

// Test that we can create an adapter
const adapter = new HttpThoughtProofAdapter({ apiKey: 'test-key' });
console.log('✅ Successfully created HttpThoughtProofAdapter');

// Test that we can create actions
const sentinelAction = thoughtproofSentinelAction(adapter);
const verifyAction = thoughtproofVerifyAction(adapter);
const attestAction = thoughtproofAttestAction(adapter);
const statusAction = thoughtproofStatusAction(adapter);

console.log('✅ Successfully created all action functions');

// Verify action metadata
console.log('Actions created:');
console.log(`- ${sentinelAction.name} (${sentinelAction.riskLevel})`);
console.log(`- ${verifyAction.name} (${verifyAction.riskLevel})`);
console.log(`- ${attestAction.name} (${attestAction.riskLevel})`);
console.log(`- ${statusAction.name} (${statusAction.riskLevel})`);

console.log('\n🎉 Package integration test passed!');