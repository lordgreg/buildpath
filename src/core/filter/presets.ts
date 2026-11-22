export type Phase = 'leveling' | 'endgame';

export type Strictness = 'soft' | 'strict' | 'uber';

export interface GearPreset {
  id: string;
  /** Minimum item level for rare gear in the archetype's slots. */
  rareMinItemLevel: number;
  /** Minimum item level for normal (white) gear. `null` hides whites entirely. */
  normalMinItemLevel: number | null;
  /** Minimum item level for magic gear. `null` hides magic gear entirely. */
  magicMinItemLevel: number | null;
  /** Highlight 4+ links and 6-sockets regardless of rarity. */
  highlightLinks: boolean;
  /** Non-unique bases the build never wants, hidden before gear rules. */
  hiddenBases?: string[];
}

export interface GemsPreset {
  id: string;
  /** Show gems at or above this quality; `null` shows every gem. */
  minQuality: number | null;
}

export interface CurrencyPreset {
  id: string;
  /** 1 = top tier only, 2 = top and mid, 3 = everything. */
  maxVisibleTier: 1 | 2 | 3;
  /** Divination cards: 1 = top only, 3 = every card. */
  divinationMaxTier: 1 | 2 | 3;
}

export interface MapsPreset {
  id: string;
  /** Endgame maps below this tier are hidden. `null` disables map rules. */
  minTier: number | null;
  /** Fragments: 1 = top only, 3 = every fragment. */
  fragmentMaxTier: 1 | 2 | 3;
}

export interface UniquesPreset {
  id: string;
  /** 1 = best bases only, 3 = every unique. Bases above the cutoff are hidden. */
  maxVisibleTier: 1 | 2 | 3;
}

export interface JunkPreset {
  id: string;
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  gear: GearPreset;
  gems: GemsPreset;
  currency: CurrencyPreset;
  maps: MapsPreset;
  uniques: UniquesPreset;
  junk: JunkPreset;
}

type Matrix<T> = Record<Phase, Record<Strictness, T>>;

// Soft/Strict/Uber raise the white and blue floors so each tier is a clear
// step: Soft shows every base a beginner might want, Uber only keeps high-ilvl
// bases worth crafting on. Flasks are excluded from the white floor (see
// gear.ts); they are never a crafting base.
const GEAR: Matrix<Omit<GearPreset, 'id'>> = {
  leveling: {
    soft: {
      rareMinItemLevel: 1,
      normalMinItemLevel: 0,
      magicMinItemLevel: 10,
      highlightLinks: true,
      hiddenBases: ['Gold Ring'],
    },
    strict: {
      rareMinItemLevel: 15,
      normalMinItemLevel: 68,
      magicMinItemLevel: 80,
      highlightLinks: true,
      hiddenBases: ['Gold Ring'],
    },
    uber: {
      rareMinItemLevel: 30,
      normalMinItemLevel: 75,
      magicMinItemLevel: 85,
      highlightLinks: true,
      hiddenBases: ['Gold Ring'],
    },
  },
  endgame: {
    soft: {
      rareMinItemLevel: 80,
      normalMinItemLevel: 68,
      magicMinItemLevel: 75,
      highlightLinks: true,
    },
    strict: {
      rareMinItemLevel: 83,
      normalMinItemLevel: 75,
      magicMinItemLevel: 80,
      highlightLinks: false,
    },
    uber: {
      rareMinItemLevel: 86,
      normalMinItemLevel: 80,
      magicMinItemLevel: 85,
      highlightLinks: false,
    },
  },
};

const GEMS: Matrix<Omit<GemsPreset, 'id'>> = {
  leveling: {
    soft: { minQuality: null },
    strict: { minQuality: null },
    uber: { minQuality: 5 },
  },
  endgame: {
    soft: { minQuality: 1 },
    strict: { minQuality: 5 },
    uber: { minQuality: 10 },
  },
};

// Soft shows every orb and card; Strict and Uber drop the low tiers.
const CURRENCY: Matrix<Omit<CurrencyPreset, 'id'>> = {
  leveling: {
    soft: { maxVisibleTier: 3, divinationMaxTier: 3 },
    strict: { maxVisibleTier: 2, divinationMaxTier: 2 },
    uber: { maxVisibleTier: 2, divinationMaxTier: 1 },
  },
  endgame: {
    soft: { maxVisibleTier: 3, divinationMaxTier: 3 },
    strict: { maxVisibleTier: 2, divinationMaxTier: 2 },
    uber: { maxVisibleTier: 2, divinationMaxTier: 1 },
  },
};

const UNIQUES: Matrix<Omit<UniquesPreset, 'id'>> = {
  leveling: {
    soft: { maxVisibleTier: 3 },
    strict: { maxVisibleTier: 3 },
    uber: { maxVisibleTier: 2 },
  },
  endgame: {
    soft: { maxVisibleTier: 3 },
    strict: { maxVisibleTier: 3 },
    uber: { maxVisibleTier: 2 },
  },
};

const MAPS: Matrix<Omit<MapsPreset, 'id'>> = {
  leveling: {
    soft: { minTier: null, fragmentMaxTier: 3 },
    strict: { minTier: null, fragmentMaxTier: 2 },
    uber: { minTier: null, fragmentMaxTier: 1 },
  },
  endgame: {
    soft: { minTier: 1, fragmentMaxTier: 3 },
    strict: { minTier: 11, fragmentMaxTier: 2 },
    uber: { minTier: 15, fragmentMaxTier: 1 },
  },
};

const STRICTNESS_LABELS: Record<Strictness, string> = {
  soft: 'Soft',
  strict: 'Strict',
  uber: 'Uber',
};

/** Old share links and saved builds used these names before the 0.21 rename. */
const LEGACY_STRICTNESS: Record<string, Strictness> = {
  normal: 'soft',
  'very-strict': 'uber',
};

export function coerceStrictness(value: string | null | undefined): Strictness {
  if (value === 'soft' || value === 'strict' || value === 'uber') return value;
  if (value && value in LEGACY_STRICTNESS) return LEGACY_STRICTNESS[value]!;
  return 'soft';
}

function sectionId(
  section: string,
  phase: Phase,
  strictness: Strictness,
): string {
  return `${section}-${phase}-${strictness}`;
}

/**
 * Composes the six section presets for a phase and strictness. Section ids are
 * stable, e.g. `preset-gems-endgame-strict`; the UI still exposes one global
 * strictness.
 */
export function getPreset(phase: Phase, strictness: Strictness): Preset {
  return {
    id: `${phase}-${strictness}`,
    label: `${phase === 'leveling' ? 'Leveling' : 'Endgame'} · ${STRICTNESS_LABELS[strictness]}`,
    description:
      phase === 'leveling'
        ? 'Acts and early maps, more clutter allowed.'
        : 'Finished character, only keep what is worth picking up.',
    gear: {
      id: sectionId('preset-gear', phase, strictness),
      ...GEAR[phase][strictness],
    },
    gems: {
      id: sectionId('preset-gems', phase, strictness),
      ...GEMS[phase][strictness],
    },
    currency: {
      id: sectionId('preset-currency', phase, strictness),
      ...CURRENCY[phase][strictness],
    },
    maps: {
      id: sectionId('preset-maps', phase, strictness),
      ...MAPS[phase][strictness],
    },
    uniques: {
      id: sectionId('preset-uniques', phase, strictness),
      ...UNIQUES[phase][strictness],
    },
    junk: {
      id: sectionId('preset-junk', phase, strictness),
    },
  };
}

export const STRICTNESS_ORDER: Strictness[] = ['soft', 'strict', 'uber'];

export const STRICTNESS_LABELS_PUBLIC = STRICTNESS_LABELS;
