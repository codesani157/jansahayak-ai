export type SourceType = 'api' | 'portal' | 'seed';

export type ParserStrategy =
  | 'json_list'
  | 'html_catalog'
  | 'xml_sitemap'
  | 'ogd_api'
  | 'apisetu_json'
  | 'seed_static';

export type IngestionJobStatus =
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'FAILED_SAFE';

export type CandidateStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'failed';

export type ChangeClassification =
  | 'NO_CHANGE'
  | 'LOW_RISK_UPDATE'
  | 'HIGH_RISK_UPDATE'
  | 'NEW_SCHEME'
  | 'POTENTIAL_DELETION';

export interface SourceRegistryEntry {
  id: string;
  name: string;
  source_url: string;
  source_type: SourceType;
  parser_strategy: ParserStrategy;
  trust_level: number;
  source_state: string;
  department_hint?: string;
  category_hint?: string;
  allowed_apply_domains?: string[];
  enabled?: boolean;
}

export interface SourceFetchResult {
  source_id: string;
  source_url: string;
  source_state: string;
  source_type: SourceType;
  parser_strategy: ParserStrategy;
  fetched_at: string;
  status: 'success' | 'failed';
  http_status?: number;
  content_type?: string;
  etag?: string | null;
  last_modified?: string | null;
  sha256?: string;
  body?: string;
  error?: string;
}

export interface FieldEvidence {
  field:
  | 'title'
  | 'summary'
  | 'eligibility'
  | 'benefit_amount'
  | 'apply_url'
  | 'department'
  | 'category'
  | 'details'
  | 'general';
  evidence_snippet: string;
  selector_path: string;
  source_url: string;
  fetched_at: string;
}

export interface NormalizedScheme {
  scheme_id: string;
  title: string;
  summary: string;
  eligibility: string;
  benefit_amount: string;
  apply_url: string;
  department: string;
  category: string;
  details?: string;
  deadline?: string;
  source_url: string;
  source_state: string;
  source_type: SourceType;
  source_id: string;
  extraction_confidence: number;
  content_hash: string;
  fetched_at: string;
  evidence: FieldEvidence[];
}

export interface AuthenticityResult {
  scheme_id: string;
  score: number;
  is_authentic: boolean;
  reasons: string[];
  duplicate_key: string;
  required_fields_valid: boolean;
}

export interface CandidateChange {
  scheme_id: string;
  classification: ChangeClassification;
  changed_fields: string[];
  reason: string;
  existing_record?: SchemeCatalogRecord | null;
  next_record?: NormalizedScheme | null;
  authenticity: AuthenticityResult;
  auto_publish_eligible: boolean;
  requires_manual_review: boolean;
}

export interface IngestionCandidateRecord extends CandidateChange {
  candidate_id: string;
  job_id: string;
  status: CandidateStatus;
  evidence_ref?: string | null;
  decision_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchemeCatalogRecord extends NormalizedScheme {
  version: number;
  status: 'active' | 'inactive';
  last_verified_at: string;
  last_published_job_id: string | null;
  authenticity_score: number;
  evidence_ref?: string | null;
  rollback_snapshot?: NormalizedScheme | null;
  rollback_version?: number | null;
}

export interface SourceFetchAuditRecord {
  id: string;
  job_id: string;
  source_id: string;
  source_url: string;
  source_state: string;
  status: 'success' | 'failed';
  http_status?: number;
  content_type?: string;
  etag?: string | null;
  last_modified?: string | null;
  sha256?: string;
  error?: string;
  fetched_at: string;
}

export interface PublishResult {
  scheme_id: string;
  success: boolean;
  error?: string;
  version?: number;
}

export interface IngestionJobReport {
  job_id: string;
  trigger: 'manual' | 'weekly_scheduler';
  started_at: string;
  completed_at: string;
  status: IngestionJobStatus;
  source_count: number;
  fetch_success_count: number;
  fetch_failed_count: number;
  parsed_scheme_count: number;
  unique_scheme_count: number;
  no_change_count: number;
  auto_publish_count: number;
  manual_review_count: number;
  rejected_auto_publish_count: number;
  potential_deletion_count: number;
  publish_success_count: number;
  publish_failed_count: number;
  failed_sources: string[];
  notes: string[];
}

export interface RunPipelineOptions {
  trigger: 'manual' | 'weekly_scheduler';
  shadow_mode: boolean;
  dry_run: boolean;
  detect_deletions: boolean;
  auto_publish_min_score: number;
  max_source_timeout_ms: number;
  retry_count: number;
}
