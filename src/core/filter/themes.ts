import { type Color, type Rarity, type Rule, type StyleKind } from './types.ts';

export type ThemeId =
  | 'rarity'
  | 'contrast'
  | 'muted'
  | 'catppuccin'
  | 'dracula'
  | 'nord'
  | 'solarized-dark'
  | 'tokyo-night';

/** Rarity is the base every other theme recolours. */
export const DEFAULT_THEME: ThemeId = 'rarity';

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  hint: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'rarity',
    label: 'Rarity',
    hint: 'Rarity text and borders, category backgrounds',
  },
  {
    id: 'contrast',
    label: 'High contrast',
    hint: 'White labels, black background, louder text',
  },
  {
    id: 'muted',
    label: 'Muted',
    hint: 'Grey labels, no sounds or minimap icons',
  },
  {
    id: 'catppuccin',
    label: 'Catppuccin',
    hint: 'Catppuccin Mocha palette',
  },
  {
    id: 'dracula',
    label: 'Dracula',
    hint: 'Dracula palette',
  },
  {
    id: 'nord',
    label: 'Nord',
    hint: 'Nord palette',
  },
  {
    id: 'solarized-dark',
    label: 'Solarized Dark',
    hint: 'Solarized dark palette',
  },
  {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    hint: 'Tokyo Night palette',
  },
];

const THEME_IDS = THEMES.map((theme) => theme.id);

/** Old share links and hashes used `classic` for the Rarity theme. */
const THEME_ALIASES: Record<string, ThemeId> = { classic: 'rarity' };

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === 'string' &&
    (THEME_IDS as readonly string[]).includes(value)
  );
}

/** Canonical id for anything a link, hash or share code may carry. */
export function coerceThemeId(value: unknown): ThemeId {
  if (isThemeId(value)) return value;
  if (typeof value === 'string' && THEME_ALIASES[value]) {
    return THEME_ALIASES[value];
  }
  return DEFAULT_THEME;
}

/** StyleKinds that get a category background. Anything else keeps `base`. */
const BACKGROUND_KINDS: { kind: StyleKind; accent: AccentKey; weight: number }[] =
  [
    { kind: 's-tier', accent: 'unique', weight: 0.3 },
    { kind: 'jewel-best', accent: 'purple', weight: 0.3 },
    { kind: 'card', accent: 'card', weight: 0.22 },
    { kind: 'flask', accent: 'green', weight: 0.22 },
    { kind: 'fragment', accent: 'gold', weight: 0.22 },
    { kind: 'gem', accent: 'gem', weight: 0.22 },
    { kind: 'gold', accent: 'gold', weight: 0.22 },
    { kind: 'jewel', accent: 'magic', weight: 0.22 },
    { kind: 'league', accent: 'unique', weight: 0.22 },
  ];

interface ThemeColors {
  currency: Color;
  card: Color;
  gem: Color;
  map: Color;
  unique: Color;
  gold: Color;
  purple: Color;
  green: Color;
  magic: Color;
}

type AccentKey = keyof ThemeColors;

interface ThemePalette {
  /** Backdrop for anything without a category background. */
  base: Color;
  rarity: Record<Rarity, Color>;
  colors: ThemeColors;
  quest: { text: Color; border: Color; background: Color };
  veiled: { text: Color; border: Color; background: Color };
  chase: { text: Color; background: Color };
  backgrounds: Partial<Record<StyleKind, Color>>;
}

/** Text/border/background triple for a category that ignores rarity colour. */
interface TintSpec {
  text: string;
  border: string;
  background?: string;
}

/** Human-readable palette description; colours are hex, resolved once. */
interface PaletteSpec {
  base: string;
  normal: string;
  magic: string;
  rare: string;
  unique: string;
  currency: string;
  card: string;
  gem: string;
  map: string;
  gold: string;
  purple: string;
  green: string;
  quest: TintSpec;
  veiled: TintSpec;
  chase: { text: string; background: string };
  /** Force every category background to one colour (contrast, muted). */
  flatBackgrounds?: string;
  /** Exact category backgrounds, preserving the Rarity look. */
  backgrounds?: Partial<Record<StyleKind, string>>;
}

function hex(value: string): Color {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

/** Blend a bright accent into the theme base so text stays readable on it. */
function mix(base: Color, accent: Color, weight: number): Color {
  const at = (index: number) =>
    Math.round(base[index]! * (1 - weight) + accent[index]! * weight);
  return [at(0), at(1), at(2), 255];
}

function buildPalette(spec: PaletteSpec): ThemePalette {
  const base = hex(spec.base);
  const colors: ThemeColors = {
    currency: hex(spec.currency),
    card: hex(spec.card),
    gem: hex(spec.gem),
    map: hex(spec.map),
    unique: hex(spec.unique),
    gold: hex(spec.gold),
    purple: hex(spec.purple),
    green: hex(spec.green),
    magic: hex(spec.magic),
  };

  const backgrounds: Partial<Record<StyleKind, Color>> = {};
  for (const { kind, accent, weight } of BACKGROUND_KINDS) {
    const override = spec.backgrounds?.[kind];
    if (override) backgrounds[kind] = hex(override);
    else if (spec.flatBackgrounds) backgrounds[kind] = hex(spec.flatBackgrounds);
    else backgrounds[kind] = mix(base, colors[accent], weight);
  }

  const questBorder = hex(spec.quest.border);
  const veiledBorder = hex(spec.veiled.border);
  return {
    base,
    rarity: {
      Normal: hex(spec.normal),
      Magic: hex(spec.magic),
      Rare: hex(spec.rare),
      Unique: hex(spec.unique),
    },
    colors,
    quest: {
      text: hex(spec.quest.text),
      border: questBorder,
      background: spec.quest.background
        ? hex(spec.quest.background)
        : mix(base, questBorder, 0.32),
    },
    veiled: {
      text: hex(spec.veiled.text),
      border: veiledBorder,
      background: spec.veiled.background
        ? hex(spec.veiled.background)
        : mix(base, veiledBorder, 0.32),
    },
    chase: {
      text: hex(spec.chase.text),
      background: hex(spec.chase.background),
    },
    backgrounds,
  };
}

const RARITY_PALETTE = buildPalette({
  base: '#000000',
  normal: '#ffffff',
  magic: '#78b4ff',
  rare: '#ffff77',
  unique: '#ffa600',
  currency: '#d9b26a',
  card: '#b0c4de',
  gem: '#1ba29b',
  map: '#e2d6b0',
  gold: '#d9b26a',
  purple: '#be78ff',
  green: '#78e68c',
  quest: { text: '#ffffff', border: '#d9b26a', background: '#3a2600' },
  veiled: { text: '#ffb8f0', border: '#ff5cd6', background: '#2a0a24' },
  chase: { text: '#12000a', background: '#ff2d95' },
  backgrounds: {
    's-tier': '#3a0b2e',
    'jewel-best': '#24103a',
    card: '#0a1a33',
    flask: '#062a1a',
    fragment: '#2a1e08',
    gem: '#062a2a',
    gold: '#3a2a00',
    jewel: '#141a3a',
    league: '#3a1600',
  },
});

const CATPPUCCIN_PALETTE = buildPalette({
  base: '#1e1e2e',
  normal: '#cdd6f4',
  magic: '#89b4fa',
  rare: '#f9e2af',
  unique: '#fab387',
  currency: '#f9e2af',
  card: '#b4befe',
  gem: '#94e2d5',
  map: '#cdd6f4',
  gold: '#f9e2af',
  purple: '#cba6f7',
  green: '#a6e3a1',
  quest: { text: '#cdd6f4', border: '#fab387' },
  veiled: { text: '#f5c2e7', border: '#f5a9e0' },
  chase: { text: '#1a0a18', background: '#ea76cb' },
});

const DRACULA_PALETTE = buildPalette({
  base: '#282a36',
  normal: '#f8f8f2',
  magic: '#8be9fd',
  rare: '#f1fa8c',
  unique: '#ffb86c',
  currency: '#f1fa8c',
  card: '#bd93f9',
  gem: '#50fa7b',
  map: '#f8f8f2',
  gold: '#f1fa8c',
  purple: '#bd93f9',
  green: '#50fa7b',
  quest: { text: '#f8f8f2', border: '#ffb86c' },
  veiled: { text: '#ffb8de', border: '#ff79c6' },
  chase: { text: '#12001a', background: '#ff79c6' },
});

const NORD_PALETTE = buildPalette({
  base: '#2e3440',
  normal: '#d8dee9',
  magic: '#81a1c1',
  rare: '#ebcb8b',
  unique: '#d08770',
  currency: '#ebcb8b',
  card: '#5e81ac',
  gem: '#8fbcbb',
  map: '#d8dee9',
  gold: '#ebcb8b',
  purple: '#b48ead',
  green: '#a3be8c',
  quest: { text: '#eceff4', border: '#d08770' },
  veiled: { text: '#e3c2dc', border: '#b48ead' },
  chase: { text: '#191d24', background: '#bf616a' },
});

const SOLARIZED_PALETTE = buildPalette({
  base: '#002b36',
  normal: '#93a1a1',
  magic: '#268bd2',
  rare: '#b58900',
  unique: '#cb4b16',
  currency: '#b58900',
  card: '#6c71c4',
  gem: '#2aa198',
  map: '#839496',
  gold: '#b58900',
  purple: '#d33682',
  green: '#859900',
  quest: { text: '#eee8d5', border: '#cb4b16' },
  veiled: { text: '#e8a0c8', border: '#d33682' },
  chase: { text: '#001b22', background: '#d33682' },
});

const TOKYO_PALETTE = buildPalette({
  base: '#1a1b26',
  normal: '#c0caf5',
  magic: '#7aa2f7',
  rare: '#e0af68',
  unique: '#ff9e64',
  currency: '#e0af68',
  card: '#bb9af7',
  gem: '#73daca',
  map: '#c0caf5',
  gold: '#e0af68',
  purple: '#bb9af7',
  green: '#9ece6a',
  quest: { text: '#c0caf5', border: '#ff9e64' },
  veiled: { text: '#f5b8e0', border: '#ff5c9e' },
  chase: { text: '#1a0010', background: '#ff007c' },
});

const CONTRAST_PALETTE = buildPalette({
  base: '#000000',
  normal: '#ffffff',
  magic: '#ffffff',
  rare: '#ffffff',
  unique: '#ffffff',
  currency: '#ffffff',
  card: '#ffffff',
  gem: '#ffffff',
  map: '#ffffff',
  gold: '#ffffff',
  purple: '#ffffff',
  green: '#ffffff',
  quest: { text: '#ffffff', border: '#ffffff', background: '#000000' },
  veiled: { text: '#ffffff', border: '#ffffff', background: '#000000' },
  chase: { text: '#ffffff', background: '#000000' },
  flatBackgrounds: '#000000',
});

const MUTED_PALETTE = buildPalette({
  base: '#000000',
  normal: '#bebebe',
  magic: '#bebebe',
  rare: '#bebebe',
  unique: '#bebebe',
  currency: '#bebebe',
  card: '#bebebe',
  gem: '#bebebe',
  map: '#bebebe',
  gold: '#bebebe',
  purple: '#bebebe',
  green: '#bebebe',
  quest: { text: '#bebebe', border: '#bebebe', background: '#000000' },
  veiled: { text: '#bebebe', border: '#bebebe', background: '#000000' },
  chase: { text: '#bebebe', background: '#000000' },
  flatBackgrounds: '#000000',
});

const THEME_PALETTES: Record<ThemeId, ThemePalette> = {
  rarity: RARITY_PALETTE,
  contrast: CONTRAST_PALETTE,
  muted: MUTED_PALETTE,
  catppuccin: CATPPUCCIN_PALETTE,
  dracula: DRACULA_PALETTE,
  nord: NORD_PALETTE,
  'solarized-dark': SOLARIZED_PALETTE,
  'tokyo-night': TOKYO_PALETTE,
};

interface ThemeModifier {
  fontBump?: number;
  fontSize?: number;
  stripMedia?: boolean;
}

const THEME_MODIFIERS: Partial<Record<ThemeId, ThemeModifier>> = {
  contrast: { fontBump: 2 },
  muted: { fontSize: 32, stripMedia: true },
};

function backgroundFor(rule: Rule, palette: ThemePalette): Color {
  return rule.styleKind && Object.hasOwn(palette.backgrounds, rule.styleKind)
    ? (palette.backgrounds[rule.styleKind] ?? palette.base)
    : palette.base;
}

function withColors(
  rule: Rule,
  text: Color,
  border: Color,
  background: Color,
): Rule {
  return {
    ...rule,
    style: {
      ...rule.style,
      textColor: text,
      borderColor: border,
      backgroundColor: background,
    },
  };
}

/** Rarity first; currencies, gems, maps and cards keep their category colour. */
function paintRule(rule: Rule, palette: ThemePalette): Rule {
  if (!rule.style || rule.action === 'Hide') return rule;

  if (rule.styleKind === 'chase') {
    return withColors(
      rule,
      palette.chase.text,
      palette.chase.text,
      palette.chase.background,
    );
  }
  if (rule.section === 'quest' || rule.styleKind === 'quest') {
    return withColors(
      rule,
      palette.quest.text,
      palette.quest.border,
      palette.quest.background,
    );
  }
  if (rule.section === 'veiled' || rule.styleKind === 'veiled') {
    return withColors(
      rule,
      palette.veiled.text,
      palette.veiled.border,
      palette.veiled.background,
    );
  }
  // A rule that asks for unique styling gets it in any section, e.g. unique
  // maps inside the map rules.
  if (rule.styleKind === 'unique') {
    const background = backgroundFor(rule, palette);
    return withColors(rule, palette.colors.unique, palette.colors.unique, background);
  }

  const background = backgroundFor(rule, palette);

  switch (rule.section) {
    case 'currency':
      return rule.comment?.startsWith('Divination cards')
        ? withColors(rule, palette.colors.card, palette.colors.card, background)
        : withColors(
            rule,
            palette.colors.currency,
            palette.colors.currency,
            background,
          );
    case 'gems':
      return withColors(rule, palette.colors.gem, palette.colors.gem, background);
    case 'maps':
      return rule.comment === 'Map fragments'
        ? withColors(rule, palette.colors.gold, palette.colors.gold, background)
        : withColors(rule, palette.colors.map, palette.colors.map, background);
    case 'uniques':
    case 'league':
      return withColors(
        rule,
        palette.colors.unique,
        palette.colors.unique,
        background,
      );
    case 'custom':
      return rule.rarity
        ? withColors(
            rule,
            palette.rarity[rule.rarity],
            palette.rarity[rule.rarity],
            background,
          )
        : rule;
    default:
      if (rule.rarity) {
        const color = palette.rarity[rule.rarity];
        return withColors(rule, color, color, background);
      }
      // The six-socket rule intentionally keeps its link highlight colour.
      return {
        ...rule,
        style: { ...rule.style, backgroundColor: background },
      };
  }
}

function applyModifier(rule: Rule, modifier: ThemeModifier | undefined): Rule {
  if (!rule.style || rule.action === 'Hide') return rule;

  if (modifier?.stripMedia) {
    const {
      alertSound: _alertSound,
      minimapIcon: _minimapIcon,
      playEffect: _playEffect,
      ...rest
    } = rule.style;
    return { ...rule, style: { ...rest, fontSize: modifier.fontSize ?? 32 } };
  }

  if (modifier?.fontSize !== undefined) {
    return { ...rule, style: { ...rule.style, fontSize: modifier.fontSize } };
  }

  if (modifier?.fontBump) {
    return {
      ...rule,
      style: {
        ...rule.style,
        fontSize: Math.min(45, (rule.style.fontSize ?? 40) + modifier.fontBump),
      },
    };
  }

  return rule;
}

export function applyTheme(rules: readonly Rule[], theme: ThemeId): Rule[] {
  const palette = THEME_PALETTES[theme];
  const modifier = THEME_MODIFIERS[theme];
  return rules.map((rule) => applyModifier(paintRule(rule, palette), modifier));
}
