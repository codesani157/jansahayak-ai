import { Platform } from 'react-native';
import { apiFetch, setAccessToken } from './api';

// ── Types ──────────────────────────────────────────────────────
interface SessionResponse {
  user_id: string;
  token: string;
}

const TOKEN_KEY = 'govguide_jwt';
const DEVICE_ID_KEY = 'govguide_device_id';

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

// ── Stable device fingerprint ──────────────────────────────────
// Generates a random UUID on first launch and persists it so the
// backend can map this device to the same user across sessions.

function generateUUID(): string {
  // Simple UUID v4 without external dependencies
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getOrCreateDeviceId(): Promise<string> {
  if (Platform.OS === 'web') {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }
  if (SecureStore) {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateUUID();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }
  return generateUUID();
}

/**
 * Create an anonymous session (or resume if backend recognises
 * the device). Called once on app mount.
 */
export async function initSession(): Promise<string> {
  const deviceId = await getOrCreateDeviceId();
  const res = await apiFetch<SessionResponse>({
    method: 'POST',
    path: '/auth/session',
    body: {},
    deviceId,
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
