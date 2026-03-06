/**
 * Ingest the next chunk of schemes instead of restarting from index 0.
 *
 * Usage:
 *   npm run ingest:next
 *
 * Optional env vars:
 *   INGEST_START=999      # force start offset (default: Pinecone totalRecordCount)
 *   INGEST_CHUNK=1000     # how many schemes to ingest in this run
 *   INGEST_DRY_RUN=true   # compute + log only, no embedding/upsert
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { INGESTION_DEFAULTS } from '../ingestion/config';
import { normalizeSeedSchemesFromFile } from '../ingestion/normalize';
import { publishNormalizedSchemes } from '../ingestion/publish';
import { getIndex } from '../lib/pinecone';

function parseNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

function parseBoolEnv(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = raw.toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

async function main() {
  if (!process.env.PINECONE_API_KEY) {
    console.error('Missing PINECONE_API_KEY in .env.local');
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY in .env.local');
    process.exit(1);
  }

  const dataPath = path.join(__dirname, '..', 'data', 'schemes.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`Scheme data file not found at ${dataPath}`);
    process.exit(1);
  }

  const normalized = normalizeSeedSchemesFromFile(dataPath, 'manual_seed');
  const chunkSize = parseNumberEnv('INGEST_CHUNK', 1000);
  const hasForcedStart = typeof process.env.INGEST_START === 'string';
  const dryRun = parseBoolEnv('INGEST_DRY_RUN', false);

  const index = getIndex();
  if (!index) {
    console.error('Pinecone index unavailable (check credentials in .env.local)');
    process.exit(1);
  }

  const stats = await index.describeIndexStats();
  const pineconeCount = stats.totalRecordCount ?? 0;
  const start = hasForcedStart
    ? parseNumberEnv('INGEST_START', pineconeCount)
    : pineconeCount;
  const endExclusive = Math.min(start + chunkSize, normalized.length);
  const batch = normalized.slice(start, endExclusive);

  console.log(`Loaded ${normalized.length} schemes from ${dataPath}`);
  console.log(
    `Pinecone vectors=${pineconeCount}, start=${start}, chunk=${batch.length}`,
  );

  if (batch.length === 0) {
    console.log('Nothing to ingest. Dataset is fully ingested for this offset.');
    return;
  }

  const result = await publishNormalizedSchemes(batch, {
    jobId: `manual_ingest_${start}_${Math.max(start, endExclusive - 1)}`,
    batchSize: INGESTION_DEFAULTS.PINECONE_BATCH_SIZE,
    embedDelayMs: INGESTION_DEFAULTS.EMBED_DELAY_MS,
    authenticityBySchemeId: new Map(batch.map((scheme) => [scheme.scheme_id, 100])),
    versionBySchemeId: new Map(batch.map((scheme) => [scheme.scheme_id, 1])),
    dryRun,
  });

  const success = result.filter((r) => r.success).length;
  const failed = result.length - success;
  console.log(`Ingest-next completed. success=${success}, failed=${failed}`);

  if (failed > 0) {
    for (const row of result.filter((r) => !r.success)) {
      console.error(`  - ${row.scheme_id}: ${row.error ?? 'unknown error'}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
