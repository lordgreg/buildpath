import { SLOT_STYLES, type Rule } from '../types.ts';

/**
 * Unique names are not valid BaseType values. Until M2b adds base-level
 * tiering from prices, all uniques share one rule.
 */
export function uniqueRules(): Rule[] {
  return [
    {
      action: 'Show',
      comment: 'Uniques',
      rarity: 'Unique',
      style: SLOT_STYLES.unique,
    },
  ];
}