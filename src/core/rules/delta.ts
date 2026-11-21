import type { Rule } from '../filter/types.ts';

export interface SavedRules {
  /** Generated rules at save time. */
  base: Rule[];
  /** The clone the user edited. */
  edited: Rule[];
}

function sameRule(a: Rule, b: Rule): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Rebases a saved rule edit onto the latest generated rule set.
 *
 * - Unchanged base rules take the latest version.
 * - Edited base rules keep the user's version (when the id still exists).
 * - Deleted base rules stay deleted.
 * - Custom rules are kept.
 * - New upstream base rules are appended.
 */
export function rebaseRules(
  saved: SavedRules | undefined,
  latestBase: readonly Rule[],
): Rule[] {
  if (!saved || saved.edited.length === 0) return [...latestBase];

  const oldBase = new Map(
    saved.base.filter((rule) => rule.id).map((rule) => [rule.id!, rule]),
  );
  const latest = new Map(
    latestBase.filter((rule) => rule.id).map((rule) => [rule.id!, rule]),
  );
  const editedIds = new Set(
    saved.edited.filter((rule) => rule.id).map((rule) => rule.id!),
  );

  const result: Rule[] = [];
  for (const rule of saved.edited) {
    if (!rule.id) {
      result.push(rule);
      continue;
    }
    const old = oldBase.get(rule.id);
    if (!old) {
      result.push(rule);
      continue;
    }
    const latestRule = latest.get(rule.id);
    if (!latestRule) continue;
    result.push(sameRule(rule, old) ? latestRule : rule);
  }

  for (const rule of latestBase) {
    if (!rule.id) continue;
    if (!editedIds.has(rule.id) && !oldBase.has(rule.id)) {
      result.push(rule);
    }
  }

  return result;
}