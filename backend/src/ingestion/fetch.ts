import { INGESTION_DEFAULTS } from './config';
import type { SourceFetchResult, SourceRegistryEntry } from './types';
import { nowIso, sha256, sleep } from './utils';

interface FetchOptions {
  timeoutMs: number;
  retryCount: number;
}

async function fetchOnce(
  source: SourceRegistryEntry,
  timeoutMs: number,
): Promise<SourceFetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const acceptHeader =
    source.parser_strategy === 'xml_sitemap'
      ? 'application/xml,text/xml,text/plain,*/*'
      : source.source_type === 'api'
        ? 'application/json,text/plain,*/*'
        : 'text/html,application/xhtml+xml,*/*';

  try {
    const response = await fetch(source.source_url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'GovGuideIngestionBot/1.0 (+https://govguide.local)',
        Accept: acceptHeader,
      },
    });

    const body = await response.text();
    const digest = sha256(body);

    return {
      source_id: source.id,
      source_url: source.source_url,
      source_state: source.source_state,
      source_type: source.source_type,
      parser_strategy: source.parser_strategy,
      fetched_at: nowIso(),
      status: response.ok ? 'success' : 'failed',
      http_status: response.status,
      content_type: response.headers.get('content-type') ?? undefined,
      etag: response.headers.get('etag'),
      last_modified: response.headers.get('last-modified'),
      sha256: digest,
      body,
      error: response.ok
        ? undefined
        : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      source_id: source.id,
      source_url: source.source_url,
      source_state: source.source_state,
      source_type: source.source_type,
      parser_strategy: source.parser_strategy,
      fetched_at: nowIso(),
      status: 'failed',
      error: `Fetch error: ${message}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchSourceWithRetry(
  source: SourceRegistryEntry,
  options: FetchOptions,
): Promise<SourceFetchResult> {
  let lastResult: SourceFetchResult | null = null;

  for (let attempt = 0; attempt <= options.retryCount; attempt++) {
    const result = await fetchOnce(source, options.timeoutMs);
    if (result.status === 'success') return result;

    lastResult = result;
    if (attempt < options.retryCount) {
      const waitMs = (attempt + 1) * 1000;
      await sleep(waitMs);
    }
  }

  return (
    lastResult ?? {
      source_id: source.id,
      source_url: source.source_url,
      source_state: source.source_state,
      source_type: source.source_type,
      parser_strategy: source.parser_strategy,
      fetched_at: nowIso(),
      status: 'failed',
      error: 'Unknown fetch failure',
    }
  );
}

export async function fetchAllSources(
  sources: SourceRegistryEntry[],
  options: Partial<FetchOptions> = {},
): Promise<SourceFetchResult[]> {
  const timeoutMs = options.timeoutMs ?? INGESTION_DEFAULTS.MAX_SOURCE_TIMEOUT_MS;
  const retryCount = options.retryCount ?? INGESTION_DEFAULTS.RETRY_COUNT;

  const results: SourceFetchResult[] = [];
  for (const source of sources) {
    const result = await fetchSourceWithRetry(source, { timeoutMs, retryCount });
    results.push(result);
    await sleep(INGESTION_DEFAULTS.FETCH_DELAY_MS);
  }
  return results;
}
