import { CRITICAL_FIELDS, NON_CRITICAL_FIELDS } from './config';
import type {
  AuthenticityResult,
  CandidateChange,
  NormalizedScheme,
  SchemeCatalogRecord,
} from './types';
import { nowIso } from './utils';

interface DiffInput {
  extractedSchemes: NormalizedScheme[];
  authenticityBySchemeId: Map<string, AuthenticityResult>;
  catalogBySchemeId: Map<string, SchemeCatalogRecord>;
  successfulSourceIds: Set<string>;
  autoPublishMinScore: number;
  detectDeletions: boolean;
}

function changedFields(
  previous: SchemeCatalogRecord,
  next: NormalizedScheme,
): string[] {
  const fields: Array<keyof NormalizedScheme> = [
    ...CRITICAL_FIELDS,
    ...NON_CRITICAL_FIELDS,
  ];
  const changed: string[] = [];
  for (const field of fields) {
    const prevVal = String(previous[field] ?? '').trim();
    const nextVal = String(next[field] ?? '').trim();
    if (prevVal !== nextVal) changed.push(field);
  }
  return changed;
}

function isCriticalField(field: string): boolean {
  return (CRITICAL_FIELDS as readonly string[]).includes(field);
}

function pickBestByAuthenticity(
  schemes: NormalizedScheme[],
  authenticityBySchemeId: Map<string, AuthenticityResult>,
): NormalizedScheme[] {
  const best = new Map<string, NormalizedScheme>();
  for (const scheme of schemes) {
    const currentBest = best.get(scheme.scheme_id);
    if (!currentBest) {
      best.set(scheme.scheme_id, scheme);
      continue;
    }
    const scoreA = authenticityBySchemeId.get(scheme.scheme_id)?.score ?? 0;
    const scoreB = authenticityBySchemeId.get(currentBest.scheme_id)?.score ?? 0;
    if (scoreA >= scoreB) {
      best.set(scheme.scheme_id, scheme);
    }
  }
  return Array.from(best.values());
}

export function classifyChanges(input: DiffInput): CandidateChange[] {
  const {
    extractedSchemes,
    authenticityBySchemeId,
    catalogBySchemeId,
    successfulSourceIds,
    autoPublishMinScore,
    detectDeletions,
  } = input;

  const changes: CandidateChange[] = [];
  const extracted = pickBestByAuthenticity(
    extractedSchemes,
    authenticityBySchemeId,
  );
  const extractedIds = new Set<string>();

  for (const scheme of extracted) {
    extractedIds.add(scheme.scheme_id);
    const authenticity =
      authenticityBySchemeId.get(scheme.scheme_id) ??
      ({
        scheme_id: scheme.scheme_id,
        score: 0,
        is_authentic: false,
        reasons: ['Missing authenticity score'],
        duplicate_key: '',
        required_fields_valid: false,
      } satisfies AuthenticityResult);

    const existing = catalogBySchemeId.get(scheme.scheme_id);
    if (!existing) {
      changes.push({
        scheme_id: scheme.scheme_id,
        classification: 'NEW_SCHEME',
        changed_fields: [],
        reason: 'Scheme does not exist in canonical catalog',
        existing_record: null,
        next_record: scheme,
        authenticity,
        auto_publish_eligible: false,
        requires_manual_review: true,
      });
      continue;
    }

    const changed = changedFields(existing, scheme);
    if (changed.length === 0) {
      changes.push({
        scheme_id: scheme.scheme_id,
        classification: 'NO_CHANGE',
        changed_fields: [],
        reason: 'No differences from canonical catalog',
        existing_record: existing,
        next_record: scheme,
        authenticity,
        auto_publish_eligible: false,
        requires_manual_review: false,
      });
      continue;
    }

    const hasCritical = changed.some(isCriticalField);
    if (hasCritical) {
      changes.push({
        scheme_id: scheme.scheme_id,
        classification: 'HIGH_RISK_UPDATE',
        changed_fields: changed,
        reason: 'Critical fields changed',
        existing_record: existing,
        next_record: scheme,
        authenticity,
        auto_publish_eligible: false,
        requires_manual_review: true,
      });
      continue;
    }

    const onlyNonCritical = changed.every((f) =>
      (NON_CRITICAL_FIELDS as readonly string[]).includes(f),
    );
    const authenticEnough = authenticity.score >= autoPublishMinScore;

    if (onlyNonCritical) {
      changes.push({
        scheme_id: scheme.scheme_id,
        classification: 'LOW_RISK_UPDATE',
        changed_fields: changed,
        reason: authenticEnough
          ? 'Non-critical fields changed and authenticity threshold met'
          : 'Non-critical fields changed but authenticity threshold not met',
        existing_record: existing,
        next_record: scheme,
        authenticity,
        auto_publish_eligible: authenticEnough,
        requires_manual_review: !authenticEnough,
      });
      continue;
    }

    changes.push({
      scheme_id: scheme.scheme_id,
      classification: 'HIGH_RISK_UPDATE',
      changed_fields: changed,
      reason: 'Unclassified field changes detected',
      existing_record: existing,
      next_record: scheme,
      authenticity,
      auto_publish_eligible: false,
      requires_manual_review: true,
    });
  }

  if (detectDeletions) {
    for (const [schemeId, existing] of catalogBySchemeId) {
      if (existing.status !== 'active') continue;
      if (extractedIds.has(schemeId)) continue;
      if (!existing.source_id || !successfulSourceIds.has(existing.source_id)) {
        continue;
      }

      changes.push({
        scheme_id: schemeId,
        classification: 'POTENTIAL_DELETION',
        changed_fields: [],
        reason: `Scheme missing from latest successful source pull (${nowIso()})`,
        existing_record: existing,
        next_record: null,
        authenticity: {
          scheme_id: schemeId,
          score: existing.authenticity_score,
          is_authentic: true,
          reasons: ['Derived from canonical record'],
          duplicate_key: '',
          required_fields_valid: true,
        },
        auto_publish_eligible: false,
        requires_manual_review: true,
      });
    }
  }

  return changes;
}
