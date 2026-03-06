# GovGuide: Basic Command Guide

This guide provides the essential commands needed to run, develop, and manage the GovGuide project locally.

## 1. Running the Project

To run the full application, you need to start both the backend and the frontend in separate terminal windows.

### Backend (Next.js API)
Handles AI logic, vector search, and database integration.
```bash
cd backend
npm run dev
```
*Access at: http://localhost:3000*

### Frontend (Expo App)
The mobile/web user interface.
```bash
cd GovGuideApp
# For web browser testing:
npm run web
# For mobile emulators:
npm run android
# OR
npm run ios
```
*Access at: http://localhost:8082*

---

## 2. Data & Admin Commands

Use these commands inside the `backend` directory to manage the scheme database.

| Action | Command | Description |
| :--- | :--- | :--- |
| **Scrape Data** | `./scrape-myscheme.ps1` | Fetches 4,500+ schemes from MyScheme API |
| **Ingest Data** | `npm run ingest` | Embeds and pushes schemes to Pinecone |
| **Resume Ingest (Quota-safe)** | `npm run ingest:next` | Ingests the next chunk from current Pinecone count (default 1,000) |
| **Semi-Auto Ingest** | `npm run ingest:semi` | Runs ingestion with authenticity checks |
| **Review Batch** | `npm run ingest:review` | Checks pending changes awaiting approval |

---

## 3. Maintenance

If you've recently cloned the repo or added new dependencies:

```bash
# In either /backend or /GovGuideApp
npm install
```

> [!IMPORTANT]
> Ensure your `backend/.env.local` is set up with:
> - `GEMINI_API_KEY`
> - `PINECONE_API_KEY`
> - `FIREBASE_SERVICE_ACCOUNT`
