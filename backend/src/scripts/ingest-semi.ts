import { config } from 'dotenv';
config({ path: '.env.local' });

import { hasFlag, parseArg } from '../ingestion/utils';

async function main() {
  const [{ INGESTION_DEFAULTS }, { runSemiAutomaticIngestion }, { printJobReport }] =
    await Promise.all([
      import('../ingestion/config'),
      import('../ingestion/pipeline'),
      import('../ingestion/report'),
    ]);

  const shadowMode = hasFlag('--shadow')
    ? true
    : hasFlag('--publish')
      ? false
      : INGESTION_DEFAULTS.SHADOW_MODE;

  const dryRun = hasFlag('--dry-run');
  const noDeletion = hasFlag('--no-detect-deletions');

  const autoPublishMinScoreRaw = parseArg('--minScore');
  const maxTimeoutRaw = parseArg('--timeoutMs');
  const retryRaw = parseArg('--retryCount');

  const report = await runSemiAutomaticIngestion({
    trigger: 'manual',
    shadow_mode: shadowMode,
    dry_run: dryRun,
    detect_deletions: !noDeletion,
    auto_publish_min_score: autoPublishMinScoreRaw
      ? Number(autoPublishMinScoreRaw)
      : INGESTION_DEFAULTS.AUTO_PUBLISH_MIN_SCORE,
    max_source_timeout_ms: maxTimeoutRaw
      ? Number(maxTimeoutRaw)
      : INGESTION_DEFAULTS.MAX_SOURCE_TIMEOUT_MS,
    retry_count: retryRaw
      ? Number(retryRaw)
      : INGESTION_DEFAULTS.RETRY_COUNT,
  });

  printJobReport(report);

  if (report.status === 'FAILED' || report.status === 'FAILED_SAFE') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[ingest:semi] Fatal error:', error);
  process.exit(1);
});
