import { Platform } from 'react-native';

// ── Configuration ──────────────────────────────────────────────
const BASE_URL = __DEV__
  ? Platform.select({
      android: 'http://10.0.2.2:3000', // Android emulator → host (Next.js dev)
      default: 'http://localhost:3000', // web / iOS simulator (Next.js dev)
    })!
  : 'https://api.govguide.in'; // production

const API_VERSION = '/api/v1';
const REQUEST_TIMEOUT_MS = 30_000;

// ── Token store (in-memory; persistence handled by authService) ─
let _accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  _accessToken = t;
};
export const getAccessToken = () => _accessToken;

// ── Error type ─────────────────────────────────────────────────
export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    'code' in err
  );
}

export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (isApiError(err) && err.status === 0);
}

// ── Core fetch wrapper ─────────────────────────────────────────
interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string; // e.g. '/auth/session'
  body?: Record<string, unknown> | object;
  signal?: AbortSignal;
  multipart?: FormData; // for audio blobs
  timeout?: number; // ms, defaults to REQUEST_TIMEOUT_MS
  deviceId?: string; // sent via X-Device-Id header for session creation
}

export async function apiFetch<T>(opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {};

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  if (opts.deviceId) {
    headers['X-Device-Id'] = opts.deviceId;
  }

  if (!opts.multipart) {
    headers['Content-Type'] = 'application/json';
  }

  // ── Timeout via AbortController ──
  const controller = new AbortController();
  const externalSignal = opts.signal;
  const timeoutMs = opts.timeout ?? REQUEST_TIMEOUT_MS;

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If caller passes their own signal, abort our controller when it fires
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    const res = await fetch(`${BASE_URL}${API_VERSION}${opts.path}`, {
      method: opts.method,
      headers,
      body: opts.multipart ?? (opts.body ? JSON.stringify(opts.body) : undefined),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const apiError: ApiError = {
        status: res.status,
        code: errorBody.code ?? 'UNKNOWN',
        message: errorBody.error ?? errorBody.message ?? res.statusText,
      };
      throw apiError;
    }

    return (await res.json()) as T;
  } catch (err) {
    // Convert AbortError to a friendlier ApiError
    if (err instanceof DOMException && err.name === 'AbortError') {
      const apiError: ApiError = {
        status: 0,
        code: 'TIMEOUT',
        message: 'Request timed out. Please try again.',
      };
      throw apiError;
    }
    // Convert network TypeError
    if (err instanceof TypeError) {
      const apiError: ApiError = {
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'No internet connection. Please check your network.',
      };
      throw apiError;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
