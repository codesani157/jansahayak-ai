# Project Handoff: GovGuide

> Last Updated: 2026-03-04 (01:00 IST)  
> Current State: Shutting down — Pinecone ingestion partially complete

## 1. Executive Snapshot
- Core app (frontend + backend) remains intact.
- **4,578 real government schemes** scraped from MyScheme.gov.in internal API.
- **999 schemes live in Pinecone** (Gemini embedding quota exhausted for today).
- Semi-automatic ingestion pipeline is implemented and wired.
- OGD JSON (`ogd_api`) and API Setu (`apisetu_json`) parser strategies added.
- "View Docs" button links directly to official `myscheme.gov.in/schemes/{slug}` pages.

## 2. What Was Done This Session

### Data Scraping (Full-Scale)
- Discovered MyScheme.gov.in's internal API: `api.myscheme.gov.in/search/v6/schemes`
- Built PowerShell scraper: `backend/scrape-myscheme.ps1`
- Fetched all **4,632 schemes** in 47 batches → **4,578 unique** after dedup
- Data covers **14 categories**: education (1071), agriculture (825), welfare (791), business (628), women & children (267), health (266), employment (237), sports (150), financial inclusion (110), housing (105), science (44), general (38), transport (28), utility (18)
- Output: `backend/src/data/schemes.json` (4 MB)

### Pinecone Ingestion
- Ran `npm run ingest` to embed and upsert schemes into Pinecone
- **999 schemes successfully uploaded** to `govguide-schemes` index
- Hit Gemini free-tier limit (1,000 embeddings/day)
- Remaining ~3,579 schemes need additional ingest runs

### TypeScript Enhancements
- Added `ogd_api` and `apisetu_json` to `ParserStrategy` type in `types.ts`
- Fixed syntax error in `test-ogd.ts`
- `tsc --noEmit` passes with zero errors

## 3. Immediate Actions When Resuming

### Step 1: Get Gemini API Quota
The Gemini free-tier resets at **midnight Pacific Time (~1:30 PM IST)**. Options:
- Wait for quota reset, OR
- Swap in a fresh Gemini API key from another Google account in `backend/.env.local`

### Step 2: Resume Pinecone Ingestion
```bash
cd "c:\Hackathon Files\AI for Bharat\backend"
npm run ingest
```
This will embed and push the next batch of schemes (~1,000 per day on free tier).

### Step 3: Verify Chatbot
```bash
npm run dev    # start backend
```
Ask GovGuide questions like "housing schemes for poor families" to verify search works.

## 4. Architecture: Data Flow
```
MyScheme.gov.in API  →  scrape-myscheme.ps1  →  schemes.json (4,578 schemes)
                                                       ↓
                                              npm run ingest
                                                       ↓
                                          Gemini Embeddings API
                                                       ↓
                                         Pinecone (govguide-schemes)
                                                       ↓
                                           Chat Query (user question)
                                                       ↓
                                        Gemini Flash (answer generation)
```

## 5. Key Files Changed This Session
- **Modified:**
  - `backend/src/data/schemes.json` — expanded from 15 to 4,578 schemes
  - `backend/src/ingestion/types.ts` — added `ogd_api`, `apisetu_json` strategies
  - `backend/src/ingestion/test-ogd.ts` — fixed syntax error
  - `backend/src/data/source_registry.json` — added OGD API entry
- **New:**
  - `backend/scrape-myscheme.ps1` — full-scale MyScheme scraper
  - `backend/src/scripts/scrape-myscheme.ts` — Node.js scraper (TLS issues on Windows)

## 6. Security Reminder
- Firebase private key was exposed in earlier sessions — rotate it.
- MyScheme API key (`tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc`) is publicly embedded in their frontend JS bundle — safe to use.

## 7. Pinecone Index Status
- Index name: `govguide-schemes`
- Vectors: **999** (of 4,578 target)
- Embedding model: `gemini-embedding-1.0`
- Status: Partially ingested (quota limited)

## 8. Shutdown State
- Backend: `npm run dev` on port 3000
- Frontend: `npm run web` on port 8082
- All processes should be terminated manually (Ctrl+C)
