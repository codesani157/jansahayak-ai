import type { IngestionJobReport } from './types';

export function printJobReport(report: IngestionJobReport): void {
  console.log('\n' + '='.repeat(70));
  console.log('GovGuide Semi-Automatic Ingestion Report');
  console.log('='.repeat(70));
  console.log(`Job ID:                 ${report.job_id}`);
  console.log(`Trigger:                ${report.trigger}`);
  console.log(`Status:                 ${report.status}`);
  console.log(`Started:                ${report.started_at}`);
  console.log(`Completed:              ${report.completed_at}`);
  console.log('-'.repeat(70));
  console.log(`Sources processed:      ${report.source_count}`);
  console.log(`Fetch success/failed:   ${report.fetch_success_count}/${report.fetch_failed_count}`);
  console.log(`Parsed schemes:         ${report.parsed_scheme_count}`);
  console.log(`Unique schemes:         ${report.unique_scheme_count}`);
  console.log(`No-change:              ${report.no_change_count}`);
  console.log(`Auto publish queued:    ${report.auto_publish_count}`);
  console.log(`Manual review queued:   ${report.manual_review_count}`);
  console.log(`Potential deletions:    ${report.potential_deletion_count}`);
  console.log(`Publish success/failed: ${report.publish_success_count}/${report.publish_failed_count}`);
  console.log(`Auto publish blocked:   ${report.rejected_auto_publish_count}`);
  if (report.failed_sources.length > 0) {
    console.log(`Failed sources:         ${report.failed_sources.join(', ')}`);
  }
  if (report.notes.length > 0) {
    console.log('Notes:');
    for (const note of report.notes) {
      console.log(`  - ${note}`);
    }
  }
  console.log('='.repeat(70) + '\n');
}

