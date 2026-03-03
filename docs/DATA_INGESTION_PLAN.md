# Semi-Automatic Authentic Ingestion Plan (No-Cost, Non-Breaking)

## Summary
This plan adds a **semi-automatic ingestion pipeline** on top of the current `schemes.json -> embeddings -> Pinecone` workflow, while preserving all existing frontend/backend contracts.  
It enforces authenticity using official-source allowlists, change-risk classification, and a hybrid publish gate.

Chosen decisions (locked):
- Source policy: **Official API + Official Portal fallback**
- Approval model: **Hybrid gate**
- Sync cadence: **Weekly + manual trigger**
- Coverage target: **Central + all states**

No user-facing API contract will change in phase 1.

## Goals
1. Reduce manual manager workload for data collection.
2. Keep authenticity high enough for public-benefit content.
3. Stay at zero additional paid cost.
4. Preserve current app behavior and response schema.
5. Avoid disruptive migrations or runtime coupling.

## Non-Goals
1. No real-time crawl during chat requests.
2. No replacement of Gemini/Pinecone/JWT core architecture.
3. No paid workflow/orchestration products.
4. No immediate UI admin panel dependency (CLI + Firestore queue first).

## Current-State Compatibility Constraints
1. Keep Pinecone embedding model and dimension unchanged (`gemini-embedding-001`, 768).
2. Keep existing API responses unchanged (`/api/v1/chat/query`, `/api/v1/chat/feedback`, etc.).
3. Keep script-based ingest path available (`npm run ingest`) as fallback.
4. Keep Telegram as evidence/blob storage utility, not runtime dependency for chat.

## Target Architecture
1. **Source Registry Layer**  
Create a registry of official sources (central + all states), each entry including source URL, source type, parser strategy, and trust level.
2. **Fetcher/Extractor Layer**  
Scheduled/manual script fetches source pages/APIs, extracts scheme records to normalized schema.
3. **Authenticity Layer**  
Each extracted record gets source validation results, field-level evidence, and authenticity score.
4. **Diff + Risk Classifier Layer**  
Compare extracted records against canonical catalog and classify change risk.
5. **Hybrid Publish Gate**  
Auto-publish low-risk updates; queue high-risk/new/deleted records for human approval.
6. **Publisher Layer**  
Approved records are embedded and upserted into Pinecone with version metadata.
7. **Audit Layer**  
Store raw payload snapshot + extraction evidence in Firestore and Telegram for traceability.

## Data Flow (Decision-Complete)
1. Weekly scheduler (and manual command) starts ingestion job and writes `IngestionJobs/{job_id}`.
2. Job reads `source_registry` entries for central + all states.
3. For each source, fetch with timeout/retry/backoff and store fetch metadata (`status`, `etag`, `last_modified`, `sha256`).
4. Extract candidate schemes using source-specific parser and normalize into `NormalizedScheme`.
5. Validate required fields (`scheme_id`, `title`, `summary`, `eligibility`, `benefit_amount`, `apply_url`, `department`, `category`, `source_url`, `source_state`).
6. Run authenticity checks:
   - Source URL must match approved allowlist.
   - `apply_url` must be official-domain or explicitly allowlisted.
   - Extraction confidence must pass threshold.
   - Duplicate detection by normalized title + URL hash.
7. Compare with `SchemeCatalog` baseline and classify:
   - `NO_CHANGE`
   - `LOW_RISK_UPDATE`
   - `HIGH_RISK_UPDATE`
   - `NEW_SCHEME`
   - `POTENTIAL_DELETION`
8. Hybrid gate policy:
   - Auto-publish only `LOW_RISK_UPDATE` with authenticity score >= threshold.
   - Queue all `HIGH_RISK_UPDATE`, `NEW_SCHEME`, and `POTENTIAL_DELETION` for manual review.
9. For queued records, write to `IngestionCandidates` and archive evidence payload to Telegram.
10. For auto-published records, embed with current embedding path and upsert to Pinecone using stable IDs.
11. Update `SchemeCatalog` version metadata for each published record.
12. Save job report with counts, failures, and candidate IDs.

## Change-Risk Policy (Exact)
1. Treat these fields as **critical**: `title`, `eligibility`, `benefit_amount`, `apply_url`, `deadline` (if present).  
Any change in critical fields => `HIGH_RISK_UPDATE`.
2. Treat these fields as **non-critical**: `summary`, `details`, `department`, `category`.  
Only non-critical changes + authenticity score >= threshold => `LOW_RISK_UPDATE`.
3. Any new scheme ID => `NEW_SCHEME` (manual approval).
4. Missing previously known scheme in a run => `POTENTIAL_DELETION` (manual approval).
5. Authenticity score below threshold => forced manual queue even if non-critical only.

## Authenticity Controls
1. Maintain strict source registry with only official domains and explicit per-source parser config.
2. Record field evidence per candidate (`evidence_snippet`, `source_url`, `selector/path`, `fetched_at`).
3. Require minimum text length and minimum extraction confidence before classification.
4. Require canonical URL normalization and content hash for tamper/audit trace.
5. Store immutable job and candidate logs in Firestore and Telegram evidence artifacts.

## No-Cost Scheduling Model
1. Default schedule: **Weekly Monday 02:30 IST**.
2. Default runner: local OS scheduler invoking backend script command.
3. Manual trigger remains available via npm command for urgent refresh.
4. Optional future runner: GitHub Actions cron (free-tier minutes) if repository governance allows.

## Interfaces and Type Changes

### Public API changes
1. **No changes** to existing `/api/v1/*` contract in phase 1.

### New internal CLI commands
1. `npm run ingest:semi`  
2. `npm run ingest:weekly`  
3. `npm run ingest:review`  
4. `npm run ingest:approve -- --candidateId=<id>`  
5. `npm run ingest:reject -- --candidateId=<id> --reason="<text>"`  
6. `npm run ingest:rollback -- --jobId=<id>`

### New internal types/interfaces
1. `NormalizedScheme`
2. `SourceRegistryEntry`
3. `AuthenticityResult`
4. `CandidateChange`
5. `IngestionJobReport`
6. `PublishResult`

### New storage schemas (Firestore)
1. `IngestionJobs/{job_id}`
2. `IngestionCandidates/{candidate_id}`
3. `SchemeCatalog/{scheme_id}`
4. `SourceFetchAudit/{source_hash_or_id}`

### Pinecone metadata additions
1. `source_url`
2. `source_state`
3. `source_type`
4. `authenticity_score`
5. `version`
6. `last_verified_at`
7. `evidence_ref` (Firestore or Telegram pointer)

## File-Level Implementation Plan (Non-breaking)
1. Add `backend/src/ingestion/` module with fetch, normalize, authenticity, diff, gate, publish, report submodules.
2. Add `backend/src/data/source_registry.json` covering central + all states.
3. Add new scripts under `backend/src/scripts/` for semi-ingest, review, approve/reject, rollback.
4. Refactor existing embed/upsert logic into reusable helper shared by old and new ingestion scripts.
5. Keep existing `backend/src/scripts/ingest.ts` operational as fallback/manual static mode.
6. Update `backend/package.json` scripts only; no change required in frontend code.
7. Add operator runbook docs under `docs/` for weekly job, approvals, rollback, and failure handling.

## Rollout Strategy
1. Stage 0: Seed `SchemeCatalog` from current `schemes.json`.
2. Stage 1 (Shadow mode, 2 weekly cycles): run fetch/extract/diff/authenticity only; do not publish.
3. Stage 2 (Hybrid mode): enable auto-publish for low-risk only; manual approvals for high-risk/new/deletion.
4. Stage 3 (Scale mode): expand parser quality coverage across all state sources and harden monitoring thresholds.
5. Keep existing manual `npm run ingest` as emergency fallback for entire rollout period.

## Failure Handling and Recovery
1. If fetch fails for a source, mark source stale and continue remaining sources.
2. If parser fails, candidate enters review queue with parser error context.
3. If embedding/upsert fails for a record, skip record, log failure, and continue batch.
4. If publish error rate exceeds threshold, auto-stop publish phase and mark job `FAILED_SAFE`.
5. Rollback uses prior `SchemeCatalog` version metadata to restore Pinecone records.

## Testing Plan

### Unit-level
1. Normalization mapping for API and HTML inputs.
2. Authenticity scoring and threshold behavior.
3. Diff/risk classification for critical vs non-critical changes.
4. Domain allowlist and URL canonicalization checks.

### Integration-level
1. End-to-end semi-ingest dry run with mock sources.
2. Auto-publish flow for low-risk record update.
3. Manual-approval flow from candidate queue to publish.
4. Rollback flow restoring previous vector metadata/content.

### Regression-level
1. Existing `test-integration.ts` must pass unchanged after ingestion module addition.
2. Existing chat endpoint response shape must remain identical.
3. Existing frontend chat rendering must require no schema changes.

### Operational scenarios
1. Weekly job with partial source outages.
2. Duplicate detection for same scheme from two sources.
3. High-risk benefit eligibility change queued and not auto-published.
4. Telegram evidence upload failure behavior validated (queue still retained in Firestore).

## Acceptance Criteria
1. Weekly automated run executes without changing existing chat API behavior.
2. At least one low-risk update can auto-publish end-to-end.
3. All new/high-risk updates require explicit approve command before publish.
4. Every published change has source URL, authenticity score, and evidence reference.
5. Manual fallback ingestion remains functional at all times.

## Assumptions and Defaults
1. Official-source registry is curated and maintained by project team.
2. All-state coverage is target scope; parser quality will mature by iterative source adapter hardening.
3. Embedding model and Pinecone dimension stay unchanged.
4. Hybrid gate thresholds default:
   - `AUTO_PUBLISH_MIN_SCORE = 85`
   - `MAX_SOURCE_TIMEOUT_MS = 15000`
   - `RETRY_COUNT = 2`
5. Scheduler default is weekly + manual trigger (no paid orchestrator).
6. No frontend workflow changes are required for phase 1.
