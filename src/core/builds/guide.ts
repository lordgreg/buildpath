/**
 * The prose claim check (PLAN-BUILDS.md R1, §12.2).
 *
 * Prose may state a number only through a `{{path|format}}` placeholder, and
 * the formats are a closed set. This module is framework-free and deterministic
 * so the build compiler and the tests agree on what a valid guide is.
 */
export const GUIDE_SECTIONS = ['summary', 'leveling', 'maps', 'bossing'] as const;
export type GuideSectionId = (typeof GUIDE_SECTIONS)[number];

export type GuideStatus = 'signed' | 'auto-breadth' | 'auto-retry' | 'stale';

export interface GuideSignature {
  by: string;
  at: string;
}

export interface GuideSection {
  text: string;
  status: GuideStatus;
  signed?: GuideSignature | null;
  facts: string[];
  factsHash: string;
}

export type BuildGuide = Record<GuideSectionId, GuideSection>;

export const FORMATS = [
  'dps',
  'k',
  'int',
  'pct',
  'link',
  'lv',
  'res',
  'tier',
  'act',
  'patch',
] as const;
export type GuideFormat = (typeof FORMATS)[number];

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

export function formatGuideValue(value: unknown, format?: string): string | null {
  if (value === undefined || value === null) return null;
  if (!format) return String(value);
  if (!(FORMATS as readonly string[]).includes(format)) return null;
  switch (format as GuideFormat) {
    case 'dps':
    case 'k':
      return typeof value === 'number' ? formatNumber(value) : null;
    case 'int':
      return typeof value === 'number' ? String(Math.round(value)) : String(value);
    case 'pct':
      return typeof value === 'number' ? `${Math.round(value)}%` : null;
    case 'link':
      return typeof value === 'number' ? `${Math.round(value)}-link` : String(value);
    case 'lv':
      return String(value);
    case 'res':
      return typeof value === 'number' ? `${Math.round(value)}%` : null;
    case 'tier':
      return typeof value === 'number' ? `T${Math.round(value)}` : String(value);
    case 'act':
      return typeof value === 'number' ? `Act ${Math.round(value)}` : String(value);
    case 'patch':
      return String(value);
  }
}

export function getGuidePath(source: unknown, path: string): unknown {
  let cursor: unknown = source;
  for (const segment of path.split('.')) {
    if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_.-]+)(?:\|([a-z]+))?\s*\}\}/g;

export interface ResolvedProse {
  text: string;
  errors: string[];
}

/** Replaces every placeholder with a value from the build; any miss is an error. */
export function resolveProse(raw: string, build: unknown): ResolvedProse {
  const errors: string[] = [];
  const text = raw.replace(PLACEHOLDER, (whole, path: string, format?: string) => {
    const value = getGuidePath(build, path);
    const formatted = formatGuideValue(value, format);
    if (formatted === null) {
      errors.push(`unresolved placeholder ${whole}`);
      return whole;
    }
    return formatted;
  });
  return { text, errors };
}

/**
 * Raw prose may contain digits only inside the closed token set. Placeholders
 * are removed first; the remaining allowed forms are T<n>, <n>-link, <n>/<n>,
 * Act <n>, a patch version and +<n>.
 */
export function validateProseDigits(raw: string): string[] {
  const failures: string[] = [];
  const withoutPlaceholders = raw.replace(PLACEHOLDER, '');
  const allowed = /\bT\d+\b|\b\d+-link\b|\b\d+\/\d+\b|\bAct \d+\b|\b\d+\.\d+\.\d+\b|\+\d+\b/g;
  const stripped = withoutPlaceholders.replace(allowed, '');
  const match = stripped.match(/\d[\d.,]*/);
  if (match) failures.push(`raw number "${match[0]}" is not a placeholder or allowed token`);
  return failures;
}

/** Every declared fact path must resolve; an empty declarations list is legal. */
export function validateFacts(build: unknown, facts: string[]): string[] {
  const errors: string[] = [];
  for (const path of facts) {
    if (getGuidePath(build, path) === undefined) {
      errors.push(`declared fact "${path}" does not resolve`);
    }
  }
  return errors;
}
