import * as fs from 'fs';
import * as path from 'path';
import type {
  FieldEvidence,
  NormalizedScheme,
  SourceFetchResult,
  SourceRegistryEntry,
} from './types';
import {
  canonicalizeUrl,
  containsSchemeKeyword,
  excerpt,
  inferCategoryFromText,
  normalizeWhitespace,
  sha256,
  stableSchemeId,
  stripHtml,
} from './utils';

interface ParseOutput {
  schemes: NormalizedScheme[];
  parserErrors: string[];
}

interface SeedScheme {
  id: string;
  title: string;
  summary: string;
  eligibility: string;
  benefit_amount: string;
  apply_url: string;
  department: string;
  category: string;
  details?: string;
}

const DEFAULT_ELIGIBILITY =
  'Check eligibility criteria on the official government portal.';
const DEFAULT_BENEFIT =
  'Please check the official scheme page for the latest benefit amount.';

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function createEvidence(
  field: FieldEvidence['field'],
  snippet: string,
  selectorPath: string,
  sourceUrl: string,
  fetchedAt: string,
): FieldEvidence {
  return {
    field,
    evidence_snippet: excerpt(snippet, 300),
    selector_path: selectorPath,
    source_url: sourceUrl,
    fetched_at: fetchedAt,
  };
}

function estimateHtmlConfidence(title: string, href: string, summary: string): number {
  let score = 0.55;
  if (containsSchemeKeyword(title)) score += 0.15;
  if (containsSchemeKeyword(href)) score += 0.1;
  if (summary.length > 50) score += 0.05;
  if (summary.length > 120) score += 0.05;
  return Math.min(score, 0.95);
}

function extractFromHtml(
  fetchResult: SourceFetchResult,
  source: SourceRegistryEntry,
): ParseOutput {
  const body = fetchResult.body ?? '';
  const schemes: NormalizedScheme[] = [];
  const parserErrors: string[] = [];

  const anchorRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();

  let match: RegExpExecArray | null = anchorRegex.exec(body);
  while (match) {
    const hrefRaw = decodeHtmlEntities(match[1] ?? '').trim();
    const anchorHtml = match[2] ?? '';
    const anchorText = normalizeWhitespace(decodeHtmlEntities(stripHtml(anchorHtml)));

    const hrefLower = hrefRaw.toLowerCase();
    const textLower = anchorText.toLowerCase();
    const isCandidate =
      containsSchemeKeyword(textLower) ||
      containsSchemeKeyword(hrefLower) ||
      hrefLower.includes('/scheme') ||
      hrefLower.includes('/yojana');

    if (
      isCandidate &&
      !hrefLower.startsWith('javascript:') &&
      !hrefLower.startsWith('#') &&
      anchorText.length >= 4
    ) {
      const applyUrl = canonicalizeUrl(hrefRaw, source.source_url);
      const dedupeKey = `${anchorText.toLowerCase()}|${applyUrl.toLowerCase()}`;

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);

        const rawContext = body.slice(
          Math.max(0, match.index - 220),
          Math.min(body.length, match.index + 220),
        );
        const summary = excerpt(stripHtml(decodeHtmlEntities(rawContext)), 260);
        const cleanSummary =
          summary.length >= 30
            ? summary
            : `Official listing found on ${source.name}. Visit the source page for complete scheme details.`;

        const schemeId = stableSchemeId(source.source_state, anchorText, applyUrl);
        const confidence = estimateHtmlConfidence(anchorText, hrefRaw, cleanSummary);
        const category = source.category_hint ?? inferCategoryFromText(anchorText);

        schemes.push({
          scheme_id: schemeId,
          title: anchorText,
          summary: cleanSummary,
          eligibility: DEFAULT_ELIGIBILITY,
          benefit_amount: DEFAULT_BENEFIT,
          apply_url: applyUrl,
          department: source.department_hint ?? source.name,
          category,
          details: `Auto-extracted from ${source.name}`,
          source_url: source.source_url,
          source_state: source.source_state,
          source_type: source.source_type,
          source_id: source.id,
          extraction_confidence: confidence,
          content_hash: sha256(
            `${anchorText}|${cleanSummary}|${DEFAULT_ELIGIBILITY}|${DEFAULT_BENEFIT}|${applyUrl}`,
          ),
          fetched_at: fetchResult.fetched_at,
          evidence: [
            createEvidence(
              'title',
              anchorText,
              'html:a[href]',
              source.source_url,
              fetchResult.fetched_at,
            ),
            createEvidence(
              'summary',
              cleanSummary,
              'html:context',
              source.source_url,
              fetchResult.fetched_at,
            ),
            createEvidence(
              'apply_url',
              applyUrl,
              'html:a@href',
              source.source_url,
              fetchResult.fetched_at,
            ),
          ],
        });
      }
    }

    if (schemes.length >= 60) {
      break;
    }

    match = anchorRegex.exec(body);
  }

  if (schemes.length === 0) {
    parserErrors.push(`No schemes extracted from HTML source ${source.id}`);
  }

  return { schemes, parserErrors };
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') return normalizeWhitespace(value);
  if (typeof value === 'number') return String(value);
  return '';
}

function pickFirstString(
  obj: Record<string, unknown>,
  keys: string[],
  fallback = '',
): string {
  for (const key of keys) {
    const val = toStringValue(obj[key]);
    if (val) return val;
  }
  return fallback;
}

function extractArrayPayload(input: unknown): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    return input.filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null);
  }
  if (typeof input !== 'object' || input === null) return [];

  const obj = input as Record<string, unknown>;
  const keys = ['schemes', 'data', 'items', 'results', 'records'];
  for (const key of keys) {
    if (Array.isArray(obj[key])) {
      return (obj[key] as unknown[]).filter(
        (i): i is Record<string, unknown> => typeof i === 'object' && i !== null,
      );
    }
  }
  return [];
}

function extractFromJson(
  fetchResult: SourceFetchResult,
  source: SourceRegistryEntry,
): ParseOutput {
  const parserErrors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(fetchResult.body ?? '');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { schemes: [], parserErrors: [`JSON parse failed for ${source.id}: ${message}`] };
  }

  const rows = extractArrayPayload(parsed);
  const schemes: NormalizedScheme[] = [];
  for (const row of rows) {
    const title = pickFirstString(row, ['title', 'name', 'scheme_name', 'schemeTitle']);
    const applyUrl = canonicalizeUrl(
      pickFirstString(row, ['apply_url', 'url', 'link', 'official_url'], source.source_url),
      source.source_url,
    );
    if (!title || !applyUrl) continue;

    const summary = pickFirstString(
      row,
      ['summary', 'description', 'overview'],
      `Official listing found on ${source.name}.`,
    );
    const eligibility = pickFirstString(
      row,
      ['eligibility', 'who_can_apply'],
      DEFAULT_ELIGIBILITY,
    );
    const benefitAmount = pickFirstString(
      row,
      ['benefit_amount', 'benefit', 'amount'],
      DEFAULT_BENEFIT,
    );
    const department = pickFirstString(
      row,
      ['department', 'ministry'],
      source.department_hint ?? source.name,
    );
    const category = pickFirstString(
      row,
      ['category'],
      source.category_hint ?? inferCategoryFromText(title),
    );
    const details = pickFirstString(row, ['details', 'notes']);
    const deadline = pickFirstString(row, ['deadline', 'last_date'], '');
    const confidence = 0.85;
    const schemeId =
      pickFirstString(row, ['scheme_id', 'id'], '') ||
      stableSchemeId(source.source_state, title, applyUrl);

    schemes.push({
      scheme_id: schemeId,
      title,
      summary,
      eligibility,
      benefit_amount: benefitAmount,
      apply_url: applyUrl,
      department,
      category,
      details: details || undefined,
      deadline: deadline || undefined,
      source_url: source.source_url,
      source_state: source.source_state,
      source_type: source.source_type,
      source_id: source.id,
      extraction_confidence: confidence,
      content_hash: sha256(
        `${title}|${summary}|${eligibility}|${benefitAmount}|${applyUrl}`,
      ),
      fetched_at: fetchResult.fetched_at,
      evidence: [
        createEvidence(
          'general',
          JSON.stringify(row).slice(0, 600),
          'json:item',
          source.source_url,
          fetchResult.fetched_at,
        ),
      ],
    });
  }

  if (schemes.length === 0) {
    parserErrors.push(`No schemes extracted from JSON source ${source.id}`);
  }

  return { schemes, parserErrors };
}

function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] ?? parsed.hostname;
    const base = last.replace(/\.(html|php|aspx|jsp|xml)$/i, '');
    const clean = decodeURIComponent(base)
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return 'Government Scheme';
    return clean
      .split(' ')
      .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
      .join(' ');
  } catch {
    return 'Government Scheme';
  }
}

function extractFromXmlSitemap(
  fetchResult: SourceFetchResult,
  source: SourceRegistryEntry,
): ParseOutput {
  const xml = fetchResult.body ?? '';
  const parserErrors: string[] = [];
  const locs = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((m) => normalizeWhitespace(decodeHtmlEntities(m[1] ?? '')))
    .filter(Boolean);

  if (locs.length === 0) {
    return {
      schemes: [],
      parserErrors: [`No <loc> entries found in XML sitemap for ${source.id}`],
    };
  }

  const keywordRegex =
    /(?:^|[\/\-_])(scheme|yojana|benefit|welfare|subsidy|scholarship|grant|loan|pension)(?:$|[\/\-_])/i;

  const pageUrls = Array.from(
    new Set(locs.filter((u) => !u.toLowerCase().endsWith('.xml'))),
  );

  let filtered = pageUrls.filter((url) => {
    try {
      const pathName = new URL(url).pathname.toLowerCase();
      return (
        keywordRegex.test(pathName) ||
        pathName.includes('/find-scheme') ||
        pathName.includes('/scheme')
      );
    } catch {
      return false;
    }
  });

  if (filtered.length === 0) {
    filtered = pageUrls.slice(0, 30);
    parserErrors.push(
      `No explicit scheme-like URLs found in sitemap for ${source.id}; using fallback top entries.`,
    );
  }

  const schemes: NormalizedScheme[] = filtered.slice(0, 120).map((url) => {
    const title = titleFromUrl(url);
    const summary = `Official listing from ${source.name}. Verify the complete scheme details on the source link.`;
    const schemeId = stableSchemeId(source.source_state, title, url);
    return {
      scheme_id: schemeId,
      title,
      summary,
      eligibility: DEFAULT_ELIGIBILITY,
      benefit_amount: DEFAULT_BENEFIT,
      apply_url: canonicalizeUrl(url),
      department: source.department_hint ?? source.name,
      category: source.category_hint ?? inferCategoryFromText(`${title} ${url}`),
      details: `Discovered from XML sitemap (${source.source_url})`,
      source_url: source.source_url,
      source_state: source.source_state,
      source_type: source.source_type,
      source_id: source.id,
      extraction_confidence: 0.88,
      content_hash: sha256(`${title}|${url}|${source.source_url}`),
      fetched_at: fetchResult.fetched_at,
      evidence: [
        createEvidence(
          'title',
          title,
          'xml:loc->title',
          source.source_url,
          fetchResult.fetched_at,
        ),
        createEvidence(
          'apply_url',
          url,
          'xml:loc',
          source.source_url,
          fetchResult.fetched_at,
        ),
      ],
    };
  });

  return { schemes, parserErrors };
}

export function normalizeFetchedSource(
  fetchResult: SourceFetchResult,
  source: SourceRegistryEntry,
): ParseOutput {
  if (fetchResult.status !== 'success' || !fetchResult.body) {
    return {
      schemes: [],
      parserErrors: [`Cannot parse source ${source.id}; fetch failed or empty body`],
    };
  }

  if (source.parser_strategy === 'json_list') {
    return extractFromJson(fetchResult, source);
  }
  if (source.parser_strategy === 'xml_sitemap') {
    return extractFromXmlSitemap(fetchResult, source);
  }
  if (source.parser_strategy === 'seed_static') {
    return { schemes: [], parserErrors: [] };
  }
  return extractFromHtml(fetchResult, source);
}

export function normalizeSeedSchemesFromFile(
  filePath: string,
  sourceId = 'manual_seed',
): NormalizedScheme[] {
  const absolutePath = path.resolve(filePath);
  const raw = fs.readFileSync(absolutePath, 'utf-8');
  const rows = JSON.parse(raw) as SeedScheme[];
  const now = new Date().toISOString();

  return rows.map((row) => ({
    scheme_id: row.id,
    title: row.title,
    summary: row.summary,
    eligibility: row.eligibility,
    benefit_amount: row.benefit_amount,
    apply_url: canonicalizeUrl(row.apply_url),
    department: row.department,
    category: row.category,
    details: row.details,
    source_url: row.apply_url,
    source_state: 'central',
    source_type: 'seed',
    source_id: sourceId,
    extraction_confidence: 1,
    content_hash: sha256(
      `${row.title}|${row.summary}|${row.eligibility}|${row.benefit_amount}|${row.apply_url}`,
    ),
    fetched_at: now,
    evidence: [
      {
        field: 'general',
        evidence_snippet: 'Seeded from curated local dataset',
        selector_path: 'seed:file',
        source_url: row.apply_url,
        fetched_at: now,
      },
    ],
  }));
}
