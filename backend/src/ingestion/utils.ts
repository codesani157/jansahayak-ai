import crypto from 'crypto';
import { OFFICIAL_DOMAIN_SUFFIXES, SCHEME_KEYWORDS } from './config';

export function nowIso(): string {
  return new Date().toISOString();
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function stripHtml(html: string): string {
  return normalizeWhitespace(html.replace(/<[^>]+>/g, ' '));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function canonicalizeUrl(rawUrl: string, baseUrl?: string): string {
  try {
    const url = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
    url.hash = '';
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isOfficialDomain(
  url: string,
  extraAllowedDomains: string[] = [],
): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  if (OFFICIAL_DOMAIN_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return true;
  }
  return extraAllowedDomains.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

export function containsSchemeKeyword(input: string): boolean {
  const text = input.toLowerCase();
  return SCHEME_KEYWORDS.some((k) => text.includes(k));
}

export function inferCategoryFromText(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('farm') || t.includes('agri') || t.includes('crop')) {
    return 'agriculture';
  }
  if (t.includes('scholar') || t.includes('education') || t.includes('student')) {
    return 'education';
  }
  if (t.includes('health') || t.includes('hospital') || t.includes('medical')) {
    return 'health';
  }
  if (t.includes('housing') || t.includes('home')) {
    return 'housing';
  }
  if (t.includes('business') || t.includes('msme') || t.includes('startup')) {
    return 'business';
  }
  if (t.includes('pension') || t.includes('welfare') || t.includes('social')) {
    return 'welfare';
  }
  return 'general';
}

export function stableSchemeId(
  sourceState: string,
  title: string,
  applyUrl: string,
): string {
  const seed = `${sourceState}|${title.toLowerCase()}|${canonicalizeUrl(applyUrl)}`;
  return `auto_${sha256(seed).slice(0, 20)}`;
}

export function excerpt(input: string, max = 240): string {
  const text = normalizeWhitespace(input);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3))}...`;
}

export function parseArg(name: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!found) return null;
  return found.split('=').slice(1).join('=').trim() || null;
}

export function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

