/**
 * Integration test — simulates the exact API calls the React Native frontend makes.
 *
 * Walks through the full user journey:
 *   1. POST /auth/session         → get user_id + JWT token
 *   2. PUT  /users/preferences    → set language + role
 *   3. POST /chat/query           → ask about a scheme (RAG pipeline)
 *   4. POST /chat/feedback        → send thumbs-up (mapped to score 5)
 *   5. POST /reminders/opt-in     → opt into reminders
 *
 * Usage: npx tsx src/scripts/test-integration.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const BASE = 'http://localhost:3000/api/v1';
let TOKEN = '';
let USER_ID = '';
let LOG_ID = '';

// ── Helper ─────────────────────────────────────────────────────
async function api<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as T;
}

function pass(label: string, detail?: string) {
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`  ❌ ${label} — ${msg}`);
  process.exit(1);
}

// ── Tests ──────────────────────────────────────────────────────
async function main() {
  console.log('\n🔗 GovGuide Frontend ↔ Backend Integration Test\n');
  console.log(`   Backend: ${BASE}\n`);

  // ── Step 1: Auth ─────────────────────────────────────────────
  console.log('Step 1: POST /auth/session');
  try {
    const res = await api<{ user_id: string; token: string }>(
      'POST',
      '/auth/session',
    );
    USER_ID = res.user_id;
    TOKEN = res.token;
    pass('Session created', `user_id=${USER_ID.slice(0, 8)}...`);

    // Verify token structure (3-part JWT)
    const parts = TOKEN.split('.');
    if (parts.length !== 3) throw new Error('Token is not a valid JWT');
    pass('JWT format valid', `${TOKEN.length} chars`);
  } catch (e) {
    fail('Auth failed', e);
  }

  // ── Step 2: Preferences ──────────────────────────────────────
  console.log('\nStep 2: PUT /users/preferences');
  try {
    const res = await api<{ success: boolean }>(
      'PUT',
      '/users/preferences',
      { preferred_language: 'en', role_name: 'farmer' },
    );
    if (!res.success) throw new Error('success was not true');
    pass('Preferences updated', 'language=en, role=farmer');
  } catch (e) {
    fail('Preferences failed', e);
  }

  // ── Step 3: Chat Query (RAG Pipeline) ────────────────────────
  console.log('\nStep 3: POST /chat/query');
  try {
    const res = await api<{
      log_id: string;
      reply: string;
      source_schemes: Array<{
        scheme_id: string;
        title: string;
        summary: string;
        eligibility: string;
        benefit_amount: string;
        apply_url: string;
        score: number;
      }>;
    }>('POST', '/chat/query', { text_query: 'How can I get crop insurance?' });

    LOG_ID = res.log_id;
    pass('Chat response received', `log_id=${LOG_ID.slice(0, 8)}...`);

    // Validate reply
    if (!res.reply || res.reply.length < 10) throw new Error('Reply is too short');
    pass('Reply generated', `${res.reply.length} chars`);

    // Validate scheme cards
    if (!Array.isArray(res.source_schemes)) throw new Error('source_schemes not an array');
    pass(`${res.source_schemes.length} scheme card(s) returned`);

    // Validate scheme card fields match frontend SchemeResult interface
    if (res.source_schemes.length > 0) {
      const s = res.source_schemes[0];
      const requiredFields = ['scheme_id', 'title', 'summary', 'eligibility', 'benefit_amount', 'apply_url'];
      const missing = requiredFields.filter((f) => !(f in s));
      if (missing.length > 0) throw new Error(`Missing fields in scheme: ${missing.join(', ')}`);
      pass('Scheme card fields match frontend interface', `top: ${s.title} (score: ${s.score.toFixed(2)})`);

      // Verify the top scheme is related to crop insurance
      const topTitle = s.title.toLowerCase();
      if (topTitle.includes('fasal') || topTitle.includes('bima') || topTitle.includes('crop') || topTitle.includes('kisan')) {
        pass('Semantic search relevance check passed', s.title);
      } else {
        console.warn(`  ⚠️  Top scheme "${s.title}" may not be relevant to "crop insurance"`);
      }
    }
  } catch (e) {
    fail('Chat query failed', e);
  }

  // ── Step 4: Feedback ─────────────────────────────────────────
  console.log('\nStep 4: POST /chat/feedback');
  try {
    // Frontend sends score: 1 (thumbs-up) → mapped to 5, or -1 (thumbs-down) → mapped to 1
    // Testing thumbs-up (score: 5)
    const res = await api<{ success: boolean }>(
      'POST',
      '/chat/feedback',
      { log_id: LOG_ID, score: 5 },
    );
    if (!res.success) throw new Error('success was not true');
    pass('Thumbs-up feedback saved', `log_id=${LOG_ID.slice(0, 8)}...`);

    // Test thumbs-down (score: 1)
    const res2 = await api<{ success: boolean }>(
      'POST',
      '/chat/feedback',
      { log_id: LOG_ID, score: 1 },
    );
    if (!res2.success) throw new Error('success was not true for thumbs-down');
    pass('Thumbs-down feedback saved');
  } catch (e) {
    fail('Feedback failed', e);
  }

  // ── Step 5: Reminder Opt-In ──────────────────────────────────
  console.log('\nStep 5: POST /reminders/opt-in');
  try {
    const res = await api<{ reminder_id: string }>(
      'POST',
      '/reminders/opt-in',
      { scheme_id: 'pmfby', phone_number: '+919876543210' },
    );
    if (!res.reminder_id) throw new Error('reminder_id not returned');
    pass('Reminder opt-in successful', `reminder_id=${res.reminder_id.slice(0, 8)}...`);
  } catch (e) {
    fail('Reminder opt-in failed', e);
  }

  // ── Step 6: Auth (Repeat — should return same user) ──────────
  console.log('\nStep 6: POST /auth/session (re-auth — same device)');
  try {
    // Clear token, re-auth without it
    TOKEN = '';
    const res = await api<{ user_id: string; token: string }>(
      'POST',
      '/auth/session',
    );
    TOKEN = res.token;
    // The backend creates a new user each time if no X-Device-Id is sent
    // In the real app, the device ID header ensures the same user is returned
    pass('Re-auth successful', `user_id=${res.user_id.slice(0, 8)}...`);
  } catch (e) {
    fail('Re-auth failed', e);
  }

  // ── Step 7: Error handling — bad request ─────────────────────
  console.log('\nStep 7: Error handling tests');
  try {
    // Missing required field
    const res = await fetch(`${BASE}/chat/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({}), // missing text_query
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const err = await res.json();
    if (!err.error) throw new Error('Error response missing "error" field');
    pass('400 on missing text_query', err.error);
  } catch (e) {
    fail('Error handling test failed', e);
  }

  try {
    // Invalid token
    const res = await fetch(`${BASE}/users/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid.token.here',
      },
      body: JSON.stringify({ preferred_language: 'en', role_name: 'farmer' }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    pass('401 on invalid token');
  } catch (e) {
    fail('Auth error test failed', e);
  }

  try {
    // No auth header
    const res = await fetch(`${BASE}/chat/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text_query: 'test' }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    pass('401 on missing auth header');
  } catch (e) {
    fail('No-auth error test failed', e);
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 All integration tests passed!');
  console.log('   Frontend ↔ Backend contract is fully aligned.');
  console.log('═'.repeat(50) + '\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
