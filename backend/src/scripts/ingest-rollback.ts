import { config } from 'dotenv';
config({ path: '.env.local' });

import { parseArg } from '../ingestion/utils';

async function main() {
  const { rollbackPublishedJob } = await import('../ingestion/operators');

  const jobId = parseArg('--jobId');
  if (!jobId) {
    console.error('Usage: npm run ingest:rollback -- --jobId=<job_id>');
    process.exit(1);
  }

  const result = await rollbackPublishedJob(jobId);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }

  console.log(result.message);
}

main().catch((error) => {
  console.error('[ingest:rollback] Fatal error:', error);
  process.exit(1);
});
