/**
 * Data ingestion script for GovGuide.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' src/scripts/ingest.ts
 *
 * Or via the npm script:
 *   npm run ingest
 *
 * This script reads government scheme data from src/data/schemes.json,
 * generates embeddings using Gemini text-embedding-004, and upserts them
 * into the Pinecone "govguide-schemes" index.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pinecone } from '@pinecone-database/pinecone';
import * as fs from 'fs';
import * as path from 'path';

// ── Types ──────────────────────────────────────────────────────
interface Scheme {
  id: string;
  title: string;
  summary: string;
  eligibility: string;
  benefit_amount: string;
  apply_url: string;
  department: string;
  category: string;
  /** Optional: additional details that get embedded but are too long for metadata */
  details?: string;
}

// ── Config ─────────────────────────────────────────────────────
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'govguide-schemes';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BATCH_SIZE = 50; // Pinecone upsert batch size
const EMBED_DELAY_MS = 200; // Delay between embedding calls (rate limiting)

async function main() {
  // Validate environment
  if (!PINECONE_API_KEY) {
    console.error('❌ Missing PINECONE_API_KEY in .env.local');
    process.exit(1);
  }
  if (!GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY in .env.local');
    process.exit(1);
  }

  // Load scheme data
  const dataPath = path.join(__dirname, '..', 'data', 'schemes.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Scheme data file not found at ${dataPath}`);
    console.error('   Create src/data/schemes.json with your scheme data first.');
    console.error('   See src/data/schemes.example.json for the expected format.');
    process.exit(1);
  }

  const schemes: Scheme[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`📋 Loaded ${schemes.length} schemes from ${dataPath}`);

  // Initialize clients
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pinecone.index(PINECONE_INDEX_NAME);

  console.log(`🔗 Connected to Pinecone index: ${PINECONE_INDEX_NAME}`);

  // Process schemes in batches
  const vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, string>;
  }> = [];

  for (let i = 0; i < schemes.length; i++) {
    const scheme = schemes[i];

    // Build the text to embed (combine key fields for rich embedding)
    const embeddingText = [
      `Scheme: ${scheme.title}`,
      `Summary: ${scheme.summary}`,
      `Eligibility: ${scheme.eligibility}`,
      `Benefit: ${scheme.benefit_amount}`,
      `Department: ${scheme.department}`,
      `Category: ${scheme.category}`,
      scheme.details ? `Details: ${scheme.details}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // Generate embedding via Gemini REST API (gemini-embedding-001, 768 dims)
    const embResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: embeddingText }] },
          outputDimensionality: 768,
        }),
      },
    );
    if (!embResponse.ok) {
      const errText = await embResponse.text();
      throw new Error(`Embedding failed for ${scheme.id}: ${errText}`);
    }
    const embData = await embResponse.json();
    const embedding: number[] = embData.embedding.values;

    vectors.push({
      id: scheme.id,
      values: embedding,
      metadata: {
        title: scheme.title,
        summary: scheme.summary.slice(0, 500), // Pinecone metadata limit
        eligibility: scheme.eligibility.slice(0, 500),
        benefit_amount: scheme.benefit_amount,
        apply_url: scheme.apply_url,
        department: scheme.department,
        category: scheme.category,
      },
    });

    console.log(`  [${i + 1}/${schemes.length}] Embedded: ${scheme.title}`);

    // Rate limit delay
    if (i < schemes.length - 1) {
      await new Promise((r) => setTimeout(r, EMBED_DELAY_MS));
    }
  }

  // Upsert to Pinecone in batches
  console.log(`\n📤 Upserting ${vectors.length} vectors to Pinecone...`);
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    await index.upsert({ records: batch });
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: upserted ${batch.length} vectors`);
  }

  console.log(`\n✅ Done! ${vectors.length} schemes ingested into Pinecone.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
