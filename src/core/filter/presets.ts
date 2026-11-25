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

/**
 * A leveling stage. Filters cannot read character level, so the area the item
 * dropped in is the progression proxy (PLAN.md §2.1). Stages are disjoint and
 * ordered by area.
 */
export interface GearStage {
  /** Inclusive area levels this stage covers. */
  areaLevel: { min: number; max?: number };
  /**
   * White floor for this stage. `null` means whites only show through the
   * link and socket rules.
   */
  normalMinItemLevel: number | null;
  /**
   * Magic floor for this stage. `null` means magic only shows through the
   * 4-link/RGB rules, plus accessories and flasks which always do.
   */
  magicMinItemLevel: number | null;
  /** Whites at or above this socket count show regardless of the floor. */
  normalMinSockets?: number;
}

export interface GemsPreset {
  id: string;
  /** Show gems at or above this quality (OR with `minItemLevel`); `null` = no quality gate. */
  minQuality: number | null;
  /** Also show gems at or above this item level (OR with `minQuality`); `null` = no level gate. */
  minItemLevel: number | null;
  /** Play the alert sound when a gem is shown; off while leveling. */
  alert: boolean;
}

export interface CurrencyPreset {
  id: string;
  /** 1 = top tier only, 2 = top and mid, 3 = everything. */
  maxVisibleTier: 1 | 2 | 3;
  /** Divination cards: 1 = top only, 3 = every card. */
  divinationMaxTier: 1 | 2 | 3;
  /**
   * Gold piles smaller than this are hidden. Gold is auto-collected, so the
   * ground label is only clutter; higher tiers keep only the big payouts.
   */
  goldMinStack: number;
  /**
   * Leveling strictness hides wisdom and portal scrolls below this stack size.
   * `null` keeps every stack.
   */
  scrollMinStack: number | null;
}

export interface MapsPreset {
  id: string;
  /** Endgame maps below this tier are hidden. `null` disables map rules. */
  minTier: number | null;
  /**
   * The tier cutoff only applies from this area level, so a character still
   * progressing keeps low maps visible. `null` applies it everywhere.
   */
  cutoffAreaLevel: number | null;
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
  /** Leveling only: area-gated gear overrides. Empty for endgame. */
  gearStages: GearStage[];
  gems: GemsPreset;
  currency: CurrencyPreset;
  maps: MapsPreset;
  uniques: UniquesPreset;
  junk: JunkPreset;
}

type Matrix<T> = Record<Phase, Record<Strictness, T>>;

// Soft/Strict/Uber raise the white and blue floors so each tier is a clear
// step: Soft shows every base a beginner might want, Uber only keeps high-ilvl
// bases worth crafting on. The white floor is now the crafting-base band alone
// (84 soft, 86 strict/uber); whites below it only show when they carry links or
// sockets. Flasks are excluded from the white floor (see gear.ts).
const GEAR: Matrix<Omit<GearPreset, 'id'>> = {
  leveling: {
    soft: {
      rareMinItemLevel: 1,
      normalMinItemLevel: 84,
      magicMinItemLevel: 10,
      highlightLinks: true,
      hiddenBases: ['Gold Ring'],
    },
    strict: {
      rareMinItemLevel: 15,
      normalMinItemLevel: 86,
      magicMinItemLevel: 80,
      highlightLinks: true,
      hiddenBases: ['Gold Ring'],
    },
    uber: {
      rareMinItemLevel: 30,
      normalMinItemLevel: 86,
      magicMinItemLevel: 85,
      highlightLinks: true,
      hiddenBases: ['Gold Ring'],
    },
  },
  endgame: {
    soft: {
      rareMinItemLevel: 80,
      normalMinItemLevel: 84,
      magicMinItemLevel: 75,
      highlightLinks: true,
    },
    strict: {
      rareMinItemLevel: 83,
      normalMinItemLevel: 86,
      magicMinItemLevel: 80,
      highlightLinks: false,
    },
    uber: {
      rareMinItemLevel: 86,
      normalMinItemLevel: 86,
      magicMinItemLevel: 85,
      highlightLinks: false,
    },
  },
};

/**
 * Leveling stages, keyed on the area the item dropped in. Whites and magic
 * gear follow the same curve at every strictness; the preset's rare floor and
 * the currency rules carry the strictness difference. Stage 4 uses the
 * preset's white floor, which is the crafting-base band by then.
 */
export function levelingStages(normalMinItemLevel: number | null): GearStage[] {
  return [
    {
      areaLevel: { min: 1, max: 9 },
      normalMinItemLevel: 0,
      magicMinItemLevel: 0,
    },
    {
      areaLevel: { min: 10, max: 19 },
      normalMinItemLevel: null,
      normalMinSockets: 4,
      magicMinItemLevel: 0,
    },
    {
      areaLevel: { min: 20, max: 67 },
      normalMinItemLevel: null,
      normalMinSockets: 4,
      magicMinItemLevel: null,
    },
    {
      // Maps begin at area 68, where a character is done with the campaign.
      areaLevel: { min: 68 },
      normalMinItemLevel,
      normalMinSockets: 4,
      magicMinItemLevel: null,
    },
  ];
}

// Leveling gems are not worth an alert, so they are silent; leveling strict
// also keeps only gems that carry quality or dropped above the early areas.
// Endgame gates on quality alone and keeps the alert.
const GEMS: Matrix<Omit<GemsPreset, 'id'>> = {
  leveling: {
    soft: { minQuality: null, minItemLevel: null, alert: false },
    strict: { minQuality: 5, minItemLevel: 10, alert: false },
    uber: { minQuality: 5, minItemLevel: null, alert: false },
  },
  endgame: {
    soft: { minQuality: 1, minItemLevel: null, alert: true },
    strict: { minQuality: 5, minItemLevel: null, alert: true },
    uber: { minQuality: 10, minItemLevel: null, alert: true },
  },
};

// Soft shows every orb and card; Strict and Uber drop the low tiers. Gold is
// auto-collected, so the ground label is only clutter and the threshold rises
// with strictness to keep only the larger piles.
const CURRENCY: Matrix<Omit<CurrencyPreset, 'id'>> = {
  leveling: {
    soft: {
      maxVisibleTier: 3,
      divinationMaxTier: 3,
      goldMinStack: 10,
      scrollMinStack: null,
    },
    strict: {
      maxVisibleTier: 2,
      divinationMaxTier: 2,
      goldMinStack: 20,
      scrollMinStack: 3,
    },
    uber: {
      maxVisibleTier: 2,
      divinationMaxTier: 1,
      goldMinStack: 50,
      scrollMinStack: 3,
    },
  },
  endgame: {
    soft: {
      maxVisibleTier: 3,
      divinationMaxTier: 3,
      goldMinStack: 50,
      scrollMinStack: null,
    },
    strict: {
      maxVisibleTier: 2,
      divinationMaxTier: 2,
      goldMinStack: 100,
      scrollMinStack: null,
    },
    uber: {
      maxVisibleTier: 2,
      divinationMaxTier: 1,
      goldMinStack: 200,
      scrollMinStack: null,
    },
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
    soft: { minTier: null, cutoffAreaLevel: null, fragmentMaxTier: 3 },
    strict: { minTier: null, cutoffAreaLevel: null, fragmentMaxTier: 2 },
    uber: { minTier: null, cutoffAreaLevel: null, fragmentMaxTier: 1 },
  },
  endgame: {
    soft: { minTier: 1, cutoffAreaLevel: null, fragmentMaxTier: 3 },
    // Area level is 67 + map tier: T11 areas are 78 and T15 areas are 82.
    // Until the character reaches them, even Strict keeps the low maps.
    strict: { minTier: 11, cutoffAreaLevel: 78, fragmentMaxTier: 2 },
    uber: { minTier: 15, cutoffAreaLevel: 82, fragmentMaxTier: 1 },
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
        ? 'Acts and early maps; tightens by area level.'
        : 'Finished character, only keep what is worth picking up.',
    gear: {
      id: sectionId('preset-gear', phase, strictness),
      ...GEAR[phase][strictness],
    },
    gearStages:
      phase === 'leveling'
        ? levelingStages(GEAR.leveling[strictness].normalMinItemLevel)
        : [],
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
