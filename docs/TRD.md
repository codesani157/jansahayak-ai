# Technical Requirements Document (TRD): GovGuide (Working Title)

## 1. System Architecture Overview
The GovGuide MVP is a lightweight, mobile-first web application powered by a Retrieval-Augmented Generation (RAG) backend. The architecture follows a standard client-server model augmented with a vector database and an LLM integration for conversational capabilities.

**Core Components:**
- **Client Head:** A responsive Single Page Application (SPA) providing the chat interface and onboarding flow.
- **API Gateway/Backend Server:** Handles business logic, authentication, request validation, and orchestrates the RAG pipeline.
- **Object Storage (Telegram):** Utilizing Telegram Channels/Groups as an unlimited, free blob storage for hosting the raw PDF/Word files of government schemes.
- **Vector Database:** Stores and retrieves chunked text embeddings of the government schemes (linked to Telegram file IDs) for fast semantic search.
- **Relational Database:** Stores user profiles, chat histories, role configurations, and scheduled reminder metadata.
- **LLM Engine:** Processes natural language queries and generates "Explain Like I'm 5" (ELI5) responses based on retrieved context.
- **Messaging Service:** Dispatches asynchronous tasks for SMS/Email smart reminders.

## 2. Frontend Responsibilities
**Technology Stack:** React.js or Next.js (client-side rendered for MVP), Tailwind CSS for styling.
- **Mobile-First Chat UI:** Render a highly responsive, app-like chat interface optimized for low-end mobile devices and spotty network conditions.
- **Onboarding Flow:** Capture and store user preferences (language, role) in local storage for quick access, and sync to the backend to personalize future sessions.
- **Multimedia Handling:** Capture audio input (voice notes) using the Web Audio API, compress it, and send it to the backend for transcription.
- **State Management:** Manage active chat context, loading states (streaming LLM responses if applicable), and retry mechanisms for failed requests.

## 3. Backend Responsibilities
**Technology Stack:** Python (FastAPI) or Node.js (Express/NestJS). Python is recommended given the heavy reliance on data processing, AI libraries (LangChain/LlamaIndex), and vector operations.
- **API Endpoints:** Serve RESTful APIs for user management, querying, and reminder scheduling.
- **RAG Orchestration:**
  - Receive user query and context (user role/persona).
  - Convert voice queries to text using an STT engine (e.g., OpenAI Whisper, Bhashini for Indian languages).
  - Embed the text query and search the Vector Database for the most relevant government schemes, applying hard filters based on the user's role.
  - Construct a prompt containing the retrieved context, user role, and the instruction to "Explain Like I'm 5" and translate to the requested language.
  - Call the LLM and return the synthesized response to the frontend.
- **Background Jobs:** A cron job system (e.g., Celery, BullMQ) to monitor the database for upcoming deadlines and trigger SMS/Email reminders asynchronously.

## 4. Proposed Database Schema
We propose a hybrid storage approach. We will use **Telegram** as the raw Object Storage (acting as a free, unlimited CDN for heavy PDFs/documents), combined with **PostgreSQL** (utilizing the `pgvector` extension) to handle relational user data and vector embeddings for semantic search.

### Tables
- **Users**
  - `id` (UUID, Primary Key)
  - `phone_number_hash` (String, Indexed) / `email` (Optional)
  - `preferred_language` (String)
  - `role_id` (UUID, Foreign Key)
  - `created_at` (Timestamp)
- **Roles** (e.g., Farmer, Student, MSME)
  - `id` (UUID, Primary Key)
  - `role_name` (String)
- **ChatLogs**
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key)
  - `query_text` (Text)
  - `response_text` (Text)
  - `timestamp` (Timestamp)
  - `feedback_score` (Integer, Optional - for thumbs up/down)
- **Schemes (Vector Data)** *(Stored in pgvector)*
  - `id` (UUID, Primary Key)
  - `title` (String)
  - `target_roles` (Array of UUIDs)
  - `deadline` (Timestamp, Optional)
  - `telegram_file_id` (String) - Maps the chunk back to the full raw document stored natively in Telegram.
  - `content_chunk` (Text)
  - `embedding` (Vector - e.g., 1536 dimensions)
- **Reminders**
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key)
  - `scheme_id` (UUID, Foreign Key)
  - `remind_at` (Timestamp, Indexed)
  - `status` (Enum: PENDING, SENT, FAILED)

## 5. API Structure (RESTful)
- `POST /api/v1/auth/session` - Initializes user session or registers a new user via simple OTP.
- `PUT /api/v1/users/preferences` - Updates user preferred language and role.
- `POST /api/v1/chat/query`
  - Payload: `{ "text_query": "How to get a farming loan?", "audio_blob": null, "user_id": "123" }`
  - Response: `{ "reply": "...", "source_schemes": [...] }`
- `POST /api/v1/reminders/opt-in`
  - Payload: `{ "user_id": "123", "scheme_id": "456", "phone_number": "+1234..." }`
- `POST /api/v1/chat/feedback`
  - Payload: `{ "log_id": "...", "score": 1 }`

## 6. Authentication Strategy
**Passwordless / OTP-based Auth:**
- Users should not need to remember passwords for this service.
- **MVP Approach:** Device fingerprinting / local storage token for completely frictionless generic usage. If they opt into reminders (which requires PII like a phone number), perform a simple SMS OTP verification using a service like Firebase Auth or Supabase Auth. This issues a JWT for secure API communication.

## 7. Third-Party Dependencies
- **LLM API:** OpenAI (GPT-4o/mini), Anthropic (Claude 3.5 Haiku, good for fast simple extraction), or Google (Gemini 1.5 Flash).
- **Speech-to-Text (STT):** Bhashini (for Indian regional dialects) or OpenAI Whisper API.
- **Database / Auth Hosting:** Supabase (Provides PostgreSQL, pgvector, Auth, and Edge Functions out of the box) running alongside **Telegram Bot API** for unlimited free blob storage.
- **SMS / Messaging Integration:** Twilio or AWS SNS for pushing SMS reminders.
- **Job Queue:** Upstash/QStash for serverless cron jobs (if hosting on Vercel/Render) or Celery/Redis for a traditional VPS.

## 8. Scalability Considerations
- **LLM Bottlenecks:** LLM calls are slow and expensive.
  - *Mitigation:* Implement semantic caching (e.g., Redis). If two users ask a very similar question, return the cached ELI5 response instead of hitting the LLM API again.
- **Connection Pooling:** Ensure the backend uses database connection pooling (e.g., PgBouncer) to prevent exhausting database connections under high API request volume.
- **Stateless Backend:** Keep the API completely stateless (JWT authentication) so multiple backend instances can be spun up behind a load balancer as traffic grows.
- **Asynchronous Reminders:** Do not tie the cron job execution to the main API thread. Use a dedicated worker queue to process reminders to ensure the chat interface remains responsive.
- **Telegram Bot API Rate Limiting:** Utilizing Telegram as a free object storage introduces strict rate-limiting on file downloads/uploads.
  - *Mitigation:* We will only download the raw file from Telegram during the initial offline ingestion phase (crons or manual triggers) to parse text chunks and generate embeddings in the Vector DB. Real-time user queries only hit the Vector DB, completely bypassing Telegram, mitigating speed tradeoffs for the end user.
