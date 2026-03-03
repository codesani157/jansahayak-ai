import {
  assertDatabaseAvailable,
  buildCatalogRecord,
  getCandidateById,
  listCatalogRecordsByJob,
  listPendingCandidates,
  updateCandidateStatus,
  upsertSchemeCatalogRecord,
} from './store';
import { publishNormalizedSchemes } from './publish';
import type { IngestionCandidateRecord, NormalizedScheme } from './types';
import { nowIso } from './utils';

function toNormalizedScheme(input: Record<string, unknown>): NormalizedScheme {
  return {
    scheme_id: String(input.scheme_id ?? ''),
    title: String(input.title ?? ''),
    summary: String(input.summary ?? ''),
    eligibility: String(input.eligibility ?? ''),
    benefit_amount: String(input.benefit_amount ?? ''),
    apply_url: String(input.apply_url ?? ''),
    department: String(input.department ?? ''),
    category: String(input.category ?? 'general'),
    details: input.details ? String(input.details) : undefined,
    deadline: input.deadline ? String(input.deadline) : undefined,
    source_url: String(input.source_url ?? ''),
    source_state: String(input.source_state ?? ''),
    source_type: (input.source_type as NormalizedScheme['source_type']) ?? 'seed',
    source_id: String(input.source_id ?? 'rollback'),
    extraction_confidence: Number(input.extraction_confidence ?? 1),
    content_hash: String(input.content_hash ?? ''),
    fetched_at: String(input.fetched_at ?? nowIso()),
    evidence: Array.isArray(input.evidence)
      ? (input.evidence as NormalizedScheme['evidence'])
      : [],
  };
}

export async function reviewPendingCandidates(
  limitCount = 100,
): Promise<IngestionCandidateRecord[]> {
  assertDatabaseAvailable();
  return listPendingCandidates(limitCount);
}

export async function approveCandidate(
  candidateId: string,
): Promise<{ ok: boolean; message: string }> {
  assertDatabaseAvailable();
  const candidate = await getCandidateById(candidateId);
  if (!candidate) {
    return { ok: false, message: `Candidate ${candidateId} not found` };
  }
  if (candidate.status !== 'pending_review') {
    return {
      ok: false,
      message: `Candidate ${candidateId} is not pending_review (status=${candidate.status})`,
    };
  }

  const jobId = `manual_approval_${nowIso()}`;
  if (candidate.classification === 'POTENTIAL_DELETION') {
    if (candidate.existing_record) {
      const nextCatalog = {
        ...candidate.existing_record,
        status: 'inactive' as const,
        last_verified_at: nowIso(),
        last_published_job_id: jobId,
        rollback_snapshot: candidate.existing_record,
        rollback_version: candidate.existing_record.version,
      };
      await upsertSchemeCatalogRecord(nextCatalog);
    }
    await updateCandidateStatus(candidateId, 'approved', 'Approved deletion review');
    return {
      ok: true,
      message: `Candidate ${candidateId} approved; scheme marked inactive`,
    };
  }

  if (!candidate.next_record) {
    await updateCandidateStatus(
      candidateId,
      'failed',
      'Cannot approve: next_record missing',
    );
    return {
      ok: false,
      message: `Candidate ${candidateId} missing next_record`,
    };
  }

  const version =
    (candidate.existing_record?.version ?? 0) + 1;
  const publish = await publishNormalizedSchemes([candidate.next_record], {
    jobId,
    versionBySchemeId: new Map([[candidate.scheme_id, version]]),
    authenticityBySchemeId: new Map([
      [candidate.scheme_id, candidate.authenticity.score],
    ]),
    evidenceRefBySchemeId: new Map([
      [candidate.scheme_id, candidate.evidence_ref ?? null],
    ]),
    failFast: false,
  });

  const result = publish[0];
  if (!result?.success) {
    await updateCandidateStatus(
      candidateId,
      'failed',
      result?.error ?? 'Unknown publish error',
    );
    return {
      ok: false,
      message: `Candidate ${candidateId} publish failed: ${result?.error ?? 'unknown'}`,
    };
  }

  const catalogRecord = buildCatalogRecord({
    previous: candidate.existing_record ?? null,
    next: candidate.next_record,
    jobId,
    authenticityScore: candidate.authenticity.score,
    evidenceRef: candidate.evidence_ref ?? null,
  });
  await upsertSchemeCatalogRecord(catalogRecord);
  await updateCandidateStatus(candidateId, 'published', 'Approved and published');

  return {
    ok: true,
    message: `Candidate ${candidateId} published as version ${catalogRecord.version}`,
  };
}

export async function rejectCandidate(
  candidateId: string,
  reason: string,
): Promise<{ ok: boolean; message: string }> {
  assertDatabaseAvailable();
  const candidate = await getCandidateById(candidateId);
  if (!candidate) {
    return { ok: false, message: `Candidate ${candidateId} not found` };
  }
  await updateCandidateStatus(candidateId, 'rejected', reason);
  return { ok: true, message: `Candidate ${candidateId} rejected` };
}

export async function rollbackPublishedJob(
  jobId: string,
): Promise<{ ok: boolean; message: string }> {
  assertDatabaseAvailable();
  const records = await listCatalogRecordsByJob(jobId);
  if (records.length === 0) {
    return { ok: false, message: `No catalog records found for job ${jobId}` };
  }

  let restored = 0;
  let markedInactive = 0;
  for (const record of records) {
    if (record.rollback_snapshot) {
      const snapshot = toNormalizedScheme(
        record.rollback_snapshot as unknown as Record<string, unknown>,
      );
      const targetVersion = record.rollback_version ?? Math.max(1, record.version - 1);
      const publish = await publishNormalizedSchemes([snapshot], {
        jobId: `rollback_${jobId}`,
        versionBySchemeId: new Map([[snapshot.scheme_id, targetVersion]]),
        authenticityBySchemeId: new Map([
          [snapshot.scheme_id, record.authenticity_score],
        ]),
        failFast: false,
      });

      if (publish[0]?.success) {
        await upsertSchemeCatalogRecord({
          ...record,
          ...snapshot,
          version: targetVersion,
          status: 'active',
          last_verified_at: nowIso(),
          last_published_job_id: `rollback_${jobId}`,
        });
        restored += 1;
      }
      continue;
    }

    await upsertSchemeCatalogRecord({
      ...record,
      status: 'inactive',
      last_verified_at: nowIso(),
      last_published_job_id: `rollback_${jobId}`,
    });
    markedInactive += 1;
  }

  return {
    ok: true,
    message: `Rollback complete for ${jobId}: restored=${restored}, inactive=${markedInactive}`,
  };
}

