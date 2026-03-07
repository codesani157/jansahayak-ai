import { jsonResponse } from '@/lib/cors';

export async function GET() {
  const envCheck = {
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_PRIVATE_KEY_LENGTH: process.env.FIREBASE_PRIVATE_KEY?.length ?? 0,
    FIREBASE_PRIVATE_KEY_STARTS_WITH: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 20) ?? 'MISSING',
    PINECONE_API_KEY: !!process.env.PINECONE_API_KEY,
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME ?? 'MISSING',
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    JWT_SECRET: !!process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Test Firebase init
  let firebaseStatus = 'not_tested';
  try {
    const { db } = await import('@/lib/firebase');
    firebaseStatus = db ? 'connected' : 'null (mock mode)';
  } catch (e) {
    firebaseStatus = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return jsonResponse({ envCheck, firebaseStatus });
}
