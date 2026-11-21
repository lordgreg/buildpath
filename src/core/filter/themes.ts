import { COLORS, type Rule } from './types.ts';

export type ThemeId = 'classic' | 'contrast' | 'muted';

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  hint: string;
}

export const THEMES: ThemeDefinition[] = [
  { id: 'classic', label: 'Classic', hint: 'FilterPath defaults' },
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

export function applyTheme(rules: readonly Rule[], theme: ThemeId): Rule[] {
  if (theme === 'classic') return [...rules];

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
        fontSize: 32,
      },
    };
  });
}

export function isThemeId(value: unknown): value is ThemeId {
  return value === 'classic' || value === 'contrast' || value === 'muted';
}