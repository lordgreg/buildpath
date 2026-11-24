import { baseTypes } from '../data/base-types.ts';
import { toFilterClass } from '../filter/classes.ts';
import type { Range, Rule } from '../filter/types.ts';
import type { RuleTemplate } from './templates.ts';

const CLASS_BY_BASE = new Map(
  baseTypes.map((base) => [base.name, toFilterClass(base.itemClass)]),
);

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

function rangeCovers(cover: Range, target: Range): boolean {
  if (
    cover.min !== undefined &&
    (target.min === undefined || cover.min > target.min)
  ) {
    return false;
  }
  if (
    cover.max !== undefined &&
    (target.max === undefined || cover.max < target.max)
  ) {
    return false;
  }
  return true;
}

function namesCover(
  cover: readonly string[],
  target: readonly string[],
): boolean {
  const allowed = new Set(cover);
  return target.every((name) => allowed.has(name));
}

/** The game matches an explicit mod whose name contains the filter value. */
function modsCover(
  cover: readonly string[],
  target: readonly string[],
): boolean {
  const allowed = cover.map((name) => name.toLowerCase());
  return target.every((name) => {
    const lower = name.toLowerCase();
    return allowed.some((value) => lower.includes(value));
  });
}

/** True when every item matched by `target` is also matched by `cover`. */
export function ruleCovers(cover: Rule, target: Rule): boolean {
  if (cover.action !== target.action) return false;
  if (cover.disabled) return false;

  if (cover.rarity && cover.rarity !== target.rarity) return false;
  if (cover.corrupted !== undefined && cover.corrupted !== target.corrupted) {
    return false;
  }
  if (cover.identified !== undefined && cover.identified !== target.identified) {
    return false;
  }
  if (cover.hasExplicitMod?.length) {
    if (!target.hasExplicitMod?.length) return false;
    if (!modsCover(cover.hasExplicitMod, target.hasExplicitMod)) return false;
  }

  if (cover.classNames) {
    if (!target.classNames) return false;
    if (!namesCover(cover.classNames, target.classNames)) return false;
  }

  if (cover.baseTypes) {
    if (!target.baseTypes) return false;
    if (!namesCover(cover.baseTypes, target.baseTypes)) return false;
  }

  for (const key of RANGE_KEYS) {
    const bound = cover[key];
    if (!bound) continue;
    const targetBound = target[key];
    if (targetBound) {
      if (!rangeCovers(bound, targetBound)) return false;
      continue;
    }
    // Six sockets guarantee a six-link, so Sockets >= 6 covers LinkedSockets >= 6.
    if (key === 'sockets' && target.linkedSockets) {
      if (
        bound.min !== undefined &&
        (target.linkedSockets.min === undefined ||
          bound.min > target.linkedSockets.min)
      ) {
        return false;
      }
      if (bound.max !== undefined) return false;
      continue;
    }
    return false;
  }

  return true;
}

function rangesIntersect(a: Range, b: Range): boolean {
  const aMin = a.min ?? Number.NEGATIVE_INFINITY;
  const aMax = a.max ?? Number.POSITIVE_INFINITY;
  const bMin = b.min ?? Number.NEGATIVE_INFINITY;
  const bMax = b.max ?? Number.POSITIVE_INFINITY;
  return aMin <= bMax && bMin <= aMax;
}

function shareName(a: readonly string[], b: readonly string[]): boolean {
  const names = new Set(b);
  return a.some((name) => names.has(name));
}

/** Classes a base-type list can resolve to; empty when none are known. */
function classesOf(bases: readonly string[]): string[] {
  const classes = new Set<string>();
  for (const base of bases) {
    const itemClass = CLASS_BY_BASE.get(base);
    if (itemClass) classes.add(itemClass);
  }
  return [...classes];
}

function targetsIntersect(a: Rule, b: Rule): boolean {
  const aBases = a.baseTypes ?? [];
  const bBases = b.baseTypes ?? [];
  const aClasses = a.classNames ?? [];
  const bClasses = b.classNames ?? [];

  if (aBases.length && bBases.length) return shareName(aBases, bBases);
  if (aClasses.length && bClasses.length) return shareName(aClasses, bClasses);

  if (aBases.length && bClasses.length) {
    const classes = classesOf(aBases);
    return classes.length === 0 || classes.some((name) => bClasses.includes(name));
  }
  if (aClasses.length && bBases.length) {
    const classes = classesOf(bBases);
    return classes.length === 0 || classes.some((name) => aClasses.includes(name));
  }

  // At most one side is constrained, so one rule is the broader match.
  return true;
}

/**
 * True when two rules can match the same item, ignoring the action. This is
 * what "overrides" means for a custom rule: it is evaluated before the preset,
 * so any preset rule it can match is shadowed. A hidden rule can never match,
 * so it never overlaps.
 */
export function rulesOverlap(a: Rule, b: Rule): boolean {
  if (a.disabled || b.disabled) return false;
  if (a.rarity && b.rarity && a.rarity !== b.rarity) return false;
  if (
    a.corrupted !== undefined &&
    b.corrupted !== undefined &&
    a.corrupted !== b.corrupted
  ) {
    return false;
  }
  if (
    a.identified !== undefined &&
    b.identified !== undefined &&
    a.identified !== b.identified
  ) {
    return false;
  }
  if (!targetsIntersect(a, b)) return false;

  for (const key of RANGE_KEYS) {
    const aBound = a[key];
    const bBound = b[key];
    if (aBound && bBound && !rangesIntersect(aBound, bBound)) return false;
  }

  return true;
}

function baseCovered(base: string, rule: Rule, presetRules: readonly Rule[]) {
  return presetRules.some((preset) =>
    ruleCovers(preset, { ...rule, baseTypes: [base] }),
  );
}

function classCovered(name: string, rule: Rule, presetRules: readonly Rule[]) {
  return presetRules.some((preset) =>
    ruleCovers(preset, { ...rule, classNames: [name] }),
  );
}

/**
 * Coverage is intentionally conservative: Hide templates and templates that
 * rely on overlap tricks are not reported as covered.
 */
export function ruleCoveredByPreset(
  rule: Rule,
  presetRules: readonly Rule[],
): boolean {
  if (rule.action !== 'Show') return false;

  if (!rule.rarity) {
    return (['Normal', 'Magic', 'Rare', 'Unique'] as const).every((rarity) =>
      ruleCoveredByPreset({ ...rule, rarity }, presetRules),
    );
  }

  if (rule.baseTypes?.length) {
    return rule.baseTypes.every((base) =>
      baseCovered(base, rule, presetRules),
    );
  }

  if (rule.classNames?.length) {
    return rule.classNames.every((name) =>
      classCovered(name, rule, presetRules),
    );
  }

  return presetRules.some((preset) => ruleCovers(preset, rule));
}

export function templateIsCovered(
  template: RuleTemplate,
  presetRules: readonly Rule[],
): boolean {
  if (template.rules.length === 0) return false;
  return template.rules.every(
    (rule) => rule.action === 'Show' && ruleCoveredByPreset(rule, presetRules),
  );
}