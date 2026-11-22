import {
  COLORS,
  type Color,
  type Rarity,
  type Rule,
  type StyleKind,
} from './types.ts';

export type ThemeId = 'classic' | 'contrast' | 'muted';

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  hint: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'classic',
    label: 'Rarity',
    hint: 'Rarity text and borders, category backgrounds',
  },
  {
    id: 'contrast',
    label: 'High contrast',
    hint: 'White labels, black background, louder borders',
  },
  {
    id: 'muted',
    label: 'Muted',
    hint: 'Grey labels, no sounds or minimap icons',
  },
];

const RARITY_COLORS: Record<Rarity, Color> = {
  Normal: COLORS.white,
  Magic: COLORS.blue,
  Rare: COLORS.yellow,
  Unique: COLORS.orange,
};

/** Category backgrounds. Anything absent keeps the black backdrop. */
const STYLE_BACKGROUNDS: Partial<Record<StyleKind, Color>> = {
  's-tier': COLORS.sTier,
  'jewel-best': COLORS.jewelBest,
  card: COLORS.cardBg,
  flask: COLORS.flaskBg,
  fragment: COLORS.fragmentBg,
  gem: COLORS.gemBg,
  gold: COLORS.goldBg,
  jewel: COLORS.jewelBg,
  league: COLORS.leagueBg,
};

function backgroundFor(rule: Rule): Color {
  return (rule.styleKind && STYLE_BACKGROUNDS[rule.styleKind]) ?? COLORS.black;
}

function withColors(
  rule: Rule,
  text: Color,
  border: Color,
  background: Color = COLORS.black,
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

/** Rarity first; currencies, gems, maps and cards keep their default colours. */
function rarityRule(rule: Rule): Rule {
  if (!rule.style || rule.action === 'Hide') return rule;

  const background = backgroundFor(rule);

  switch (rule.section) {
    case 'currency':
      return rule.comment?.startsWith('Divination cards')
        ? withColors(rule, COLORS.card, COLORS.card, background)
        : withColors(rule, COLORS.gold, COLORS.gold, background);
    case 'gems':
      return withColors(rule, COLORS.gem, COLORS.gem, background);
    case 'maps':
      return rule.comment === 'Map fragments'
        ? withColors(rule, COLORS.gold, COLORS.gold, background)
        : withColors(rule, COLORS.map, COLORS.map, background);
    case 'uniques':
      return withColors(rule, COLORS.orange, COLORS.orange, background);
    case 'league':
      return withColors(rule, COLORS.orange, COLORS.orange, background);
    case 'custom':
      return rule.rarity
        ? withColors(
            rule,
            RARITY_COLORS[rule.rarity],
            RARITY_COLORS[rule.rarity],
            background,
          )
        : rule;
    default:
      if (rule.rarity) {
        const color = RARITY_COLORS[rule.rarity];
        return withColors(rule, color, color, background);
      }
      // The six-socket rule intentionally keeps its link highlight colour.
      return {
        ...rule,
        style: { ...rule.style, backgroundColor: background },
      };
  }
}

export function applyTheme(rules: readonly Rule[], theme: ThemeId): Rule[] {
  if (theme === 'classic') return rules.map(rarityRule);

  return rules.map((rule) => {
    if (!rule.style || rule.action === 'Hide') return rule;

    if (theme === 'contrast') {
      return {
        ...rule,
        style: {
          ...rule.style,
          textColor: COLORS.white,
          borderColor: COLORS.white,
          backgroundColor: COLORS.black,
          fontSize: Math.min(45, (rule.style.fontSize ?? 40) + 2),
        },
      };
    }

    const {
      alertSound: _alertSound,
      minimapIcon: _minimapIcon,
      playEffect: _playEffect,
      ...rest
    } = rule.style;

    return {
      ...rule,
      style: {
        ...rest,
        textColor: COLORS.grey,
        borderColor: COLORS.grey,
        backgroundColor: COLORS.black,
        fontSize: 32,
      },
    };
  });
}

export function isThemeId(value: unknown): value is ThemeId {
  return value === 'classic' || value === 'contrast' || value === 'muted';
}