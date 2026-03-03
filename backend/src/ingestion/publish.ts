import { embedText } from '../lib/gemini';
import { getIndex } from '../lib/pinecone';
import { INGESTION_DEFAULTS } from './config';
import type { NormalizedScheme, PublishResult } from './types';
import { sleep } from './utils';

interface PublishBatchOptions {
  jobId?: string;
  dryRun?: boolean;
  batchSize?: number;
  embedDelayMs?: number;
  failFast?: boolean;
  logger?: (message: string) => void;
  authenticityBySchemeId?: Map<string, number>;
  versionBySchemeId?: Map<string, number>;
  evidenceRefBySchemeId?: Map<string, string | null>;
}

type MetadataValue = string | number | boolean;

interface PreparedRecord {
  schemeId: string;
  resultIndex: number;
  record: {
    id: string;
    values: number[];
    metadata: Record<string, MetadataValue>;
  };
}

export function buildEmbeddingText(scheme: NormalizedScheme): string {
  return [
    `Scheme: ${scheme.title}`,
    `Summary: ${scheme.summary}`,
    `Eligibility: ${scheme.eligibility}`,
    `Benefit: ${scheme.benefit_amount}`,
    `Department: ${scheme.department}`,
    `Category: ${scheme.category}`,
    scheme.details ? `Details: ${scheme.details}` : '',
    scheme.deadline ? `Deadline: ${scheme.deadline}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function toMetadata(
  scheme: NormalizedScheme,
  options: PublishBatchOptions,
): Record<string, MetadataValue> {
  const authenticityScore =
    options.authenticityBySchemeId?.get(scheme.scheme_id) ?? 0;
  const version = options.versionBySchemeId?.get(scheme.scheme_id) ?? 1;
  const evidenceRef =
    options.evidenceRefBySchemeId?.get(scheme.scheme_id) ?? 'none';

  return {
    title: scheme.title,
    summary: scheme.summary.slice(0, 500),
    eligibility: scheme.eligibility.slice(0, 500),
    benefit_amount: scheme.benefit_amount.slice(0, 300),
    apply_url: scheme.apply_url.slice(0, 300),
    department: scheme.department.slice(0, 250),
    category: scheme.category.slice(0, 120),
    source_url: scheme.source_url.slice(0, 300),
    source_state: scheme.source_state.slice(0, 60),
    source_type: scheme.source_type,
    authenticity_score: authenticityScore,
    version,
    last_verified_at: scheme.fetched_at,
    evidence_ref: evidenceRef.slice(0, 500),
    job_id: (options.jobId ?? 'manual').slice(0, 120),
  };
}

export async function publishNormalizedSchemes(
  schemes: NormalizedScheme[],
  options: PublishBatchOptions = {},
): Promise<PublishResult[]> {
  const logger = options.logger ?? console.log;
  const dryRun = options.dryRun ?? false;
  const batchSize = options.batchSize ?? INGESTION_DEFAULTS.PINECONE_BATCH_SIZE;
  const embedDelayMs = options.embedDelayMs ?? INGESTION_DEFAULTS.EMBED_DELAY_MS;

  const results: PublishResult[] = schemes.map((scheme) => ({
    scheme_id: scheme.scheme_id,
    success: false,
    version: options.versionBySchemeId?.get(scheme.scheme_id) ?? 1,
  }));

  if (dryRun) {
    logger(`[publish] Dry-run mode: ${schemes.length} scheme(s) marked as success`);
    return results.map((r) => ({ ...r, success: true }));
  }

  const index = getIndex();
  if (!index) {
    return results.map((r) => ({
      ...r,
      error: 'Pinecone index unavailable (missing credentials or client error)',
    }));
  }

  const prepared: PreparedRecord[] = [];
  for (let i = 0; i < schemes.length; i++) {
    const scheme = schemes[i];
    try {
      const embedding = await embedText(buildEmbeddingText(scheme));
      prepared.push({
        schemeId: scheme.scheme_id,
        resultIndex: i,
        record: {
          id: scheme.scheme_id,
          values: embedding,
          metadata: toMetadata(scheme, options),
        },
      });

      if (i < schemes.length - 1) {
        await sleep(embedDelayMs);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results[i] = {
        ...results[i],
        success: false,
        error: `Embedding failed: ${message}`,
      };
      if (options.failFast) {
        throw error;
      }
    }
  }

  for (let i = 0; i < prepared.length; i += batchSize) {
    const chunk = prepared.slice(i, i + batchSize);
    try {
      await index.upsert({
        records: chunk.map((p) => p.record),
      });

      for (const item of chunk) {
        results[item.resultIndex] = {
          ...results[item.resultIndex],
          success: true,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const item of chunk) {
        results[item.resultIndex] = {
          ...results[item.resultIndex],
          success: false,
          error: `Pinecone upsert failed: ${message}`,
        };
      }
      if (options.failFast) {
        throw error;
      }
    }
  }

  return results;
}
