# GovGuide Data Ingestion Runbook

> Updated: 2026-03-04

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run ingest` | Seed from `schemes.json` → Gemini embeddings → Pinecone upsert |
| `npm run ingest:semi` | Semi-automatic pipeline (fetch → normalize → gate → publish) |
| `npm run ingest:weekly` | Weekly scheduler entrypoint |
| `npm run ingest:review` | List pending review candidates |
| `npm run ingest:approve -- --candidateId=<id>` | Approve a candidate |
| `npm run ingest:reject -- --candidateId=<id> --reason="..."` | Reject a candidate |
| `npm run ingest:rollback -- --jobId=<job_id>` | Rollback a published job |

## Full-Scale Data Refresh (MyScheme Scraper)

To re-scrape all schemes from MyScheme.gov.in:

```bash
cd "c:\Hackathon Files\AI for Bharat\backend"
powershell -ExecutionPolicy Bypass -File scrape-myscheme.ps1
```

This fetches all 4,632+ schemes from `api.myscheme.gov.in/search/v6/schemes` in batches of 100. Output goes to `src/data/schemes.json`.

Then ingest into Pinecone:
```bash
npm run ingest
```

> **Note:** Gemini free-tier allows ~1,000 embeddings/day. For 4,578 schemes, you need ~5 daily runs. Swap API keys or upgrade to pay-as-you-go to do it in one shot.

## Checking Pinecone Vector Count

```bash
node -e "require('dotenv').config({path:'.env.local'}); const {Pinecone}=require('@pinecone-database/pinecone'); (async()=>{const pc=new Pinecone({apiKey:process.env.PINECONE_API_KEY}); const s=await pc.index('govguide-schemes').describeIndexStats(); console.log('Vectors:', s.totalRecordCount)})()"
```

## Semi-Automatic Pipeline Flags

```bash
npm run ingest:semi -- --shadow          # dry-run, no publishing
npm run ingest:semi -- --publish         # publish approved candidates
npm run ingest:semi -- --dry-run         # log only, no writes
npm run ingest:semi -- --no-detect-deletions
npm run ingest:semi -- --minScore=85 --timeoutMs=15000 --retryCount=2
```

## Default Runtime Policy
- Default mode: shadow (`INGEST_SHADOW_MODE=true`)
- Switch to hybrid publish: `INGEST_SHADOW_MODE=false`
- Auto-publish threshold: `AUTO_PUBLISH_MIN_SCORE=85`
- Source timeout: `MAX_SOURCE_TIMEOUT_MS=15000`
- Retry count: `RETRY_COUNT=2`

## Scheduling (Windows Task Scheduler)
Program: `powershell.exe`  
Arguments:
```
-NoProfile -ExecutionPolicy Bypass -Command "cd 'C:\Hackathon Files\AI for Bharat\backend'; npm run ingest:weekly"
```
Schedule: Weekly, Monday, 02:30 AM IST

## Parser Strategies
| Strategy | Format | Source |
|----------|--------|--------|
| `seed_static` | Local JSON file | `schemes.json` |
| `json_list` | JSON array | Generic API |
| `xml_sitemap` | XML sitemap | Government portals |
| `html_catalog` | HTML pages | Scraped portals |
| `ogd_api` | OGD JSON wrapper | `api.data.gov.in` |
| `apisetu_json` | API Setu format | `apisetu.gov.in` |

## Notes
- Chat API contracts remain unchanged.
- Telegram evidence archival is best-effort.
- Manual fallback (`npm run ingest`) stays available as emergency path.
- "View Docs" buttons link directly to `myscheme.gov.in/schemes/{slug}`.
