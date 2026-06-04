# 🇮🇳 JanSahayak AI — Government Schemes Assistant

> **AI for Bharat Hackathon Submission**

JanSahayak AI is a mobile-first, AI-powered assistant that helps Indian citizens discover and understand government schemes in simple language. Citizens miss benefits because scheme information is scattered across portals and written in complex bureaucratic jargon. JanSahayak AI bridges this gap.

## Live Demo

💬 **[https://jansahayak-ai.vercel.app/](https://jansahayak.vercel.app/)**

## How It Works

1. **Choose** your language (English / Hindi / Tamil) and persona (Farmer, Student, etc.)
2. **Ask** any question about government schemes in plain language
3. **Get** an easy-to-understand (ELI5) answer with official source links and scheme cards

## Architecture

```
User → Expo React Native App (Web/iOS/Android)
         ↓
       Next.js API Backend (/api/v1/*)
         ↓
       Gemini Embedding API (query vectorization)
         ↓
       Pinecone (vector similarity search over 4,500+ schemes)
         ↓
       Gemini 2.5 Flash (ELI5 answer generation)
         ↓
       Firebase Firestore (user sessions, chat logs, reminders)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo) with web export |
| Backend | Next.js 16 (App Router, API Routes) |
| LLM | Google Gemini 2.5 Flash |
| Embeddings | Gemini Embedding 001 (768-dim) |
| Vector DB | Pinecone (cosine similarity) |
| Database | Firebase Firestore |
| Auth | Anonymous device-based JWT (HS256) |
| Blob Storage | Telegram Bot API |
| Deployment | Vercel |

## Data Pipeline

- **4,578 real government schemes** scraped from MyScheme.gov.in and other official sources
- **Semi-automatic ingestion pipeline** with authenticity scoring and human-in-the-loop review
- **Source registry** tracking 38 government data sources (10 active)
- Resume-friendly ingestion: `npm run ingest:next` picks up where it left off

## Project Structure

```
AI for Bharat/
├── backend/                  # Next.js API + deployment root
│   ├── src/app/api/v1/       # REST API routes (auth, chat, reminders, users)
│   ├── src/lib/              # Firebase, Gemini, Pinecone, JWT clients
│   ├── src/data/             # schemes.json (4,578 schemes) + source registry
│   ├── src/ingestion/        # Semi-automatic data pipeline
│   ├── src/scripts/          # CLI tools (ingest, test, etc.)
│   ├── public/app/           # Expo web build (served at /app/)
│   └── vercel.json           # Vercel deployment config
├── GovGuideApp/              # Expo React Native frontend
│   ├── src/screens/          # Language, Persona, Chat screens
│   ├── src/components/       # UI components
│   ├── src/services/         # API client layer
│   └── src/context/          # App state management
└── docs/                     # PRD, TRD, handoff docs
```

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Backend
```bash
cd backend
cp .env.example .env.local   # Fill in API keys
npm install
npm run dev                   # http://localhost:3000
```

### Frontend
```bash
cd GovGuideApp
npm install
npm run web                   # http://localhost:8081
```

## Deployment to Vercel

The backend directory is the Vercel deployment root. It serves both the API and the Expo web frontend.

1. Import the repo on Vercel
2. Set **Root Directory** to `backend`
3. Add all environment variables from `.env.example`
4. Deploy — Vercel auto-detects Next.js

## Key Features

-  **Multilingual** — English, Hindi, Tamil
-  **Persona-aware** — Tailored responses for farmers, students, women, senior citizens, etc.
-  **RAG Pipeline** — Retrieval-Augmented Generation for grounded, accurate answers
-  **Scheme Cards** — Structured cards with eligibility, benefits, and official apply links
-  **Feedback Loop** — Thumbs up/down on every response for quality tracking
-  **Reminders** — Opt-in reminders for deadline-sensitive schemes

## Team
- Rajdeep Ray
- Susmit Thakur
- Soumyadeep Datta
- Samiran Jana
Built for the AI for Bharat Hackathon.
