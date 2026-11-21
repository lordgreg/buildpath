import { SLOT_STYLES, type Rule } from '../types.ts';

const TOP_UNIQUES = [
  'Aegis Aurora',
  'Ashes of the Stars',
  'Headhunter',
  'Kalandra\'s Touch',
  'Mageblood',
  'Nimis',
  'Original Sin',
  'Progenesis',
  'The Squire',
  'Voices',
];

export function uniqueRules(): Rule[] {
  return [
    {
      action: 'Show',
      comment: 'Uniques - chase items',
      baseTypes: [...TOP_UNIQUES],
      rarity: 'Unique',
      style: SLOT_STYLES.currencyTop,
    },
    {
      action: 'Show',
      comment: 'Uniques',
      rarity: 'Unique',
      style: SLOT_STYLES.unique,
    },
  ];
}