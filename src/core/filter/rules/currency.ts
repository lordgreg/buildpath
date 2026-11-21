import economy from '../../../generated/economy.json';
import type { Preset } from '../presets.ts';
import { COLORS, SLOT_STYLES, type Rule } from '../types.ts';

const FALLBACK_TIER_1 = [
  'Divine Orb',
  'Eldritch Chaos Orb',
  'Eldritch Exalted Orb',
  'Eldritch Orb of Annulment',
  'Exalted Orb',
  'Fracturing Orb',
  "Hinekora's Lock",
  'Mirror of Kalandra',
  'Sacred Orb',
];

const FALLBACK_TIER_2 = [
  'Ancient Orb',
  'Blessed Orb',
  "Cartographer's Chisel",
  'Chaos Orb',
  'Chromatic Orb',
  "Gemcutter's Prism",
  "Glassblower's Bauble",
  'Instilling Orb',
  'Enkindling Orb',
  "Jeweller's Orb",
  'Orb of Alchemy',
  'Orb of Alteration',
  'Orb of Annulment',
  'Orb of Binding',
  'Orb of Chance',
  'Orb of Fusing',
  'Orb of Regret',
  'Orb of Scouring',
  'Orb of Unmaking',
  'Prime Regrading Lens',
  'Regal Orb',
  'Secondary Regrading Lens',
  'Tailoring Orb',
  'Tempering Orb',
  'Vaal Orb',
];

const FALLBACK_TIER_3 = [
  "Armourer's Scrap",
  "Blacksmith's Whetstone",
  'Orb of Augmentation',
  'Orb of Transmutation',
  'Perandus Coin',
  'Portal Scroll',
  'Scroll of Wisdom',
];

const FALLBACK_DIVINATION_TOP = [
  'House of Mirrors',
  'The Apothecary',
  'The Doctor',
  'The Fiend',
  'The Nurse',
];

const FALLBACK_DIVINATION_MID = ['Stacked Deck'];

type TierMap = Record<string, number>;

function namesAt(map: TierMap, tier: number): string[] {
  return Object.entries(map)
    .filter(([, value]) => value === tier)
    .map(([name]) => name)
    .sort();
}

function tiersOrFallback(
  map: TierMap,
  fallbacks: [number, string[]][],
): string[][] {
  if (Object.keys(map).length === 0) {
    return fallbacks.map(([, names]) => [...names]);
  }
  return [1, 2, 3].map((tier) => namesAt(map, tier));
}

const tiers = economy.tiers as {
  currency: TierMap;
  fragment: TierMap;
  divination: TierMap;
  uniqueBase: TierMap;
};

const [TIER_1, TIER_2, TIER_3] = tiersOrFallback(tiers.currency, [
  [1, FALLBACK_TIER_1],
  [2, FALLBACK_TIER_2],
  [3, FALLBACK_TIER_3],
]);

const [DIVINATION_TOP, DIVINATION_MID] = tiersOrFallback(
  tiers.divination,
  [
    [1, FALLBACK_DIVINATION_TOP],
    [2, FALLBACK_DIVINATION_MID],
  ],
);

export function currencyRules(preset: Preset): Rule[] {
  const rules: Rule[] = [];
  const allTiers = [TIER_1, TIER_2, TIER_3];

  allTiers.forEach((names, index) => {
    const tier = (index + 1) as 1 | 2 | 3;
    if (tier > preset.currency.maxVisibleTier || names.length === 0) return;

    rules.push({
      action: 'Show',
      comment: `Currency - tier ${tier}`,
      baseTypes: [...names],
      style:
        tier === 1
          ? SLOT_STYLES.currencyTop
          : tier === 2
            ? SLOT_STYLES.currencyMid
            : SLOT_STYLES.currencyLow,
    });
  });

  const hidden = allTiers.filter(
    (names, index) =>
      index + 1 > preset.currency.maxVisibleTier && names.length > 0,
  );
  for (const names of hidden) {
    rules.push({
      action: 'Hide',
      comment: 'Currency - below tier cutoff',
      baseTypes: [...names],
    });
  }

  if (DIVINATION_TOP.length > 0) {
    rules.push({
      action: 'Show',
      comment: 'Divination cards - top',
      baseTypes: [...DIVINATION_TOP],
      style: SLOT_STYLES.currencyTop,
    });
  }

  if (DIVINATION_MID.length > 0) {
    rules.push({
      action: 'Show',
      comment: 'Divination cards - mid',
      baseTypes: [...DIVINATION_MID],
      style: {
        textColor: COLORS.white,
        borderColor: COLORS.gold,
        fontSize: 34,
        minimapIcon: { size: 0, color: 'Yellow', shape: 'Circle' },
      },
    });
  }

  return rules;
}