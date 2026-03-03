import type {
  AuthenticityResult,
  NormalizedScheme,
  SourceRegistryEntry,
} from './types';
import { canonicalizeUrl, isOfficialDomain, normalizeWhitespace } from './utils';

function requiredFieldsValid(scheme: NormalizedScheme): boolean {
  return Boolean(
    scheme.scheme_id &&
      scheme.title &&
      scheme.summary &&
      scheme.eligibility &&
      scheme.benefit_amount &&
      scheme.apply_url &&
      scheme.department &&
      scheme.category &&
      scheme.source_url &&
      scheme.source_state,
  );
}

function duplicateKeyFor(scheme: NormalizedScheme): string {
  return `${normalizeWhitespace(scheme.title).toLowerCase()}|${canonicalizeUrl(
    scheme.apply_url,
  ).toLowerCase()}`;
}

export function runAuthenticityChecks(
  schemes: NormalizedScheme[],
  registryById: Map<string, SourceRegistryEntry>,
  minScore: number,
): Map<string, AuthenticityResult> {
  const duplicateCount = new Map<string, number>();
  for (const scheme of schemes) {
    const key = duplicateKeyFor(scheme);
    duplicateCount.set(key, (duplicateCount.get(key) ?? 0) + 1);
  }

  const results = new Map<string, AuthenticityResult>();
  for (const scheme of schemes) {
    const source = registryById.get(scheme.source_id);
    let score = source?.trust_level ?? 60;
    const reasons: string[] = [];

    if (!requiredFieldsValid(scheme)) {
      score -= 40;
      reasons.push('Missing required fields');
    }

    if (!isOfficialDomain(scheme.source_url)) {
      score -= 25;
      reasons.push('Source URL is not an official domain');
    }

    const allowedApplyDomains = source?.allowed_apply_domains ?? [];
    if (!isOfficialDomain(scheme.apply_url, allowedApplyDomains)) {
      score -= 25;
      reasons.push('Apply URL is not on an official/allowlisted domain');
    }

    if (scheme.extraction_confidence < 0.6) {
      score -= 15;
      reasons.push('Low extraction confidence');
    } else if (scheme.extraction_confidence >= 0.8) {
      score += 5;
    }

    if (scheme.summary.length < 30) {
      score -= 10;
      reasons.push('Summary text too short');
    }
    if (scheme.eligibility.length < 15) {
      score -= 8;
      reasons.push('Eligibility text too short');
    }
    if (scheme.benefit_amount.length < 5) {
      score -= 8;
      reasons.push('Benefit amount text too short');
    }

    const dupKey = duplicateKeyFor(scheme);
    if ((duplicateCount.get(dupKey) ?? 0) > 1) {
      score -= 20;
      reasons.push('Possible duplicate detected');
    }

    score = Math.max(0, Math.min(100, score));
    const result: AuthenticityResult = {
      scheme_id: scheme.scheme_id,
      score,
      is_authentic: score >= minScore,
      reasons,
      duplicate_key: dupKey,
      required_fields_valid: requiredFieldsValid(scheme),
    };
    results.set(scheme.scheme_id, result);
  }

  return results;
}

