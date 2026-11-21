export type Phase = 'leveling' | 'endgame';

export type Strictness = 'normal' | 'strict' | 'very-strict';

export interface GearPreset {
  id: string;
  /** Minimum item level for rare gear in the archetype's slots. */
  rareMinItemLevel: number;
  /** Minimum item level for magic gear. `null` hides magic gear entirely. */
  magicMinItemLevel: number | null;
  /** Highlight 4+ links and 6-sockets regardless of rarity. */
  highlightLinks: boolean;
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
}

export interface MapsPreset {
  id: string;
  /** Endgame maps below this tier are hidden. `null` disables map rules. */
  minTier: number | null;
}

export interface UniquesPreset {
  id: string;
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

const GEAR: Matrix<Omit<GearPreset, 'id'>> = {
  leveling: {
    normal: {
      rareMinItemLevel: 1,
      magicMinItemLevel: 10,
      highlightLinks: true,
    },
    strict: {
      rareMinItemLevel: 15,
      magicMinItemLevel: 25,
      highlightLinks: true,
    },
    'very-strict': {
      rareMinItemLevel: 30,
      magicMinItemLevel: null,
      highlightLinks: false,
    },
  },
  endgame: {
    normal: {
      rareMinItemLevel: 80,
      magicMinItemLevel: null,
      highlightLinks: false,
    },
    strict: {
      rareMinItemLevel: 83,
      magicMinItemLevel: null,
      highlightLinks: false,
    },
    'very-strict': {
      rareMinItemLevel: 86,
      magicMinItemLevel: null,
      highlightLinks: false,
    },
  },
};

const GEMS: Matrix<Omit<GemsPreset, 'id'>> = {
  leveling: {
    normal: { minQuality: null },
    strict: { minQuality: null },
    'very-strict': { minQuality: 5 },
  },
  endgame: {
    normal: { minQuality: 1 },
    strict: { minQuality: 5 },
    'very-strict': { minQuality: 10 },
  },
};

const CURRENCY: Matrix<Omit<CurrencyPreset, 'id'>> = {
  leveling: {
    normal: { maxVisibleTier: 3 },
    strict: { maxVisibleTier: 3 },
    'very-strict': { maxVisibleTier: 2 },
  },
  endgame: {
    normal: { maxVisibleTier: 2 },
    strict: { maxVisibleTier: 2 },
    'very-strict': { maxVisibleTier: 1 },
  },
};

const MAPS: Matrix<Omit<MapsPreset, 'id'>> = {
  leveling: {
    normal: { minTier: null },
    strict: { minTier: null },
    'very-strict': { minTier: null },
  },
  endgame: {
    normal: { minTier: 1 },
    strict: { minTier: 11 },
    'very-strict': { minTier: 15 },
  },
};

const STRICTNESS_LABELS: Record<Strictness, string> = {
  normal: 'Normal',
  strict: 'Strict',
  'very-strict': 'Very Strict',
};

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
    },
    junk: {
      id: sectionId('preset-junk', phase, strictness),
    },
  };
}

export const STRICTNESS_ORDER: Strictness[] = ['normal', 'strict', 'very-strict'];

export const STRICTNESS_LABELS_PUBLIC = STRICTNESS_LABELS;