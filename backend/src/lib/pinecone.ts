import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export function getPinecone(): Pinecone | null {
  if (pineconeClient) return pineconeClient;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.warn('[pinecone] Missing PINECONE_API_KEY — running in mock mode');
    return null;
  }

  pineconeClient = new Pinecone({ apiKey });
  return pineconeClient;
}

export function getIndex() {
  const pc = getPinecone();
  if (!pc) return null;

  const indexName = process.env.PINECONE_INDEX_NAME || 'govguide-schemes';
  return pc.index(indexName);
}
