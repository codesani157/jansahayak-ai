/**
 * Data ingestion script for GovGuide.
 *
 * Usage:
 *   npm run ingest
 *
 * This script keeps the original manual ingestion workflow:
 * src/data/schemes.json -> embeddings -> Pinecone upsert.
 *
 * Embedding and upsert logic is now shared with semi-automatic ingestion via
 * src/ingestion/publish.ts.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { INGESTION_DEFAULTS } from '../ingestion/config';
import { normalizeSeedSchemesFromFile } from '../ingestion/normalize';
import { publishNormalizedSchemes } from '../ingestion/publish';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function main() {
  if (!PINECONE_API_KEY) {
    console.error('Missing PINECONE_API_KEY in .env.local');
    process.exit(1);
  }
  if (!GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY in .env.local');
    process.exit(1);
  }

  const dataPath = path.join(__dirname, '..', 'data', 'schemes.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`Scheme data file not found at ${dataPath}`);
    console.error('Create src/data/schemes.json with your scheme data first.');
    process.exit(1);
  }

  const normalized = normalizeSeedSchemesFromFile(dataPath, 'manual_seed');
  console.log(`Loaded ${normalized.length} schemes from ${dataPath}`);

  const result = await publishNormalizedSchemes(normalized, {
    jobId: 'manual_ingest',
    batchSize: INGESTION_DEFAULTS.PINECONE_BATCH_SIZE,
    embedDelayMs: INGESTION_DEFAULTS.EMBED_DELAY_MS,
    authenticityBySchemeId: new Map(
      normalized.map((scheme) => [scheme.scheme_id, 100]),
    ),
    versionBySchemeId: new Map(
      normalized.map((scheme) => [scheme.scheme_id, 1]),
    ),
  });

  const success = result.filter((r) => r.success).length;
  const failed = result.length - success;
  console.log(`Manual ingest completed. success=${success}, failed=${failed}`);

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
