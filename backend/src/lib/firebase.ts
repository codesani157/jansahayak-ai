import admin from 'firebase-admin';

/**
 * Parse a PEM private key from an environment variable, handling all common
 * encoding quirks (Vercel UI, dotenv, JSON-escaped, double-escaped, etc.).
 * Extracts the raw base64 and rebuilds a canonical PEM so OpenSSL never chokes.
 */
function parsePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  let key = raw.trim();

  // 1. Strip surrounding quotes (single or double)
  if ((key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // 2. Replace literal two-char \n sequences with real newlines
  key = key.replace(/\\n/g, '\n');

  // 3. Extract base64 payload between PEM header/footer
  const match = key.match(
    /-----BEGIN [A-Z ]+-----\s*([\s\S]*?)\s*-----END [A-Z ]+-----/,
  );
  if (!match) return undefined;

  // 4. Strip every non-base64 character from the payload (spaces, CR, LF, etc.)
  const base64 = match[1].replace(/[^A-Za-z0-9+/=]/g, '');

  // 5. Rebuild canonical PEM with 64-char lines
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

/**
 * Singleton Firebase Admin initializer.
 * Reads credentials from environment variables.
 */
function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Private key comes in various formats across environments (dotenv, Vercel UI, CLI).
  // We extract the raw base64 and rebuild a clean PEM to avoid any encoding issues.
  const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      '[firebase] Missing credentials — running in mock mode. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local',
    );
    // Return a stub so dev server doesn't crash without credentials
    return null;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const app = getFirebaseAdmin();
export const db = app ? admin.firestore(app) : null;
export const auth = app ? admin.auth(app) : null;
export default app;
