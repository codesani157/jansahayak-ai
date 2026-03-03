import type { RunPipelineOptions } from './types';

function parseNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return value;
}

function parseBoolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.toLowerCase() === 'true';
}

export const OFFICIAL_DOMAIN_SUFFIXES = ['.gov.in', '.nic.in'];

export const SCHEME_KEYWORDS = [
  'scheme',
  'yojana',
  'subsidy',
  'scholarship',
  'benefit',
  'grant',
  'loan',
  'insurance',
  'welfare',
  'pension',
];

export const CRITICAL_FIELDS = [
  'title',
  'eligibility',
  'benefit_amount',
  'apply_url',
  'deadline',
] as const;

export const NON_CRITICAL_FIELDS = [
  'summary',
  'details',
  'department',
  'category',
] as const;

export const INGESTION_DEFAULTS = {
  AUTO_PUBLISH_MIN_SCORE: parseNumberEnv('AUTO_PUBLISH_MIN_SCORE', 85),
  MAX_SOURCE_TIMEOUT_MS: parseNumberEnv('MAX_SOURCE_TIMEOUT_MS', 15_000),
  RETRY_COUNT: parseNumberEnv('RETRY_COUNT', 2),
  FETCH_DELAY_MS: parseNumberEnv('FETCH_DELAY_MS', 250),
  EMBED_DELAY_MS: parseNumberEnv('EMBED_DELAY_MS', 200),
  PINECONE_BATCH_SIZE: parseNumberEnv('PINECONE_BATCH_SIZE', 50),
  SHADOW_MODE: parseBoolEnv('INGEST_SHADOW_MODE', true),
  DETECT_DELETIONS: parseBoolEnv('INGEST_DETECT_DELETIONS', true),
  MAX_AUTO_PUBLISH_FAILURE_RATE: parseNumberEnv(
    'MAX_AUTO_PUBLISH_FAILURE_RATE',
    0.4,
  ),
};

export function makePipelineOptions(
  overrides: Partial<RunPipelineOptions>,
): RunPipelineOptions {
  return {
    trigger: overrides.trigger ?? 'manual',
    shadow_mode: overrides.shadow_mode ?? INGESTION_DEFAULTS.SHADOW_MODE,
    dry_run: overrides.dry_run ?? false,
    detect_deletions:
      overrides.detect_deletions ?? INGESTION_DEFAULTS.DETECT_DELETIONS,
    auto_publish_min_score:
      overrides.auto_publish_min_score ??
      INGESTION_DEFAULTS.AUTO_PUBLISH_MIN_SCORE,
    max_source_timeout_ms:
      overrides.max_source_timeout_ms ?? INGESTION_DEFAULTS.MAX_SOURCE_TIMEOUT_MS,
    retry_count: overrides.retry_count ?? INGESTION_DEFAULTS.RETRY_COUNT,
  };
}

