import { apiFetch } from './api';

// ── Types ──────────────────────────────────────────────────────
interface OptInPayload {
  scheme_id: string;
  phone_number: string;
}

/**
 * Opt into a deadline reminder for a specific scheme.
 * Requires OTP-verified session if backend enforces PII scope.
 */
export async function optIn(
  payload: OptInPayload,
): Promise<string> {
  const res = await apiFetch<{ reminder_id: string }>({
    method: 'POST',
    path: '/reminders/opt-in',
    body: payload,
  });
  return res.reminder_id;
}
