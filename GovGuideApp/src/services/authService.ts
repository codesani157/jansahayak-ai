import { Platform } from 'react-native';
import { apiFetch, setAccessToken } from './api';

// ── Types ──────────────────────────────────────────────────────
interface SessionResponse {
  user_id: string;
  token: string;
}

const TOKEN_KEY = 'govguide_jwt';

// ── Platform-safe persistence ──────────────────────────────────
// expo-secure-store is loaded lazily so the app still compiles
// even before the native module is linked (and on web it falls
// back to localStorage).

let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
} catch {
  // Not available (web, or module not installed yet)
}

async function persistToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
  } else if (SecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
  setAccessToken(token);
}

/**
 * Attempt to restore a previously-persisted JWT so the user
 * doesn't need to re-authenticate on every app launch.
 */
export async function loadPersistedToken(): Promise<boolean> {
  let token: string | null = null;

  if (Platform.OS === 'web') {
    token = localStorage.getItem(TOKEN_KEY);
  } else if (SecureStore) {
    token = await SecureStore.getItemAsync(TOKEN_KEY);
  }

  if (token) {
    setAccessToken(token);
    return true;
  }
  return false;
}

/**
 * Create an anonymous session (or resume if backend recognises
 * the device). Called once on app mount.
 */
export async function initSession(): Promise<string> {
  const res = await apiFetch<SessionResponse>({
    method: 'POST',
    path: '/auth/session',
    body: {},
  });
  await persistToken(res.token);
  return res.user_id;
}

/**
 * Clear all auth state — used on unrecoverable 401 or user-initiated logout.
 */
export async function clearSession(): Promise<void> {
  setAccessToken(null);
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
  } else if (SecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
