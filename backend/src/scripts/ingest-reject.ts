import { config } from 'dotenv';
config({ path: '.env.local' });

import { parseArg } from '../ingestion/utils';

async function main() {
  const { rejectCandidate } = await import('../ingestion/operators');

  const candidateId = parseArg('--candidateId');
  const reason = parseArg('--reason') ?? 'Rejected by operator';

  if (!candidateId) {
    console.error(
      'Usage: npm run ingest:reject -- --candidateId=<id> --reason="<reason>"',
    );
    process.exit(1);
  }

  const result = await rejectCandidate(candidateId, reason);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }

  console.log(result.message);
}

main().catch((error) => {
  console.error('[ingest:reject] Fatal error:', error);
  process.exit(1);
});
