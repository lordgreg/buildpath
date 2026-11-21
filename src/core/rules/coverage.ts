import type { Range, Rule } from '../filter/types.ts';
import type { RuleTemplate } from './templates.ts';

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