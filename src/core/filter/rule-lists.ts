import type { Rule } from './types.ts';

const LIST_KEYS = ['classNames', 'baseTypes', 'hasExplicitMod'] as const;

/**
 * A list condition that is present but empty matches nothing. The emitter
 * cannot write an empty list, and leaving the line out would turn the block
 * into a catch-all, so such a rule is never emitted or matched.
 */
export function hasEmptyListCondition(rule: Rule): boolean {
  return LIST_KEYS.some((key) => rule[key]?.length === 0);
}
