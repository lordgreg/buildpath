import { COLORS, type Color, type Rarity, type Rule } from './types.ts';

export type ThemeId = 'classic' | 'contrast' | 'muted';

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  hint: string;
}

export const THEMES: ThemeDefinition[] = [
  { id: 'classic', label: 'Rarity', hint: 'Rarity text and borders, black background' },
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

function withColors(rule: Rule, text: Color, border: Color): Rule {
  return {
    ...rule,
    style: {
      ...rule.style,
      textColor: text,
      borderColor: border,
      backgroundColor: COLORS.black,
    },
  };
}

/** Rarity first; currencies, gems, maps and cards keep their default colours. */
function rarityRule(rule: Rule): Rule {
  if (!rule.style || rule.action === 'Hide') return rule;

  switch (rule.section) {
    case 'currency':
      return rule.comment?.startsWith('Divination cards')
        ? withColors(rule, COLORS.card, COLORS.card)
        : withColors(rule, COLORS.gold, COLORS.gold);
    case 'gems':
      return withColors(rule, COLORS.gem, COLORS.gem);
    case 'maps':
      return rule.comment === 'Map fragments'
        ? withColors(rule, COLORS.gold, COLORS.gold)
        : withColors(rule, COLORS.map, COLORS.map);
    case 'uniques':
      return withColors(rule, COLORS.orange, COLORS.orange);
    case 'custom':
      return rule.rarity
        ? withColors(rule, RARITY_COLORS[rule.rarity], RARITY_COLORS[rule.rarity])
        : rule;
    default:
      if (rule.rarity) {
        const color = RARITY_COLORS[rule.rarity];
        return withColors(rule, color, color);
      }
      // The six-socket rule intentionally keeps its link highlight colour.
      return {
        ...rule,
        style: { ...rule.style, backgroundColor: COLORS.black },
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