import { apiFetch } from './api';

// ── Types ──────────────────────────────────────────────────────
interface PreferencesPayload {
  preferred_language: string; // 'en' | 'hi' | 'ta'
  role_name: string; // 'farmer' | 'student' | 'business' | 'other'
}

/**
 * Sync the user's language and persona selection to the backend
 * so the RAG pipeline can filter schemes by role.
 */
export async function updatePreferences(
  prefs: PreferencesPayload,
): Promise<void> {
  await apiFetch<{ success: boolean }>({
    method: 'PUT',
    path: '/users/preferences',
    body: prefs,
  });
}
