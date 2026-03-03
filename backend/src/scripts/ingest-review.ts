import { config } from 'dotenv';
config({ path: '.env.local' });

import { parseArg } from '../ingestion/utils';

async function main() {
  const { reviewPendingCandidates } = await import('../ingestion/operators');

  const limitRaw = parseArg('--limit');
  const limit = limitRaw ? Number(limitRaw) : 50;

  const candidates = await reviewPendingCandidates(limit);
  if (candidates.length === 0) {
    console.log('No pending ingestion candidates.');
    return;
  }

  console.log(`Pending candidates: ${candidates.length}\n`);
  for (const c of candidates) {
    console.log(
      `- ${c.candidate_id} | ${c.classification} | scheme=${c.scheme_id} | score=${c.authenticity.score} | job=${c.job_id}`,
    );
    if (c.changed_fields.length > 0) {
      console.log(`  changed_fields: ${c.changed_fields.join(', ')}`);
    }
    console.log(`  reason: ${c.reason}`);
    if (c.evidence_ref) {
      console.log(`  evidence_ref: ${c.evidence_ref}`);
    }
  }
}

main().catch((error) => {
  console.error('[ingest:review] Fatal error:', error);
  process.exit(1);
});
