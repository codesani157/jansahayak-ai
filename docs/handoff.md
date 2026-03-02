# Project Handoff: GovGuide

> **Last Updated:** 2026-03-03  
> **Status:** MVP Core Complete — Backend + Frontend running on localhost  
> **Zero TypeScript Errors** in both frontend and backend codebases

---

## 1. Project Context & Objectives

**GovGuide** is a mobile-first application that helps Indian citizens (Farmers, Students, MSMEs) discover and understand complex government schemes using a **Retrieval-Augmented Generation (RAG)** pipeline.

The app takes natural language queries, searches an embedded vector database of 15 real Indian government schemes, and returns "Explain Like I'm 5" (ELI5) summaries via Google Gemini LLM.

**Primary Constraint:** 100% free-tier architecture. No credit card. $0 cost.

---

## 2. Architecture Overview (All $0 Free Tier)

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | React Native Expo SDK 55 | React 19.2.0, RN 0.83.2, TypeScript strict, Expo Web for browser |
| **Backend API** | Next.js (App Router) | TypeScript, 5 API routes under `/api/v1/` |
| **Database** | Firebase Firestore (Spark Plan) | Project: `govguide-1518c`, auto-created collections |
| **Vector DB** | Pinecone (Starter Plan) | Index: `govguide-schemes`, 768 dimensions, cosine metric |
| **LLM** | Google Gemini `gemini-2.5-flash` | Free tier via `@google/generative-ai` SDK (v1beta endpoint) |
| **Embeddings** | `gemini-embedding-001` | 768 dimensions, via **direct REST API** (not SDK — SDK doesn't support this model) |
| **Auth** | Custom JWT | HS256, 7-day expiry, lightweight `crypto`-based (no external JWT library) |
| **Blob Storage** | Telegram Bot API | Bot: `@govguide_storage_bot`, Channel: `-1003878257435` |

---

## 3. Repository Structure

```
c:\Hackathon Files\AI for Bharat\
├── docs/
│   ├── handoff.md              ← THIS FILE
│   ├── task.md                 ← Progress tracking (task checklist)
│   ├── PRD.md                  ← Product Requirements Document
│   ├── TRD.md                  ← Technical Requirements Document
│   ├── implementation_plan.md.resolved
│   └── UX_Screen_Breakdown.md
├── GovGuideApp/                ← FRONTEND (React Native Expo)
│   ├── App.tsx                 ← Root component
│   ├── index.ts                ← Entry point
│   ├── package.json            ← Dependencies
│   ├── tsconfig.json
│   ├── app.json                ← Expo config
│   └── src/
│       ├── components/
│       │   ├── AppHeader.tsx
│       │   ├── Bubbles.tsx           ← Chat message bubbles
│       │   ├── ChatInputBar.tsx      ← Text input + send button
│       │   ├── ELI5SchemeCard.tsx     ← Scheme result card UI
│       │   ├── QuickReplyChip.tsx     ← Suggested follow-up chips
│       │   ├── ResponsiveContainer.tsx
│       │   └── SelectionGrid.tsx      ← Grid for language/persona selection
│       ├── navigation/
│       │   ├── AppNavigator.tsx       ← Stack navigator (Language → Persona → Chat)
│       │   └── types.ts
│       ├── screens/
│       │   ├── LanguageScreen.tsx     ← First screen: pick language
│       │   ├── PersonaScreen.tsx      ← Second screen: pick role (Farmer/Student/MSME)
│       │   └── ChatScreen.tsx         ← Main chat interface with RAG
│       ├── services/
│       │   ├── api.ts                 ← HTTP client, BASE_URL config, request helper
│       │   ├── authService.ts         ← createSession(device_id) → JWT
│       │   ├── chatService.ts         ← sendQuery(), sendFeedback(), SchemeResult type
│       │   ├── userService.ts         ← savePreferences(language, role)
│       │   ├── reminderService.ts     ← optInReminder(phone)
│       │   └── index.ts              ← Barrel export
│       └── theme/
│           └── theme.ts               ← Colors, spacing, typography
└── backend/                    ← BACKEND (Next.js App Router)
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── .env.local              ← ALL CREDENTIALS (real, working)
    └── src/
        ├── lib/
        │   ├── firebase.ts     ← Firebase Admin SDK singleton, exports `db` and `auth`
        │   ├── pinecone.ts     ← Pinecone client, `getPinecone()` and `getIndex()`
        │   ├── gemini.ts       ← `embedText()` (REST API) + `generateELI5()` (SDK, with retry)
        │   ├── jwt.ts          ← `signToken()`, `verifyToken()`, `getUserFromHeader()`
        │   ├── cors.ts         ← `handleOptions()`, `jsonResponse()`, `errorResponse()`
        │   └── telegram.ts     ← `uploadDocument()` + `getFileUrl()`
        ├── app/api/v1/
        │   ├── auth/session/route.ts       ← POST: anonymous session by device_id → JWT
        │   ├── users/preferences/route.ts  ← PUT: update language + role in Firestore
        │   ├── chat/query/route.ts         ← POST: full RAG (embed → search → generate → log)
        │   ├── chat/feedback/route.ts      ← POST: score 1-5, verify ownership, update Firestore
        │   └── reminders/opt-in/route.ts   ← POST: validate +91 phone, create Reminder doc
        ├── scripts/
        │   ├── ingest.ts               ← Embed & upsert 15 schemes to Pinecone
        │   ├── test-telegram.ts        ← 5 Telegram blob storage tests
        │   └── test-integration.ts     ← 15-assertion end-to-end integration test
        └── data/
            └── schemes.json            ← 15 real Indian government schemes
```

---

## 4. API Contracts

All endpoints are under `/api/v1/` and accept/return JSON. CORS headers are included on all responses.

### POST `/api/v1/auth/session`
- **Body:** `{ "device_id": string }`
- **Response:** `{ "user_id": string, "token": string }`
- **Behavior:** Creates new user in Firestore if `device_id` not found, otherwise returns existing. Token is custom JWT (HS256).

### PUT `/api/v1/users/preferences`
- **Headers:** `Authorization: Bearer <jwt>`
- **Body:** `{ "preferred_language": string, "role_name": string }`
- **Response:** `{ "success": true }`

### POST `/api/v1/chat/query`
- **Headers:** `Authorization: Bearer <jwt>`
- **Body:** `{ "message": string, "language"?: string, "role"?: string }`
- **Response:** `{ "log_id": string, "reply": string, "source_schemes": SchemeResult[] }`
- **SchemeResult:** `{ "scheme_name": string, "benefit_amount": string, "eligibility": string, "apply_url": string, "score"?: number }`
- **Error 429:** `{ "error": "Our AI is busy. Please wait a moment and try again." }`

### POST `/api/v1/chat/feedback`
- **Headers:** `Authorization: Bearer <jwt>`
- **Body:** `{ "log_id": string, "score": number }` (score: 1-5)
- **Response:** `{ "success": true }`

### POST `/api/v1/reminders/opt-in`
- **Headers:** `Authorization: Bearer <jwt>`
- **Body:** `{ "phone": string }` (must start with `+91`)
- **Response:** `{ "reminder_id": string }`

---

## 5. Credentials & Environment

All credentials are in `backend/.env.local`. **All are real and working.**

```
FIREBASE_PROJECT_ID=govguide-1518c
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@govguide-1518c.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=<real RSA key>
PINECONE_API_KEY=<real key>
PINECONE_INDEX=govguide-schemes
GEMINI_API_KEY=<real key>
TELEGRAM_BOT_TOKEN=<real token for @govguide_storage_bot>
TELEGRAM_CHANNEL_ID=-1003878257435
JWT_SECRET=<random 64-char hex string>
```

### Important Technical Notes on Credentials:
1. **Gemini Embeddings use REST API, NOT the SDK.** The `gemini-embedding-001` model requires direct REST calls to `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent` with `outputDimensionality: 768`. The `@google/generative-ai` SDK doesn't properly support this model.
2. **Gemini generation uses SDK.** The `gemini-2.5-flash` model works fine via the SDK's `generateContent()` method.
3. **Rate limiting:** New Gemini API keys may have initial quota of 0. Retry logic (3 attempts, 5s/10s backoff) is built into `generateELI5()` in `src/lib/gemini.ts`.
4. **Pinecone index:** 768 dimensions, cosine metric, `govguide-schemes` index name. 15 vectors currently stored.

---

## 6. What's Been Completed

### Backend (100%)
- All 6 library modules (`firebase`, `pinecone`, `gemini`, `jwt`, `cors`, `telegram`)
- All 5 API route handlers
- Data ingestion pipeline — 15 real Indian government schemes embedded and stored in Pinecone
- Full RAG pipeline working: embed query → Pinecone cosine search → Gemini ELI5 generation → Firestore logging
- Telegram blob storage tested (upload + download round-trip verified)
- Integration test: 15/15 assertions passed
- TypeScript: zero errors

### Frontend (100%)
- 3 screens: Language → Persona → Chat
- 7 reusable components (AppHeader, Bubbles, ChatInputBar, ELI5SchemeCard, QuickReplyChip, ResponsiveContainer, SelectionGrid)
- Full service layer (5 service files) wired to all backend endpoints
- Frontend↔Backend contract audit: 5 mismatches found and fixed
- TypeScript: zero errors

### Data Pipeline (100%)
- 15 real government schemes curated in `schemes.json`
- All embedded with `gemini-embedding-001` (768 dim) and upserted to Pinecone
- RAG verified: "crop insurance" query correctly ranks PMFBY as #1 result

### Localhost Hosting (100%)
- Backend: `http://localhost:3000` (Next.js dev server)
- Frontend: `http://localhost:8081` (Expo Web dev server)
- Frontend `BASE_URL` in `api.ts` uses `Platform.select()` → `http://localhost:3000` on web

---

## 7. Known Issues & Gotchas

| Issue | Details | Workaround |
|-------|---------|------------|
| Gemini embedding model | `text-embedding-004` returns 404 on v1beta; only `gemini-embedding-001` works | Use direct REST API with `outputDimensionality: 768` |
| Gemini generation model | `gemini-1.5-flash` no longer exists | Switched to `gemini-2.5-flash` |
| Rate limiting (429) | New API keys may have `limit: 0` initially; activates after ~5 min | Retry logic in `generateELI5()` (3 attempts, 5s/10s backoff) |
| Pinecone upsert API | SDK changed from `index.upsert(batch)` to `index.upsert({ records: batch })` | Updated in ingest script |
| Buffer type | `Buffer` not assignable to `BlobPart` in telegram.ts | Cast via `new Uint8Array(fileBuffer)` |
| Firebase Spark Plan | No Cloud Functions, limited writes | Using Firestore only for reads/writes, no triggers |

---

## 8. What's NOT Done (Deferred)

| Feature | Why Deferred | Effort Estimate |
|---------|-------------|-----------------|
| Voice input (Bhashini/Whisper STT) | Not MVP-critical for hackathon demo | Medium — needs audio recording + API integration |
| SMS reminders (Twilio) | User chose to skip for MVP | Low — endpoint exists, just needs Twilio wiring |
| Vercel deployment | User chose localhost for hackathon demo | Low — just `vercel deploy`, may need env vars |
| Role-based Pinecone filtering | All 15 schemes are general-purpose | Low — add `role` metadata filter in query route |
| Multi-language Gemini responses | ELI5 prompt supports it, not tested E2E | Low — test with Hindi/Tamil queries |
| Streaming responses | Currently waits for full Gemini response | Medium — needs SSE or chunked transfer |
| PDF upload to Telegram | Utility exists but no PDFs to upload yet | Low — upload scheme PDFs when available |

---

## 9. How to Run

### Prerequisites
- Node.js 18+
- npm

### Backend
```bash
cd "c:\Hackathon Files\AI for Bharat\backend"
npm install
npm run dev          # Starts Next.js on http://localhost:3000
```

### Frontend
```bash
cd "c:\Hackathon Files\AI for Bharat\GovGuideApp"
npm install
npx expo start --web --port 8081   # Opens on http://localhost:8081
```

### Data Ingestion (if needed)
```bash
cd "c:\Hackathon Files\AI for Bharat\backend"
npm run ingest       # Embeds and upserts all 15 schemes to Pinecone
```

### Tests
```bash
cd "c:\Hackathon Files\AI for Bharat\backend"
npx tsx src/scripts/test-integration.ts   # 15 assertions, needs backend running
npx tsx src/scripts/test-telegram.ts      # 5 Telegram blob tests
npx tsc --noEmit                          # TypeScript check (backend)

cd "c:\Hackathon Files\AI for Bharat\GovGuideApp"
npx tsc --noEmit                          # TypeScript check (frontend)
```

---

## 10. User Flow (End-to-End)

1. **Language Screen** → User selects language (English, Hindi, Tamil, Telugu, etc.)
2. **Persona Screen** → User selects role (Farmer, Student, Small Business Owner)
3. **Chat Screen** → User types a question (e.g., "What schemes help farmers with crop insurance?")
4. **Backend RAG** → Query embedded → Pinecone top-5 search → Gemini generates ELI5 response
5. **Response** → Chat bubble with plain-language explanation + ELI5 Scheme Cards (name, benefit, eligibility, apply link)
6. **Feedback** → User can thumbs-up/thumbs-down the response (mapped to score 5/1)
7. **Reminders** → User can opt-in for SMS reminders with +91 phone number

---

## 11. Key Decisions Made

1. **React Native Expo (not Next.js frontend):** Frontend is a separate Expo project, not embedded in Next.js. This allows native mobile builds later.
2. **Custom JWT (not Firebase Auth):** Lightweight HS256 JWT using Node.js `crypto` module. No external library. Avoids Firebase Auth complexity for anonymous users.
3. **REST API for embeddings:** Gemini SDK doesn't support `gemini-embedding-001` properly, so `embedText()` uses direct `fetch()` to the REST endpoint.
4. **No Zustand/React Query:** Frontend uses simple React state + custom service layer. Keeps dependencies minimal.
5. **Telegram as blob storage:** Private channel stores documents; bot uploads/downloads via Bot API. Unlimited free storage.
6. **15 curated schemes (not API scraping):** Instead of hitting `data.gov.in` APIs, we curated 15 real schemes manually in JSON for reliability and speed.

---

## 12. For the Next AI Agent

**If continuing development, here are the highest-impact next steps:**

1. **Test the full user flow in browser** — Open `http://localhost:8081`, go through Language → Persona → Chat, ask a question, verify RAG response appears with scheme cards.
2. **Add more schemes** — Edit `src/data/schemes.json`, add new entries, run `npm run ingest`.
3. **Deploy to Vercel** — Run `vercel deploy` in the `backend/` directory. Set all `.env.local` vars in Vercel dashboard.
4. **Add voice input** — Integrate Bhashini or Whisper STT for Hindi/regional language audio queries.
5. **Polish UI** — Add animations, loading skeletons, error toasts, welcome message in chat.
6. **Role-based filtering** — Add `roles` metadata to Pinecone vectors and filter in query route.

**Do NOT:**
- Change the embedding model or dimension without re-ingesting all schemes
- Switch JWT implementation without updating all 5 API routes
- Remove the Gemini retry logic — rate limits are real
- Use `gemini-1.5-flash` — it no longer exists, use `gemini-2.5-flash`
