export type Phase = 'leveling' | 'endgame';

export type Strictness = 'normal' | 'strict' | 'very-strict';

export interface Preset {
  id: string;
  label: string;
  description: string;
  /** Minimum item level for rare gear in the archetype's slots. */
  rareMinItemLevel: number;
  /** Minimum item level for magic gear. `null` hides magic gear entirely. */
  magicMinItemLevel: number | null;
  /** Highlight 4+ links and 6-sockets regardless of rarity. */
  highlightLinks: boolean;
  /** Show every gem (leveling) or only gems at or above this quality. */
  gemMinQuality: number | null;
  /** Endgame maps below this tier are hidden. `null` disables map rules. */
  mapMinTier: number | null;
  /** 1 = top tier only, 2 = top and mid, 3 = everything. */
  maxVisibleCurrencyTier: 1 | 2 | 3;
}

interface PresetTable {
  leveling: Record<Strictness, Omit<Preset, 'id' | 'label' | 'description'>>;
  endgame: Record<Strictness, Omit<Preset, 'id' | 'label' | 'description'>>;
}

const TABLE: PresetTable = {
  leveling: {
    normal: {
      rareMinItemLevel: 1,
      magicMinItemLevel: 10,
      highlightLinks: true,
      gemMinQuality: null,
      mapMinTier: null,
      maxVisibleCurrencyTier: 3,
    },
    strict: {
      rareMinItemLevel: 15,
      magicMinItemLevel: 25,
      highlightLinks: true,
      gemMinQuality: null,
      mapMinTier: null,
      maxVisibleCurrencyTier: 3,
    },
    'very-strict': {
      rareMinItemLevel: 30,
      magicMinItemLevel: null,
      highlightLinks: false,
      gemMinQuality: 5,
      mapMinTier: null,
      maxVisibleCurrencyTier: 2,
    },
  },
  endgame: {
    normal: {
      rareMinItemLevel: 80,
      magicMinItemLevel: null,
      highlightLinks: false,
      gemMinQuality: 1,
      mapMinTier: 1,
      maxVisibleCurrencyTier: 2,
    },
    strict: {
      rareMinItemLevel: 83,
      magicMinItemLevel: null,
      highlightLinks: false,
      gemMinQuality: 5,
      mapMinTier: 11,
      maxVisibleCurrencyTier: 2,
    },
    'very-strict': {
      rareMinItemLevel: 86,
      magicMinItemLevel: null,
      highlightLinks: false,
      gemMinQuality: 10,
      mapMinTier: 15,
      maxVisibleCurrencyTier: 1,
    },
  },
};

const STRICTNESS_LABELS: Record<Strictness, string> = {
  normal: 'Normal',
  strict: 'Strict',
  'very-strict': 'Very Strict',
};

export function getPreset(phase: Phase, strictness: Strictness): Preset {
  const values = TABLE[phase][strictness];
  return {
    ...values,
    id: `${phase}-${strictness}`,
    label: `${phase === 'leveling' ? 'Leveling' : 'Endgame'} · ${STRICTNESS_LABELS[strictness]}`,
    description:
      phase === 'leveling'
        ? 'Acts and early maps, more clutter allowed.'
        : 'Finished character, only keep what is worth picking up.',
  };
}

export const STRICTNESS_ORDER: Strictness[] = ['normal', 'strict', 'very-strict'];

export const STRICTNESS_LABELS_PUBLIC = STRICTNESS_LABELS;