import economy from '../../../generated/economy.json';
import { SLOT_STYLES, type Rule } from '../types.ts';

function highValueBases(): string[] {
  return Object.entries(economy.tiers.uniqueBase)
    .filter(([, tier]) => tier === 1)
    .map(([baseType]) => baseType)
    .sort();
}

const TOP_BASES = highValueBases();

const JEWEL_CLASSES = ['Jewels', 'Abyss Jewels'];

/** Tier-1 unique bases that are jewels, e.g. Prismatic or Cobalt. */
const TOP_JEWEL_BASES = TOP_BASES.filter((baseType) =>
  baseType.endsWith('Jewel'),
);

/**
 * Unique names are not valid BaseType values. Tiering therefore highlights the
 * bases that carry high-value uniques; the generic rule still catches the rest.
 */
export function uniqueRules(): Rule[] {
  const rules: Rule[] = [];

  if (TOP_JEWEL_BASES.length > 0) {
    rules.push({
      action: 'Show',
      comment: 'Uniques - best jewels',
      baseTypes: TOP_JEWEL_BASES,
      rarity: 'Unique',
      styleKind: 'jewel-best',
      style: SLOT_STYLES.unique,
    });
  }

  if (TOP_BASES.length > 0) {
    rules.push({
      action: 'Show',
      comment: 'Uniques - high-value bases',
      baseTypes: TOP_BASES,
      rarity: 'Unique',
      styleKind: 's-tier',
      style: SLOT_STYLES.currencyTop,
    });
  }

  rules.push({
    action: 'Show',
    comment: 'Uniques - jewels',
    classNames: JEWEL_CLASSES,
    rarity: 'Unique',
    styleKind: 'jewel',
    style: SLOT_STYLES.unique,
  });

  rules.push({
    action: 'Show',
    comment: 'Uniques',
    rarity: 'Unique',
    styleKind: 'unique',
    style: SLOT_STYLES.unique,
  });

  return rules;
}
