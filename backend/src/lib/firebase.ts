import admin from 'firebase-admin';

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
  // Private key comes with escaped newlines from env
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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
