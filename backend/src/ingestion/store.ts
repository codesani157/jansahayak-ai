import { db } from '../lib/firebase';
import crypto from 'crypto';
import type {
  CandidateStatus,
  CandidateChange,
  IngestionCandidateRecord,
  IngestionJobStatus,
  NormalizedScheme,
  SchemeCatalogRecord,
  SourceFetchResult,
} from './types';
import { nowIso, sha256 } from './utils';

const COLLECTIONS = {
  jobs: 'IngestionJobs',
  candidates: 'IngestionCandidates',
  catalog: 'SchemeCatalog',
  fetchAudit: 'SourceFetchAudit',
};

function nextId(): string {
  return crypto.randomUUID();
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}

function logNoDb(operation: string): void {
  console.warn(`[ingestion/store] Firestore unavailable; skipped ${operation}`);
}

export function isDatabaseAvailable(): boolean {
  return Boolean(db);
}

export function assertDatabaseAvailable(): void {
  if (!db) {
    throw new Error(
      'Firestore is not initialized. Configure Firebase credentials in backend/.env.local',
    );
  }
}

export async function createIngestionJob(
  trigger: 'manual' | 'weekly_scheduler',
  options: {
    shadow_mode: boolean;
    dry_run: boolean;
    detect_deletions: boolean;
    auto_publish_min_score: number;
    max_source_timeout_ms: number;
    retry_count: number;
  },
): Promise<string> {
  const jobId = nextId();
  const startedAt = nowIso();

  if (!db) {
    logNoDb('createIngestionJob');
    return jobId;
  }

  await db.collection(COLLECTIONS.jobs).doc(jobId).set({
    ...stripUndefinedDeep({
    job_id: jobId,
    trigger,
    status: 'RUNNING',
    started_at: startedAt,
    completed_at: null,
    options,
    metrics: {},
    notes: [],
    created_at: startedAt,
    updated_at: startedAt,
    }),
  });

  return jobId;
}

export async function updateIngestionJob(
  jobId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  if (!db) {
    logNoDb('updateIngestionJob');
    return;
  }

  await db
    .collection(COLLECTIONS.jobs)
    .doc(jobId)
    .set(
      stripUndefinedDeep({
        ...patch,
        updated_at: nowIso(),
      }),
      { merge: true },
    );
}

export async function completeIngestionJob(
  jobId: string,
  status: IngestionJobStatus,
  metrics: Record<string, unknown>,
): Promise<void> {
  await updateIngestionJob(jobId, {
    status,
    metrics,
    completed_at: nowIso(),
  });
}

export async function recordSourceFetchAudit(
  jobId: string,
  result: SourceFetchResult,
): Promise<void> {
  if (!db) {
    logNoDb('recordSourceFetchAudit');
    return;
  }

  const digest = result.sha256 ?? sha256(`${result.source_id}|${result.fetched_at}`);
  const auditId = `${jobId}_${result.source_id}_${digest.slice(0, 12)}`;
  await db.collection(COLLECTIONS.fetchAudit).doc(auditId).set({
    ...stripUndefinedDeep({
    id: auditId,
    job_id: jobId,
    source_id: result.source_id,
    source_url: result.source_url,
    source_state: result.source_state,
    status: result.status,
    http_status: result.http_status ?? null,
    content_type: result.content_type ?? null,
    etag: result.etag ?? null,
    last_modified: result.last_modified ?? null,
    sha256: result.sha256 ?? null,
    error: result.error ?? null,
    fetched_at: result.fetched_at,
    created_at: nowIso(),
    }),
  });
}

export async function getSchemeCatalogMap(): Promise<Map<string, SchemeCatalogRecord>> {
  const out = new Map<string, SchemeCatalogRecord>();
  if (!db) {
    logNoDb('getSchemeCatalogMap');
    return out;
  }

  const snap = await db.collection(COLLECTIONS.catalog).get();
  for (const doc of snap.docs) {
    out.set(doc.id, doc.data() as SchemeCatalogRecord);
  }
  return out;
}

export async function isSchemeCatalogEmpty(): Promise<boolean> {
  if (!db) {
    logNoDb('isSchemeCatalogEmpty');
    return true;
  }
  const snap = await db.collection(COLLECTIONS.catalog).limit(1).get();
  return snap.empty;
}

export async function upsertSchemeCatalogRecord(
  record: SchemeCatalogRecord,
): Promise<void> {
  if (!db) {
    logNoDb('upsertSchemeCatalogRecord');
    return;
  }
  await db
    .collection(COLLECTIONS.catalog)
    .doc(record.scheme_id)
    .set(
      stripUndefinedDeep({
        ...record,
        updated_at: nowIso(),
      }),
      { merge: true },
    );
}

export async function upsertSchemeCatalogRecords(
  records: SchemeCatalogRecord[],
): Promise<void> {
  if (records.length === 0) return;
  if (!db) {
    logNoDb('upsertSchemeCatalogRecords');
    return;
  }

  const batch = db.batch();
  for (const record of records) {
    const ref = db.collection(COLLECTIONS.catalog).doc(record.scheme_id);
    batch.set(
      ref,
      stripUndefinedDeep({
        ...record,
        updated_at: nowIso(),
      }),
      { merge: true },
    );
  }
  await batch.commit();
}

export async function queueCandidateChange(
  jobId: string,
  change: CandidateChange,
  evidenceRef: string | null,
): Promise<string> {
  const candidateId = nextId();
  const now = nowIso();
  const record: IngestionCandidateRecord = {
    candidate_id: candidateId,
    job_id: jobId,
    status: 'pending_review',
    evidence_ref: evidenceRef,
    decision_reason: null,
    created_at: now,
    updated_at: now,
    ...change,
  };

  if (!db) {
    logNoDb('queueCandidateChange');
    return candidateId;
  }

  await db
    .collection(COLLECTIONS.candidates)
    .doc(candidateId)
    .set(stripUndefinedDeep(record));
  return candidateId;
}

export async function listPendingCandidates(
  limitCount = 100,
): Promise<IngestionCandidateRecord[]> {
  if (!db) {
    logNoDb('listPendingCandidates');
    return [];
  }

  const snap = await db
    .collection(COLLECTIONS.candidates)
    .where('status', '==', 'pending_review')
    .limit(limitCount)
    .get();

  return snap.docs
    .map((doc) => doc.data() as IngestionCandidateRecord)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getCandidateById(
  candidateId: string,
): Promise<IngestionCandidateRecord | null> {
  if (!db) {
    logNoDb('getCandidateById');
    return null;
  }
  const doc = await db.collection(COLLECTIONS.candidates).doc(candidateId).get();
  if (!doc.exists) return null;
  return doc.data() as IngestionCandidateRecord;
}

export async function updateCandidateStatus(
  candidateId: string,
  status: CandidateStatus,
  decisionReason?: string,
): Promise<void> {
  if (!db) {
    logNoDb('updateCandidateStatus');
    return;
  }
  await db
    .collection(COLLECTIONS.candidates)
    .doc(candidateId)
    .set(
      stripUndefinedDeep({
        status,
        decision_reason: decisionReason ?? null,
        updated_at: nowIso(),
      }),
      { merge: true },
    );
}

export async function listCatalogRecordsByJob(
  jobId: string,
): Promise<SchemeCatalogRecord[]> {
  if (!db) {
    logNoDb('listCatalogRecordsByJob');
    return [];
  }
  const snap = await db
    .collection(COLLECTIONS.catalog)
    .where('last_published_job_id', '==', jobId)
    .get();
  return snap.docs.map((doc) => doc.data() as SchemeCatalogRecord);
}

export function buildCatalogRecord(
  params: {
    previous: SchemeCatalogRecord | null;
    next: NormalizedScheme;
    jobId: string;
    authenticityScore: number;
    evidenceRef: string | null;
  },
): SchemeCatalogRecord {
  const version = params.previous ? params.previous.version + 1 : 1;
  const rollbackSnapshot = params.previous
    ? ({
        ...params.previous,
      } as NormalizedScheme)
    : null;

  return {
    ...params.next,
    version,
    status: 'active',
    last_verified_at: nowIso(),
    last_published_job_id: params.jobId,
    authenticity_score: params.authenticityScore,
    evidence_ref: params.evidenceRef,
    rollback_snapshot: rollbackSnapshot,
    rollback_version: params.previous?.version ?? null,
  };
}
