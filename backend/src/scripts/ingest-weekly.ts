import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const [{ runSemiAutomaticIngestion }, { printJobReport }] = await Promise.all([
    import('../ingestion/pipeline'),
    import('../ingestion/report'),
  ]);

  const report = await runSemiAutomaticIngestion({
    trigger: 'weekly_scheduler',
  });
  printJobReport(report);

  if (report.status === 'FAILED' || report.status === 'FAILED_SAFE') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[ingest:weekly] Fatal error:', error);
  process.exit(1);
});
