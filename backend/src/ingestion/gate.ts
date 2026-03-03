import type { CandidateChange } from './types';

export interface GateResult {
  autoPublish: CandidateChange[];
  manualReview: CandidateChange[];
  skipped: CandidateChange[];
}

export function applyHybridGate(changes: CandidateChange[]): GateResult {
  const autoPublish: CandidateChange[] = [];
  const manualReview: CandidateChange[] = [];
  const skipped: CandidateChange[] = [];

  for (const change of changes) {
    if (change.classification === 'NO_CHANGE') {
      skipped.push(change);
      continue;
    }

    if (
      change.classification === 'LOW_RISK_UPDATE' &&
      change.auto_publish_eligible &&
      !change.requires_manual_review
    ) {
      autoPublish.push(change);
      continue;
    }

    manualReview.push(change);
  }

  return { autoPublish, manualReview, skipped };
}

