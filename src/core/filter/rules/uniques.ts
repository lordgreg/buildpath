import { ECONOMY_TIERS } from '../../data/economy.ts';
import type { Preset } from '../presets.ts';
import { SLOT_STYLES, type Rule } from '../types.ts';

type TierMap = Record<string, number>;

const UNIQUE_BASES = ECONOMY_TIERS.uniqueBase as TierMap;

function basesAtTier(tier: number): string[] {
  return Object.entries(UNIQUE_BASES)
    .filter(([, value]) => value === tier)
    .map(([baseType]) => baseType)
    .sort();
}

function basesAboveTier(tier: number): string[] {
  return Object.entries(UNIQUE_BASES)
    .filter(([, value]) => value > tier)
    .map(([baseType]) => baseType)
    .sort();
}

const TOP_BASES = basesAtTier(1);

const JEWEL_CLASSES = ['Jewels', 'Abyss Jewels'];

/** Tier-1 unique bases that are jewels, e.g. Prismatic or Cobalt. */
const TOP_JEWEL_BASES = TOP_BASES.filter((baseType) =>
  baseType.endsWith('Jewel'),
);

/**
 * Unique names are not valid BaseType values. Tiering therefore highlights the
 * bases that carry high-value uniques; a low-tier hide removes the cheap bases
 * at high strictness, and the generic rule catches the rest.
 */
export function uniqueRules(preset: Preset): Rule[] {
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

  // A six-linked unique is worth keeping even on a cheap base, so this runs
  // before the low-tier hide below.
  rules.push({
    action: 'Show',
    comment: 'Uniques - six links',
    rarity: 'Unique',
    linkedSockets: { min: 6 },
    styleKind: 'unique',
    style: SLOT_STYLES.unique,
  });

  // Runs before the class and generic show rules so cheap bases actually stay
  // hidden. Normal and Strict keep every unique (cutoff 3 -> empty list).
  const lowTierBases = basesAboveTier(preset.uniques.maxVisibleTier);
  if (lowTierBases.length > 0) {
    rules.push({
      action: 'Hide',
      comment: 'Uniques - low tier bases',
      baseTypes: lowTierBases,
      rarity: 'Unique',
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
