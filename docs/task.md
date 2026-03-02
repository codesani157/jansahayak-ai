# MVP Implementation Roadmap: GovGuide (100% Free Tier Architecture)

> **Last Updated:** 2026-03-03  
> **Overall Status:** ✅ MVP Core Complete — Backend + Frontend running on localhost

---

## Phase 1: Foundation & Project Setup
- [x] Initialize React Native Expo project (`GovGuideApp/`) with TypeScript strict mode.
- [x] Install and configure core dependencies (React Navigation, expo-secure-store, react-native-web).
- [x] Set up Firebase project (`govguide-1518c`), initialize `firebase-admin` for the backend.
- [x] Implement lightweight anonymous auth via device fingerprinting + custom JWT (HS256, 7-day expiry).
- [x] Register the Telegram bot (`@govguide_storage_bot`) on BotFather, secure API tokens.
- [x] Initialize Next.js (App Router) backend project at `backend/` with TypeScript.

## Phase 2: Data Pipeline & Backend Configuration
- [x] Setup Firebase Firestore schemas (`Users`, `Reminders`, `ChatLogs`) — auto-created on first write.
- [x] Setup Pinecone account, create `govguide-schemes` index (768 dimensions, cosine metric).
- [x] Build offline Node ingestion script (`src/scripts/ingest.ts`) to embed and upsert scheme data.
- [x] Curate 15 real Indian government schemes in `src/data/schemes.json` (PM-KISAN, PMFBY, MUDRA, PMAY, Ayushman Bharat, Sukanya Samriddhi, PMSS, MGNREGA, SVANidhi, Ujjwala, IGNOAPS, Stand-Up India, PMKVY, PMJDY).
- [x] Execute embedding pipeline — all 15 schemes ingested into Pinecone with `gemini-embedding-001` (768 dim).
- [x] Implement Telegram blob storage utility (`src/lib/telegram.ts`) — upload/download verified.

## Phase 3: RAG Core API & AI Logic (Next.js API Routes)
- [x] Create `/api/v1/auth/session` — anonymous session creation by `device_id`, returns JWT.
- [x] Create `/api/v1/users/preferences` — updates `preferred_language` + `role_name` in Firestore.
- [x] Create `/api/v1/chat/query` — full RAG pipeline: embed query → Pinecone top-5 → Gemini ELI5 → log to Firestore.
- [x] Create `/api/v1/chat/feedback` — validates score 1-5, verifies log ownership, updates Firestore.
- [x] Create `/api/v1/reminders/opt-in` — validates +91 phone, creates Reminder doc in Firestore.
- [x] Implement semantic search (cosine similarity) in Pinecone with top-5 retrieval.
- [x] Construct dynamic ELI5 prompt with role-aware context and scheme metadata.
- [x] Hook up Google Gemini `gemini-2.5-flash` (free tier) for response generation with retry logic (429 handling).
- [ ] Add voice processing route using Bhashini / Whisper STT (deferred — not MVP-critical).

## Phase 4: Frontend Development & State
- [x] Build Mobile-First Onboarding: Language selection screen → Persona/Role selection screen.
- [x] Build Chat UI with message bubbles, typing indicator, loading states, and error handling.
- [x] Build ELI5 Scheme Cards with benefit amount, eligibility, and apply URL.
- [x] Build Quick Reply Chips for suggested follow-up queries.
- [x] Build Chat Input Bar with send functionality.
- [x] Build responsive container and app header components.
- [x] Create full service layer: `api.ts`, `authService.ts`, `chatService.ts`, `userService.ts`, `reminderService.ts`.
- [x] Wire frontend services to all 5 backend API endpoints with proper contract alignment.
- [ ] Implement audio recording for voice-note interactions (deferred — not MVP-critical).

## Phase 5: Smart Reminders (Background Workers)
- [x] Create `/api/v1/reminders/opt-in` endpoint for users to register phone numbers.
- [ ] Configure Cron Jobs for deadline scanning (deferred — not MVP-critical).
- [ ] Implement SMS dispatch via Twilio or equivalent (deferred — skipped by user decision).

## Phase 6: Testing & Integration
- [x] Backend TypeScript: zero errors (`npx tsc --noEmit` passes).
- [x] Frontend TypeScript: zero errors (`npx tsc --noEmit` passes).
- [x] Telegram blob storage: 5/5 tests passed (bot identity, message, upload, download, round-trip).
- [x] Full integration test: 15/15 assertions passed (session → preferences → query → feedback → reminders).
- [x] Frontend↔Backend contract audit: 5 mismatches found and fixed.
- [x] RAG pipeline verified: "crop insurance" query correctly returns PMFBY as top result.

## Phase 7: Localhost Hosting
- [x] Backend running on `http://localhost:3000` (Next.js dev server).
- [x] Frontend running on `http://localhost:8081` (Expo Web dev server).
- [x] Frontend `BASE_URL` configured to hit `localhost:3000` on web platform.
- [ ] Vercel deployment (deferred — skipped by user decision for now).

---

### Deferred / Future Enhancements
| Feature | Reason Deferred |
|---------|----------------|
| Voice input (Bhashini/Whisper STT) | Not MVP-critical, requires additional API integration |
| SMS reminders (Twilio) | User decision to skip for MVP |
| Vercel deployment | User chose localhost-only for hackathon demo |
| Role-based Pinecone filtering | All 15 schemes are general; metadata filtering not needed yet |
| Multi-language Gemini responses | Prompt supports it but not tested end-to-end |
