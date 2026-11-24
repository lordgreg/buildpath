import known from '../data/known-base-types.json';
import type { Rule } from '../filter/types.ts';

const KNOWN_BASES = new Set(known.names);

const LIST_KEYS = ['classNames', 'baseTypes', 'hasExplicitMod'] as const;

const LIST_LABELS: Record<(typeof LIST_KEYS)[number], string> = {
  classNames: 'Classes',
  baseTypes: 'Base types',
  hasExplicitMod: 'Explicit mods',
};

const RANGE_KEYS = [
  'itemLevel',
  'dropLevel',
  'areaLevel',
  'stackSize',
  'quality',
  'sockets',
  'linkedSockets',
  'mapTier',
] as const;

const STRING_KEYS = ['id', 'section', 'comment', 'rarity', 'styleKind'] as const;
const BOOLEAN_KEYS = ['disabled', 'continue', 'corrupted', 'identified'] as const;

/**
 * Drops BaseType names the game no longer accepts.
 *
 * A stored custom rule can predate a data fix (for example a copied preset rule
 * that listed a base since removed from the game). The client refuses the whole
 * filter on the first unknown name, so such a name must never be emitted. Only
 * `baseTypes` is touched; every other condition is left exactly as written.
 */
export function withoutUnknownBases(rules: readonly Rule[]): Rule[] {
  return rules.map((rule) => {
    if (!rule.baseTypes?.length) return rule;
    const baseTypes = rule.baseTypes.filter((name) => KNOWN_BASES.has(name));
    return baseTypes.length === rule.baseTypes.length
      ? rule
      : { ...rule, baseTypes };
  });
}

/**
 * A list condition that is present but empty matches nothing. The emitter
 * cannot write an empty list, and leaving the line out would turn the block
 * into a catch-all, so such a rule is never emitted or matched.
 */
export function hasEmptyListCondition(rule: Rule): boolean {
  return LIST_KEYS.some((key) => rule[key]?.length === 0);
}

/**
 * Why a custom rule cannot be written as it stands, or null when it can. A
 * rule is never written with a condition removed: that would widen it.
 */
export function customRuleProblem(rule: Rule): string | null {
  for (const key of LIST_KEYS) {
    if (rule[key]?.length === 0) {
      return `its ${LIST_LABELS[key]} list is empty. Add a value or delete the rule.`;
    }
  }
  if (rule.baseTypes?.length && !rule.baseTypes.some((name) => KNOWN_BASES.has(name))) {
    return `none of its base types are known (${rule.baseTypes.join(', ')}). Fix the names or delete the rule.`;
  }
  return null;
}

export interface SkippedRule {
  /** Position in the list that was passed in. */
  index: number;
  reason: string;
}

/**
 * Custom rules ready to emit: unknown base names are dropped, and a rule left
 * with an empty list condition is skipped and reported instead of widened.
 */
export function prepareCustomRules(rules: readonly Rule[]): {
  rules: Rule[];
  skipped: SkippedRule[];
} {
  const kept: Rule[] = [];
  const skipped: SkippedRule[] = [];
  rules.forEach((rule, index) => {
    const problem = customRuleProblem(rule);
    if (problem) {
      skipped.push({ index, reason: problem });
      return;
    }
    kept.push(...withoutUnknownBases([rule]));
  });
  return { rules: kept, skipped };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRange(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return (['min', 'max'] as const).every(
    (key) =>
      value[key] === undefined ||
      (typeof value[key] === 'number' && Number.isFinite(value[key])),
  );
}

function isWellFormed(value: unknown): value is Rule {
  if (!isPlainObject(value)) return false;
  if (value.action !== 'Show' && value.action !== 'Hide') return false;
  for (const key of STRING_KEYS) {
    if (value[key] !== undefined && typeof value[key] !== 'string') return false;
  }
  for (const key of BOOLEAN_KEYS) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') return false;
  }
  for (const key of [...LIST_KEYS, 'chips'] as const) {
    const list = value[key];
    if (
      list !== undefined &&
      !(Array.isArray(list) && list.every((entry) => typeof entry === 'string'))
    ) {
      return false;
    }
  }
  for (const key of RANGE_KEYS) {
    if (value[key] !== undefined && !isRange(value[key])) return false;
  }
  if (value.style !== undefined && !isPlainObject(value.style)) return false;
  return true;
}

/**
 * Keeps only structurally sound rules from stored or imported data, so the
 * editor and generator never meet a string where a list belongs. Unknown base
 * names are kept for the editor to show; a rule with a malformed field is
 * dropped whole rather than repaired, since dropping one field could widen it.
 */
export function shapeRules(input: unknown): { rules: Rule[]; dropped: number } {
  if (!Array.isArray(input)) return { rules: [], dropped: 0 };
  const rules = input.filter(isWellFormed);
  return { rules, dropped: input.length - rules.length };
}
