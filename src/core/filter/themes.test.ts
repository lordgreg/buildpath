import { describe, expect, it } from 'vitest';
import { applyTheme, isThemeId } from './themes.ts';
import type { Rule } from './types.ts';

const rules: Rule[] = [
  {
    action: 'Show',
    comment: 'rare ring',
    style: {
      textColor: [1, 2, 3],
      borderColor: [4, 5, 6],
      backgroundColor: [7, 8, 9],
      fontSize: 40,
      alertSound: 3,
      minimapIcon: { size: 1, color: 'Green', shape: 'Hexagon' },
    },
  },
  { action: 'Hide', comment: 'junk' },
];

describe('filter themes', () => {
  it('keeps classic untouched', () => {
    expect(applyTheme(rules, 'classic')).toEqual(rules);
  });

  it('makes contrast rules white on black', () => {
    const themed = applyTheme(rules, 'contrast');
    expect(themed[0]?.style).toMatchObject({
      textColor: [255, 255, 255, 255],
      borderColor: [255, 255, 255, 255],
      backgroundColor: [0, 0, 0, 255],
      fontSize: 42,
    });
  });

  it('strips sound and icons when muted', () => {
    const themed = applyTheme(rules, 'muted');
    expect(themed[0]?.style?.alertSound).toBeUndefined();
    expect(themed[0]?.style?.minimapIcon).toBeUndefined();
    expect(themed[0]?.style?.fontSize).toBe(32);
    expect(themed[1]).toEqual(rules[1]);
  });

  it('validates theme ids', () => {
    expect(isThemeId('classic')).toBe(true);
    expect(isThemeId('neon')).toBe(false);
  });
});