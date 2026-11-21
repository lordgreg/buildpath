import economy from '../../../generated/economy.json';
import { SLOT_STYLES, type Rule } from '../types.ts';

function highValueBases(): string[] {
  return Object.entries(economy.tiers.uniqueBase)
    .filter(([, tier]) => tier === 1)
    .map(([baseType]) => baseType)
    .sort();
}

const TOP_BASES = highValueBases();

/**
 * Unique names are not valid BaseType values. Tiering therefore highlights the
 * bases that carry high-value uniques; the generic rule still catches the rest.
 */
export function uniqueRules(): Rule[] {
  const rules: Rule[] = [];

  if (TOP_BASES.length > 0) {
    rules.push({
      action: 'Show',
      comment: 'Uniques - high-value bases',
      baseTypes: TOP_BASES,
      rarity: 'Unique',
      style: SLOT_STYLES.currencyTop,
    });
  }

  rules.push({
    action: 'Show',
    comment: 'Uniques',
    rarity: 'Unique',
    style: SLOT_STYLES.unique,
  });

  return rules;
}