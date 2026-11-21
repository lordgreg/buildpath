import type { Preset } from '../presets.ts';
import { COLORS, SLOT_STYLES, type Rule } from '../types.ts';

/** Hand-maintained for M1. M2 replaces the tiering with poe.ninja prices. */
const TIER_1 = [
  'Divine Orb',
  'Eldritch Chaos Orb',
  'Eldritch Exalted Orb',
  'Eldritch Orb of Annulment',
  'Exalted Orb',
  'Fracturing Orb',
  'Hinekora\'s Lock',
  'Mirror of Kalandra',
  'Sacred Orb',
];

const TIER_2 = [
  'Ancient Orb',
  'Blessed Orb',
  'Cartographer\'s Chisel',
  'Chaos Orb',
  'Chromatic Orb',
  'Gemcutter\'s Prism',
  'Glassblower\'s Bauble',
  'Instilling Orb',
  'Enkindling Orb',
  'Jeweller\'s Orb',
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

const TIER_3 = [
  'Armourer\'s Scrap',
  'Blacksmith\'s Whetstone',
  'Orb of Augmentation',
  'Orb of Transmutation',
  'Perandus Coin',
  'Portal Scroll',
  'Scroll of Wisdom',
];

const DIVINATION_TOP = [
  'House of Mirrors',
  'The Apothecary',
  'The Doctor',
  'The Fiend',
  'The Nurse',
];

const DIVINATION_MID = ['Stacked Deck'];

const TIERS = [TIER_1, TIER_2, TIER_3] as const;

export function currencyRules(preset: Preset): Rule[] {
  const rules: Rule[] = [];

  TIERS.forEach((names, index) => {
    const tier = (index + 1) as 1 | 2 | 3;
    if (tier > preset.maxVisibleCurrencyTier) return;

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

  const hidden = TIERS.filter(
    (_, index) => index + 1 > preset.maxVisibleCurrencyTier,
  );
  for (const names of hidden) {
    rules.push({
      action: 'Hide',
      comment: 'Currency - below tier cutoff',
      baseTypes: [...names],
    });
  }

  rules.push({
    action: 'Show',
    comment: 'Divination cards - top',
    baseTypes: [...DIVINATION_TOP],
    style: SLOT_STYLES.currencyTop,
  });

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

  return rules;
}