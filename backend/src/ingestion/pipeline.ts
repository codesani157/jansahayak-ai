import * as path from 'path';
import { uploadDocument } from '../lib/telegram';
import {
  INGESTION_DEFAULTS,
  makePipelineOptions,
} from './config';
import { runAuthenticityChecks } from './authenticity';
import { classifyChanges } from './diff';
import { fetchAllSources } from './fetch';
import { applyHybridGate } from './gate';
import { normalizeFetchedSource, normalizeSeedSchemesFromFile } from './normalize';
import { publishNormalizedSchemes } from './publish';
import { loadSourceRegistry } from './registry';
import {
  buildCatalogRecord,
  completeIngestionJob,
  createIngestionJob,
  getSchemeCatalogMap,
  isDatabaseAvailable,
  isSchemeCatalogEmpty,
  queueCandidateChange,
  recordSourceFetchAudit,
  upsertSchemeCatalogRecords,
  updateIngestionJob,
} from './store';
import type {
  CandidateChange,
  IngestionJobReport,
  NormalizedScheme,
  RunPipelineOptions,
  SchemeCatalogRecord,
  SourceRegistryEntry,
} from './types';
import { nowIso } from './utils';

function buildSourceRegistryMap(
  entries: SourceRegistryEntry[],
): Map<string, SourceRegistryEntry> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

async function archiveCandidateEvidence(
  jobId: string,
  change: CandidateChange,
): Promise<string | null> {
  const payload = {
    job_id: jobId,
    generated_at: nowIso(),
    classification: change.classification,
    scheme_id: change.scheme_id,
    reason: change.reason,
    changed_fields: change.changed_fields,
    authenticity: change.authenticity,
    existing_record: change.existing_record ?? null,
    next_record: change.next_record ?? null,
  };
  const raw = JSON.stringify(payload, null, 2);
  const fileName = `ingestion-evidence-${jobId}-${change.scheme_id}.json`;
  const uploaded = await uploadDocument(
    Buffer.from(raw, 'utf-8'),
    fileName,
    `GovGuide ingestion evidence: ${change.classification}`,
  );
  if (!uploaded) return null;
  return uploaded.file_id;
}

async function seedCatalogFromCurrentDatasetIfNeeded(
  jobId: string,
): Promise<{ seeded: boolean; seededCount: number }> {
  const empty = await isSchemeCatalogEmpty();
  if (!empty) return { seeded: false, seededCount: 0 };

  const seedPath = path.join(__dirname, '..', 'data', 'schemes.json');
  const seedSchemes = normalizeSeedSchemesFromFile(seedPath, 'manual_seed');
  const records: SchemeCatalogRecord[] = seedSchemes.map((scheme) => ({
    ...scheme,
    version: 1,
    status: 'active',
    last_verified_at: nowIso(),
    last_published_job_id: jobId,
    authenticity_score: 100,
    evidence_ref: 'seed:file',
    rollback_snapshot: null,
    rollback_version: null,
  }));
  await upsertSchemeCatalogRecords(records);
  return { seeded: true, seededCount: records.length };
}

function toJobReportBase(
  jobId: string,
  trigger: 'manual' | 'weekly_scheduler',
  startedAt: string,
): IngestionJobReport {
  return {
    job_id: jobId,
    trigger,
    started_at: startedAt,
    completed_at: startedAt,
    status: 'RUNNING',
    source_count: 0,
    fetch_success_count: 0,
    fetch_failed_count: 0,
    parsed_scheme_count: 0,
    unique_scheme_count: 0,
    no_change_count: 0,
    auto_publish_count: 0,
    manual_review_count: 0,
    rejected_auto_publish_count: 0,
    potential_deletion_count: 0,
    publish_success_count: 0,
    publish_failed_count: 0,
    failed_sources: [],
    notes: [],
  };
}

export async function runSemiAutomaticIngestion(
  overrides: Partial<RunPipelineOptions> = {},
): Promise<IngestionJobReport> {
  const options = makePipelineOptions(overrides);
  const startedAt = nowIso();
  const jobId = await createIngestionJob(options.trigger, options);
  const report = toJobReportBase(jobId, options.trigger, startedAt);

  try {
    const seedResult = await seedCatalogFromCurrentDatasetIfNeeded(jobId);
    if (seedResult.seeded) {
      report.notes.push(
        `Seeded SchemeCatalog from local schemes.json (${seedResult.seededCount} records).`,
      );
    }

    const sources = loadSourceRegistry();
    report.source_count = sources.length;
    const sourceMap = buildSourceRegistryMap(sources);

    const fetchResults = await fetchAllSources(sources, {
      timeoutMs: options.max_source_timeout_ms,
      retryCount: options.retry_count,
    });

    const successfulSourceIds = new Set<string>();
    for (const result of fetchResults) {
      await recordSourceFetchAudit(jobId, result);
      if (result.status === 'success') {
        report.fetch_success_count += 1;
        successfulSourceIds.add(result.source_id);
      } else {
        report.fetch_failed_count += 1;
        report.failed_sources.push(result.source_id);
      }
    }

    const extractedSchemes: NormalizedScheme[] = [];
    for (const fetchResult of fetchResults) {
      const source = sourceMap.get(fetchResult.source_id);
      if (!source) continue;
      const parsed = normalizeFetchedSource(fetchResult, source);
      extractedSchemes.push(...parsed.schemes);
      for (const parserError of parsed.parserErrors) {
        report.notes.push(parserError);
      }
    }

    report.parsed_scheme_count = extractedSchemes.length;

    const authenticityBySchemeId = runAuthenticityChecks(
      extractedSchemes,
      sourceMap,
      options.auto_publish_min_score,
    );

    const catalogBySchemeId = await getSchemeCatalogMap();
    const changes = classifyChanges({
      extractedSchemes,
      authenticityBySchemeId,
      catalogBySchemeId,
      successfulSourceIds,
      autoPublishMinScore: options.auto_publish_min_score,
      detectDeletions: options.detect_deletions,
    });

    report.unique_scheme_count = new Set(changes.map((c) => c.scheme_id)).size;
    report.no_change_count = changes.filter(
      (c) => c.classification === 'NO_CHANGE',
    ).length;
    report.potential_deletion_count = changes.filter(
      (c) => c.classification === 'POTENTIAL_DELETION',
    ).length;

    const gate = applyHybridGate(changes);
    report.auto_publish_count = gate.autoPublish.length;
    report.manual_review_count = gate.manualReview.length;
    report.rejected_auto_publish_count = gate.autoPublish.filter(
      (c) => !c.auto_publish_eligible,
    ).length;

    for (const candidate of gate.manualReview) {
      const shouldArchiveEvidence = isDatabaseAvailable() && !options.dry_run;
      const evidenceRef = shouldArchiveEvidence
        ? await archiveCandidateEvidence(jobId, candidate).catch(() => null)
        : null;
      await queueCandidateChange(jobId, candidate, evidenceRef);
    }

    let publishFailureRate = 0;
    if (!options.shadow_mode && !options.dry_run && gate.autoPublish.length > 0) {
      const toPublish = gate.autoPublish
        .map((change) => change.next_record)
        .filter((value): value is NormalizedScheme => Boolean(value));

      const versionMap = new Map<string, number>();
      const authenticityMap = new Map<string, number>();
      for (const change of gate.autoPublish) {
        const existing = catalogBySchemeId.get(change.scheme_id);
        versionMap.set(change.scheme_id, existing ? existing.version + 1 : 1);
        authenticityMap.set(change.scheme_id, change.authenticity.score);
      }

      const publishResults = await publishNormalizedSchemes(toPublish, {
        jobId,
        dryRun: options.dry_run,
        batchSize: INGESTION_DEFAULTS.PINECONE_BATCH_SIZE,
        embedDelayMs: INGESTION_DEFAULTS.EMBED_DELAY_MS,
        versionBySchemeId: versionMap,
        authenticityBySchemeId: authenticityMap,
      });

      const publishedCatalogRecords: SchemeCatalogRecord[] = [];
      for (const result of publishResults) {
        if (result.success) {
          report.publish_success_count += 1;
          const change = gate.autoPublish.find(
            (c) => c.scheme_id === result.scheme_id,
          );
          if (change?.next_record) {
            const nextCatalog = buildCatalogRecord({
              previous: change.existing_record ?? null,
              next: change.next_record,
              jobId,
              authenticityScore: change.authenticity.score,
              evidenceRef: null,
            });
            publishedCatalogRecords.push(nextCatalog);
          }
        } else {
          report.publish_failed_count += 1;
          report.notes.push(
            `Auto publish failed for ${result.scheme_id}: ${result.error ?? 'unknown'}`,
          );
        }
      }

      await upsertSchemeCatalogRecords(publishedCatalogRecords);

      if (publishResults.length > 0) {
        publishFailureRate = report.publish_failed_count / publishResults.length;
      }
    } else if (gate.autoPublish.length > 0) {
      report.notes.push(
        `Shadow/dry-run mode active: skipped publishing ${gate.autoPublish.length} low-risk changes.`,
      );
    }

    if (publishFailureRate > INGESTION_DEFAULTS.MAX_AUTO_PUBLISH_FAILURE_RATE) {
      report.status = 'FAILED_SAFE';
      report.notes.push(
        `Publish failure rate ${publishFailureRate.toFixed(2)} exceeded threshold ${INGESTION_DEFAULTS.MAX_AUTO_PUBLISH_FAILURE_RATE.toFixed(2)}.`,
      );
    } else {
      report.status = 'COMPLETED';
    }

    report.completed_at = nowIso();
    await completeIngestionJob(jobId, report.status, {
      source_count: report.source_count,
      fetch_success_count: report.fetch_success_count,
      fetch_failed_count: report.fetch_failed_count,
      parsed_scheme_count: report.parsed_scheme_count,
      unique_scheme_count: report.unique_scheme_count,
      no_change_count: report.no_change_count,
      auto_publish_count: report.auto_publish_count,
      manual_review_count: report.manual_review_count,
      potential_deletion_count: report.potential_deletion_count,
      publish_success_count: report.publish_success_count,
      publish_failed_count: report.publish_failed_count,
      notes: report.notes,
    });

    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.status = 'FAILED';
    report.completed_at = nowIso();
    report.notes.push(`Pipeline failed: ${message}`);
    await updateIngestionJob(jobId, {
      status: 'FAILED',
      completed_at: report.completed_at,
      notes: report.notes,
    });
    return report;
  }
}
