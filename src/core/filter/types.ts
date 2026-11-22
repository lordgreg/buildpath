export type FilterAction = 'Show' | 'Hide';

export type RuleSection =
  | 'gear'
  | 'gems'
  | 'currency'
  | 'maps'
  | 'uniques'
  | 'quest'
  | 'junk'
  | 'league'
  | 'custom';

/**
 * Category used by the rarity theme to pick a background colour. Text and
 * border colours still follow rarity; this only changes the backdrop.
 */
export type StyleKind =
  | 's-tier'
  | 'currency-top'
  | 'currency-mid'
  | 'card'
  | 'gem'
  | 'map'
  | 'fragment'
  | 'unique'
  | 'jewel-best'
  | 'jewel'
  | 'flask'
  | 'gold'
  | 'league'
  | 'quest'
  | 'chase';

/** Built-in Shaper voice lines that Path of Exile accepts as alert sounds. */
export type NamedAlertSound =
  | 'ShAlchemy'
  | 'ShBlessed'
  | 'ShChaos'
  | 'ShDivine'
  | 'ShExalted'
  | 'ShFusing'
  | 'ShGeneral'
  | 'ShMirror'
  | 'ShRegal'
  | 'ShVaal';

export type AlertSound = number | 'None' | NamedAlertSound;

export type Rarity = 'Normal' | 'Magic' | 'Rare' | 'Unique';

export type Color =
  | readonly [number, number, number]
  | readonly [number, number, number, number];

export type MinimapColor =
  | 'Red'
  | 'Green'
  | 'Blue'
  | 'Yellow'
  | 'Cyan'
  | 'Purple'
  | 'White'
  | 'Gray';

export type MinimapShape =
  | 'Circle'
  | 'Diamond'
  | 'Hexagon'
  | 'Square'
  | 'Star'
  | 'Triangle'
  | 'Kite'
  | 'Moon'
  | 'Pentagon';

export type EffectColor =
  | 'Red'
  | 'Green'
  | 'Blue'
  | 'Yellow'
  | 'Cyan'
  | 'Purple'
  | 'White'
  | 'Grey';

export interface Style {
  textColor?: Color;
  borderColor?: Color;
  backgroundColor?: Color;
  /** 18-45 in game. */
  fontSize?: number;
  alertSound?: AlertSound;
  /** 0-300. */
  alertVolume?: number;
  minimapIcon?: {
    size: 0 | 1 | 2;
    color: MinimapColor;
    shape: MinimapShape;
  };
  playEffect?: EffectColor;
}

export interface Range {
  min?: number;
  max?: number;
}

export interface Rule {
  action: FilterAction;
  /** Stable identifier inside a generated or cloned rule set. */
  id?: string;
  /** Group used by the locked pane and the editor. */
  section?: RuleSection;
  /** Disabled rules are kept in a clone but skipped by emit and match. */
  disabled?: boolean;
  /** Chip ids used to build a custom rule, for editing and display. */
  chips?: string[];
  /** Category background used by the rarity theme. */
  styleKind?: StyleKind;
  comment?: string;
  classNames?: string[];
  baseTypes?: string[];
  rarity?: Rarity;
  itemLevel?: Range;
  dropLevel?: Range;
  areaLevel?: Range;
  stackSize?: Range;
  quality?: Range;
  sockets?: Range;
  linkedSockets?: Range;
  mapTier?: Range;
  corrupted?: boolean;
  identified?: boolean;
  /** Keep matching subsequent blocks when this one matches. */
  continue?: boolean;
  style?: Style;
}

export const COLORS = {
  white: [255, 255, 255, 255],
  grey: [190, 190, 190, 255],
  gold: [217, 178, 106, 255],
  orange: [255, 166, 0, 255],
  red: [240, 90, 90, 255],
  purple: [190, 120, 255, 255],
  blue: [120, 180, 255, 255],
  cyan: [90, 220, 220, 255],
  green: [120, 230, 140, 255],
  yellow: [255, 255, 119, 255],
  gem: [27, 162, 155, 255],
  map: [226, 214, 176, 255],
  card: [176, 196, 222, 255],
  darkBrown: [40, 28, 12, 255],
  darkBlue: [10, 28, 48, 255],
  darkGreen: [8, 32, 18, 255],
  darkPurple: [40, 10, 55, 255],
  darkRed: [55, 8, 8, 255],
  // Category backgrounds for the rarity theme. Dark enough for white text.
  sTier: [58, 11, 46, 255],
  jewelBest: [36, 16, 58, 255],
  cardBg: [10, 26, 51, 255],
  flaskBg: [6, 42, 26, 255],
  fragmentBg: [42, 30, 8, 255],
  gemBg: [6, 42, 42, 255],
  goldBg: [58, 42, 0, 255],
  jewelBg: [20, 26, 58, 255],
  leagueBg: [58, 22, 0, 255],
  black: [0, 0, 0, 255],
} as const satisfies Record<string, Color>;

export const SLOT_STYLES = {
  weapon: {
    textColor: COLORS.white,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.darkBrown,
    fontSize: 45,
    alertSound: 1,
    alertVolume: 300,
    minimapIcon: { size: 1, color: 'Yellow', shape: 'Star' },
  },
  armour: {
    textColor: COLORS.white,
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.darkBlue,
    fontSize: 40,
    alertSound: 2,
    alertVolume: 220,
    minimapIcon: { size: 1, color: 'Cyan', shape: 'Diamond' },
  },
  accessory: {
    textColor: COLORS.white,
    borderColor: COLORS.green,
    backgroundColor: COLORS.darkGreen,
    fontSize: 40,
    alertSound: 3,
    alertVolume: 150,
    minimapIcon: { size: 1, color: 'Green', shape: 'Hexagon' },
  },
  link: {
    textColor: COLORS.white,
    borderColor: COLORS.green,
    fontSize: 38,
  },
  currencyTop: {
    textColor: COLORS.white,
    borderColor: COLORS.red,
    backgroundColor: COLORS.darkRed,
    fontSize: 45,
    alertSound: 6,
    alertVolume: 300,
    minimapIcon: { size: 1, color: 'Red', shape: 'Star' },
  },
  currencyMid: {
    textColor: COLORS.white,
    borderColor: COLORS.purple,
    backgroundColor: COLORS.darkPurple,
    fontSize: 40,
    alertSound: 5,
    alertVolume: 220,
    minimapIcon: { size: 1, color: 'Purple', shape: 'Diamond' },
  },
  currencyLow: {
    textColor: COLORS.grey,
    borderColor: COLORS.gold,
    fontSize: 34,
  },
  gem: {
    textColor: COLORS.cyan,
    borderColor: COLORS.blue,
    fontSize: 40,
    alertSound: 8,
    alertVolume: 180,
    minimapIcon: { size: 0, color: 'Blue', shape: 'Circle' },
  },
  unique: {
    textColor: COLORS.orange,
    borderColor: COLORS.orange,
    backgroundColor: COLORS.darkBrown,
    fontSize: 40,
    alertSound: 4,
    alertVolume: 200,
    minimapIcon: { size: 1, color: 'Red', shape: 'Star' },
  },
  map: {
    textColor: COLORS.white,
    borderColor: COLORS.blue,
    fontSize: 38,
  },
} satisfies Record<string, Style>;