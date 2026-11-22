import economy from '../../../generated/economy.json';
import known from '../../data/known-base-types.json';
import type { Phase, Preset } from '../presets.ts';
import { COLORS, SLOT_STYLES, type Rule, type Style } from '../types.ts';

const knownNames = new Set(known.names);
const FRAGMENT_TIERS = economy.tiers.fragment as Record<string, number>;

/** Graded map bands, loudest first. Lower bands are only added at or below the cutoff. */
const MAP_BANDS: { min: number; max?: number; style: Style; label: string }[] = [
  {
    min: 15,
    label: 'Maps - tier 15+',
    style: {
      textColor: COLORS.white,
      borderColor: COLORS.blue,
      fontSize: 45,
      minimapIcon: { size: 1, color: 'Blue', shape: 'Circle' },
    },
  },
  {
    min: 14,
    max: 14,
    label: 'Maps - tier 14',
    style: { textColor: COLORS.white, borderColor: COLORS.blue, fontSize: 38 },
  },
  {
    min: 11,
    max: 13,
    label: 'Maps - tier 11-13',
    style: { textColor: COLORS.grey, borderColor: COLORS.blue, fontSize: 34 },
  },
];

const FRAGMENT_STYLE: Style = {
  textColor: SLOT_STYLES.map.textColor,
  borderColor: SLOT_STYLES.map.borderColor,
  fontSize: 36,
};

/** Fragment names the game accepts as BaseTypes; the rest fall to the class rule. */
function knownFragmentsAt(tier: number): string[] {
  return Object.entries(FRAGMENT_TIERS)
    .filter(([, value]) => value === tier)
    .map(([name]) => name)
    .filter((name) => knownNames.has(name))
    .sort();
}

export function mapRules(preset: Preset, phase: Phase): Rule[] {
  const rules: Rule[] = [];

  if (phase === 'endgame' && preset.maps.minTier !== null) {
    const minTier = preset.maps.minTier;

    for (const band of MAP_BANDS) {
      if (minTier > band.min) continue;
      rules.push({
        action: 'Show',
        comment: band.label,
        classNames: ['Maps'],
        mapTier: {
          min: band.min,
          ...(band.max !== undefined ? { max: band.max } : {}),
        },
        styleKind: 'map',
        style: band.style,
      });
    }

    if (minTier < 11) {
      rules.push({
        action: 'Show',
        comment: `Maps - tier ${minTier}-10`,
        classNames: ['Maps'],
        mapTier: { min: minTier, max: 10 },
        styleKind: 'map',
        style: { textColor: COLORS.grey, borderColor: COLORS.blue, fontSize: 30 },
      });
    }

    if (minTier > 1) {
      rules.push({
        action: 'Hide',
        comment: 'Maps - below tier cutoff',
        classNames: ['Maps'],
      });
    }
  }

  const fragmentMaxTier = preset.maps.fragmentMaxTier;
  for (const tier of [1, 2, 3]) {
    const names = knownFragmentsAt(tier);
    if (names.length === 0) continue;
    if (tier <= fragmentMaxTier) {
      rules.push({
        action: 'Show',
        comment: `Map fragments - tier ${tier}`,
        baseTypes: names,
        styleKind: 'fragment',
        style: FRAGMENT_STYLE,
      });
    } else {
      rules.push({
        action: 'Hide',
        comment: 'Map fragments - below tier cutoff',
        baseTypes: names,
      });
    }
  }

  // Style-only: names the registry does not know stay visible by default.
  rules.push({
    action: 'Show',
    comment: 'Map fragments',
    classNames: ['Map Fragments'],
    styleKind: 'fragment',
    style: FRAGMENT_STYLE,
  });

  return rules;
}
