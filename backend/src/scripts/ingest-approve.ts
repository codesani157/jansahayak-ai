import { config } from 'dotenv';
config({ path: '.env.local' });

import { parseArg } from '../ingestion/utils';

async function main() {
  const { approveCandidate } = await import('../ingestion/operators');

  const candidateId = parseArg('--candidateId');
  if (!candidateId) {
    console.error('Usage: npm run ingest:approve -- --candidateId=<id>');
    process.exit(1);
  }

  const result = await approveCandidate(candidateId);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }

  console.log(result.message);
}

main().catch((error) => {
  console.error('[ingest:approve] Fatal error:', error);
  process.exit(1);
});
