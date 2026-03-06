# GovGuide Complete Handoff and Full System Guide

> Last Updated: March 6, 2026 (IST)  
> Audience: team handoff, new developers, and hackathon pitch presenters (including non-technical members)

## 1. Executive Summary

GovGuide is a mobile-first assistant that helps people discover government schemes and understand them in simple language.

At a high level:
- Frontend app (Expo React Native) collects user role + question.
- Backend API (Next.js) runs RAG: embed query -> retrieve best schemes from Pinecone -> generate ELI5 answer with Gemini.
- Firestore stores user/session/chat/reminder and ingestion state.
- Telegram is used as optional evidence/blob archival for ingestion pipeline.

## 2. Current Project Status (Live Snapshot)

As checked on **March 6, 2026 (IST)**:
- `backend/src/data/schemes.json`: **4,578 schemes**
- Pinecone index (`govguide-schemes`): **1,997 vectors**
- Source registry entries: **38 total**, **10 currently enabled**
- Manual and semi-automatic ingestion pipelines both available
- New resume-friendly command available: `npm run ingest:next`

Important context:
- Gemini free-tier embedding quota is the main ingestion bottleneck.
- Because of quota, full ingestion happens in multiple runs.

## 3. What To Say In The Pitch (Simple Narrative)

### Problem
Citizens miss benefits because scheme information is scattered and hard to understand.

### Solution
GovGuide turns government scheme data into a conversational assistant:
- Ask in natural language.
- Get an ELI5 response.
- See source scheme cards and official links.
- Optionally opt in for reminders.

### Why this is useful
- Reduces information friction.
- Makes eligibility and first steps clear.
- Keeps data grounded with RAG instead of pure hallucination.

### Proof points
- 4,578 real schemes already scraped.
- RAG pipeline is working end-to-end.
- Feedback and reminder APIs are integrated.

## 4. Full Architecture Overview

```text
GovGuideApp (Expo frontend)
  -> Next.js API backend (/api/v1/*)
    -> Gemini Embeddings API (query + scheme embeddings)
    -> Pinecone (vector retrieval)
    -> Gemini Flash (ELI5 answer generation)
    -> Firestore (users, logs, reminders, ingestion metadata)
    -> Telegram Bot API (optional ingestion evidence archive)
```

## 5. Repository Structure (What Lives Where)

```text
AI for Bharat/
|- backend/                    # Next.js backend + scripts + ingestion engine
|  |- src/app/api/v1/...       # REST API endpoints
|  |- src/lib/                 # Gemini, Pinecone, Firebase, JWT, CORS, Telegram
|  |- src/ingestion/           # Semi-automatic ingestion engine
|  |- src/scripts/             # CLI scripts (ingest, review, rollback, tests)
|  |- src/data/                # schemes.json + source_registry.json
|  |- scrape-myscheme.ps1      # full MyScheme scraper
|
|- GovGuideApp/                # Expo React Native frontend
|  |- src/screens/             # Language, Persona, Chat screens
|  |- src/components/          # UI components
|  |- src/services/            # API client layer
|  |- src/hooks/               # chat state logic
|  |- src/context/             # app session + preference state
|
|- docs/                       # PRD/TRD/commands/runbooks/handoff
```

## 6. Backend Deep Dive

## 6.1 API Endpoints

All endpoints are under `/api/v1`.

1. `POST /auth/session`
- Creates or resumes anonymous user session
- Returns `{ user_id, token }`
- Uses `X-Device-Id` to keep same user across app restarts

2. `PUT /users/preferences`
- Saves selected language and persona/role
- Requires bearer token

3. `POST /chat/query`
- Core RAG endpoint
- Input: `{ text_query }`
- Steps:
  1. Verify token
  2. Read user language + role from Firestore
  3. Embed query with Gemini embedding model
  4. Query Pinecone top K
  5. Build grounded context
  6. Generate ELI5 answer using Gemini Flash
  7. Store chat log in Firestore
- Output: `{ log_id, reply, source_schemes }`

4. `POST /chat/feedback`
- Stores thumbs up/down feedback (mapped to score 1-5)
- Validates ownership of chat log

5. `POST /reminders/opt-in`
- Stores reminder preference for a scheme + phone number
- Validates Indian phone format `+91XXXXXXXXXX`

## 6.2 Core Backend Libraries

- `src/lib/gemini.ts`
  - `embedText()` for vector embeddings
  - `generateELI5()` for answer generation
- `src/lib/pinecone.ts`
  - Pinecone client + index accessor
- `src/lib/firebase.ts`
  - Firestore init
  - Falls back to mock mode if creds missing
- `src/lib/jwt.ts`
  - Lightweight JWT signing/verification
- `src/lib/telegram.ts`
  - Optional document evidence upload
- `src/lib/cors.ts`
  - Shared CORS response helpers

## 6.3 Data Storage Model

Firestore collections used:
- `Users`
- `ChatLogs`
- `Reminders`
- `IngestionJobs`
- `IngestionCandidates`
- `SchemeCatalog`
- `SourceFetchAudit`

Pinecone:
- Index: `govguide-schemes`
- Dimension: 768
- Metric: cosine

## 7. Frontend Deep Dive (GovGuideApp)

## 7.1 Screen Flow

1. `LanguageScreen` -> user picks language  
2. `PersonaScreen` -> user picks role/persona  
3. `ChatScreen` -> chat UI with response bubbles and scheme cards

## 7.2 State and Session

- `AppContext` initializes app session on boot.
- `authService` persists JWT and stable device ID.
- Token is attached automatically by API service.

## 7.3 Chat Interaction

- `useChatMessages` handles:
  - optimistic user message append
  - API request to `/chat/query`
  - rendering LLM reply
  - rendering scheme cards
  - retry bubble on failure

## 7.4 Services Layer

- `authService.ts`: session boot + token persistence
- `userService.ts`: preferences sync
- `chatService.ts`: query + feedback calls
- `reminderService.ts`: reminder opt-in
- `api.ts`: base URL, timeout, error normalization

## 8. Ingestion System (Very Important)

There are **three ingestion paths**:

1. `npm run ingest`
- Full ingest from entire `schemes.json`
- Re-embeds all entries (good for full rebuild, not quota-efficient resume)

2. `npm run ingest:next`
- Resume-friendly chunk ingest
- Starts from current Pinecone vector count
- Default chunk = 1000
- Best for Gemini free-tier daily quota workflow

3. `npm run ingest:semi`
- Semi-automatic authenticity/diff/gate pipeline
- Uses `source_registry.json`
- Supports shadow mode, manual review queues, approve/reject, rollback

## 8.1 Full Data Refresh Steps

```powershell
cd "c:\Hackathon Files\AI for Bharat\backend"
powershell -ExecutionPolicy Bypass -File scrape-myscheme.ps1
```

Then ingest:

```powershell
npm run ingest:next
```

Repeat `ingest:next` daily (or with new Gemini key) until Pinecone vector count matches schemes count.

## 8.2 Check Ingestion Progress

```powershell
cd "c:\Hackathon Files\AI for Bharat\backend"
node -e "require('dotenv').config({path:'.env.local'}); const {Pinecone}=require('@pinecone-database/pinecone'); (async()=>{const pc=new Pinecone({apiKey:process.env.PINECONE_API_KEY}); const idx=process.env.PINECONE_INDEX_NAME||'govguide-schemes'; const s=await pc.index(idx).describeIndexStats(); console.log('Index:', idx); console.log('Vectors:', s.totalRecordCount); })()"
```

## 8.3 Semi-Automatic Pipeline Flow

`runSemiAutomaticIngestion()` performs:

1. Seed `SchemeCatalog` if empty (from local `schemes.json`)
2. Load enabled sources from registry
3. Fetch all sources with retry
4. Normalize extracted records
5. Run authenticity scoring
6. Diff against catalog
7. Hybrid gate:
  - auto-publish low-risk valid changes
  - queue risky/new/deletion changes for manual review
8. Publish to Pinecone (if publish mode on)
9. Save job report and audits

## 9. Commands Cheat Sheet

From `backend/`:

```powershell
# Start backend
npm run dev

# Ingest all (full pass)
npm run ingest

# Ingest next chunk (resume mode)
npm run ingest:next

# Semi pipeline
npm run ingest:semi
npm run ingest:semi -- --shadow
npm run ingest:semi -- --publish

# Review / approve / reject / rollback
npm run ingest:review
npm run ingest:approve -- --candidateId=<id>
npm run ingest:reject -- --candidateId=<id> --reason="..."
npm run ingest:rollback -- --jobId=<job_id>

# Integration tests
npx tsx src/scripts/test-integration.ts
```

From `GovGuideApp/`:

```powershell
npm run web
npm run android
npm run ios
```

## 10. Environment Variables You Must Set

Copy `backend/.env.example` -> `backend/.env.local` and fill:

- Firebase:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
- Pinecone:
  - `PINECONE_API_KEY`
  - `PINECONE_INDEX_NAME` (default: `govguide-schemes`)
- Gemini:
  - `GEMINI_API_KEY`
- Telegram (optional but recommended for ingestion evidence):
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHANNEL_ID`
- Security:
  - `JWT_SECRET`
- Ingestion tuning:
  - `INGEST_SHADOW_MODE`
  - `AUTO_PUBLISH_MIN_SCORE`
  - `MAX_SOURCE_TIMEOUT_MS`
  - `RETRY_COUNT`
  - `FETCH_DELAY_MS`
  - `EMBED_DELAY_MS`
  - `PINECONE_BATCH_SIZE`
  - `MAX_AUTO_PUBLISH_FAILURE_RATE`
  - `INGEST_CHUNK` (optional for `ingest:next`)
  - `INGEST_START` (optional for `ingest:next`)
  - `INGEST_DRY_RUN` (optional for `ingest:next`)

## 11. How To Run A Full Demo (Step-by-Step)

1. Start backend:
```powershell
cd "c:\Hackathon Files\AI for Bharat\backend"
npm run dev
```

2. Start frontend:
```powershell
cd "c:\Hackathon Files\AI for Bharat\GovGuideApp"
npm run web
```

3. Demo flow:
- Select language
- Select persona (Farmer/Student/etc.)
- Ask: "How can I get crop insurance?"
- Show ELI5 response card + source scheme card
- Tap "View Docs" to show official source link
- Submit feedback
- Show reminder opt-in

## 12. Non-Technical Explanation (For Team Members)

Think of the system as:
- `schemes.json` = raw syllabus (all scheme facts)
- Pinecone = smart index that finds best matching pages quickly
- Gemini embedding = converts text into numbers so similarity can be computed
- Gemini flash = explains result in simple words
- Firestore = notebook for user/profile/chat/reminder history

So when user asks:
- We "find nearest relevant schemes" first (Pinecone)
- Then "explain only from those schemes" (Gemini prompt with context)

## 13. Known Limitations and Risks

1. Ingestion speed depends on Gemini quota.
2. `npm run ingest` is not quota-efficient for resume; use `ingest:next`.
3. Voice flow scaffolding exists, but full voice capture/transcription path is not complete in UI workflow.
4. Role-based strict metadata filtering in Pinecone query is not yet enforced.
5. JWT implementation is lightweight and suitable for MVP/hackathon, not enterprise-grade auth.
6. Telegram archival is best-effort and can fail without breaking core chat.

## 14. Troubleshooting Guide

1. `401 Unauthorized` from APIs
- Check token/session initialization
- Restart app and backend

2. No chat results
- Verify Pinecone index has vectors
- Verify `GEMINI_API_KEY` and `PINECONE_API_KEY`

3. Ingestion seems stuck at `start=... chunk=...`
- `ingest:next` can be quiet while embedding
- Wait for final summary line

4. Firestore errors
- Check Firebase env vars and private key newline formatting

5. Frontend cannot reach backend
- Android emulator needs `10.0.2.2`
- Web/iOS uses `localhost`

## 15. Quick 2-Minute Pitch Script (Ready To Use)

"Government scheme information is available, but hard to understand and hard to discover.  
We built GovGuide, a mobile-first AI assistant that explains schemes in simple language for farmers, students, and citizens.  
The user selects language and persona, asks a plain question, and our backend runs a retrieval-augmented pipeline: query embedding, vector search on verified scheme data, and grounded ELI5 generation.  
We also support feedback loops and reminder opt-in for deadline-sensitive schemes.  
On data side, we scraped 4,578 real schemes and built ingestion workflows for both manual and semi-automatic authenticity-gated updates.  
This creates a practical bridge between government data and real citizen understanding."

## 16. Immediate Next Steps For Team

1. Complete ingestion until Pinecone vectors reach 4,578.
2. Add role-based metadata filters in Pinecone query.
3. Implement full voice-to-query UX path.
4. Add deployment configuration (backend + frontend) for judges/demo environment.
5. Add lightweight admin review UI on top of existing review/approve CLI.

---

If you are taking over this project: start with sections **9**, **10**, and **11** first, then read **6** and **8** for technical depth.
