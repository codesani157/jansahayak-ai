import { apiFetch } from './api';

// ── Types ──────────────────────────────────────────────────────
export interface SchemeResult {
  scheme_id: string;
  title: string;
  summary: string;
  eligibility: string;
  benefit_amount: string;
  apply_url: string;
  score?: number;
}

export interface ChatResponse {
  log_id: string; // used for feedback
  reply: string; // ELI5 text from LLM
  source_schemes: SchemeResult[];
}

// ── Text query ─────────────────────────────────────────────────
export async function sendQuery(
  text: string,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>({
    method: 'POST',
    path: '/chat/query',
    body: { text_query: text, audio_blob: null },
    signal,
  });
}

// ── Voice query ────────────────────────────────────────────────
export async function sendVoiceQuery(
  audioUri: string,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const form = new FormData();
  form.append('audio_blob', {
    uri: audioUri,
    type: 'audio/webm',
    name: 'voice.webm',
  } as unknown as Blob);
  form.append('text_query', '');

  return apiFetch<ChatResponse>({
    method: 'POST',
    path: '/chat/query',
    multipart: form,
    signal,
  });
}

// ── Feedback ───────────────────────────────────────────────────
export async function sendFeedback(
  logId: string,
  score: 1 | -1,
): Promise<void> {
  // Backend expects 1-5; map thumbs-up (1) → 5, thumbs-down (-1) → 1
  const backendScore = score === 1 ? 5 : 1;
  await apiFetch<{ success: boolean }>({
    method: 'POST',
    path: '/chat/feedback',
    body: { log_id: logId, score: backendScore },
  });
}
