import { ECONOMY_TIERS } from '../../data/economy.ts';
import type { Preset } from '../presets.ts';
import {
  COLORS,
  SLOT_STYLES,
  type NamedAlertSound,
  type Rule,
  type Style,
} from '../types.ts';

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

const tiers = ECONOMY_TIERS as {
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

const [DIVINATION_1, DIVINATION_2, DIVINATION_3] = tiersOrFallback(
  tiers.divination,
  [
    [1, FALLBACK_DIVINATION_TOP],
    [2, FALLBACK_DIVINATION_MID],
    [3, []],
  ],
);

const DIVINATION_TIERS: { tier: 1 | 2 | 3; names: string[]; style: Style }[] = [
  { tier: 1, names: DIVINATION_1!, style: SLOT_STYLES.currencyTop },
  {
    tier: 2,
    names: DIVINATION_2!,
    style: {
      textColor: COLORS.white,
      borderColor: COLORS.gold,
      fontSize: 34,
      minimapIcon: { size: 0, color: 'Yellow', shape: 'Circle' },
    },
  },
  {
    tier: 3,
    names: DIVINATION_3!,
    style: { textColor: COLORS.card, borderColor: COLORS.card, fontSize: 34 },
  },
];

const NAMED_ALERTS: {
  name: string;
  sound: NamedAlertSound;
  tier: 1 | 2;
  style: Style;
  styleKind: 's-tier' | 'currency-top' | 'currency-mid' | 'chase';
}[] = [
  {
    name: 'Mirror of Kalandra',
    sound: 'ShMirror',
    tier: 1,
    style: { ...SLOT_STYLES.currencyTop, playEffect: 'Red' },
    styleKind: 'chase',
  },
  {
    name: 'Divine Orb',
    sound: 'ShDivine',
    tier: 1,
    style: { ...SLOT_STYLES.currencyTop, playEffect: 'Red' },
    styleKind: 'chase',
  },
  {
    name: 'Exalted Orb',
    sound: 'ShExalted',
    tier: 1,
    style: SLOT_STYLES.currencyTop,
    styleKind: 'currency-top',
  },
  {
    name: 'Chaos Orb',
    sound: 'ShChaos',
    tier: 2,
    style: SLOT_STYLES.currencyMid,
    styleKind: 'currency-mid',
  },
];

export function currencyRules(preset: Preset): Rule[] {
  const rules: Rule[] = [];

  // Gold is auto-collected, so hiding a pile only removes the ground label.
  // Show piles at or above the preset threshold; hide the rest. RePoE does not
  // ship gold, so "Gold" is a reviewed entry in base-types-extra.json.
  rules.push({
    action: 'Show',
    comment: `Gold - stacks of ${preset.currency.goldMinStack}+`,
    baseTypes: ['Gold'],
    stackSize: { min: preset.currency.goldMinStack },
    styleKind: 'gold',
    style: {
      textColor: COLORS.gold,
      borderColor: COLORS.gold,
      fontSize: 34,
    },
  });
  rules.push({
    action: 'Hide',
    comment: 'Gold - small stacks',
    baseTypes: ['Gold'],
  });

  for (const entry of NAMED_ALERTS) {
    if (entry.tier > preset.currency.maxVisibleTier) continue;
    rules.push({
      action: 'Show',
      comment: `${entry.name} - alert`,
      baseTypes: [entry.name],
      styleKind: entry.styleKind,
      style: { ...entry.style, alertSound: entry.sound },
    });
  }

  const allTiers = [TIER_1, TIER_2, TIER_3];

  allTiers.forEach((names, index) => {
    const tier = (index + 1) as 1 | 2 | 3;
    if (tier > preset.currency.maxVisibleTier || names.length === 0) return;

    rules.push({
      action: 'Show',
      comment: `Currency - tier ${tier}`,
      baseTypes: [...names],
      styleKind: tier === 1 ? 'currency-top' : tier === 2 ? 'currency-mid' : undefined,
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

  for (const { tier, names, style } of DIVINATION_TIERS) {
    if (names.length === 0) continue;
    if (tier <= preset.currency.divinationMaxTier) {
      rules.push({
        action: 'Show',
        comment: `Divination cards - tier ${tier}`,
        baseTypes: [...names],
        styleKind: 'card',
        style,
      });
    } else {
      rules.push({
        action: 'Hide',
        comment: 'Divination cards - below tier cutoff',
        baseTypes: [...names],
      });
    }
  }

  // Style-only catch-all: cards are already visible by default, so this
  // changes their backdrop without changing what the preset shows.
  rules.push({
    action: 'Show',
    comment: 'Divination cards',
    classNames: ['Divination Cards'],
    styleKind: 'card',
    style: {
      textColor: COLORS.card,
      borderColor: COLORS.card,
      fontSize: 34,
    },
  });

  return rules;
}