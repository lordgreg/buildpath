import { describe, expect, it } from 'vitest';
import { getPreset } from './presets.ts';

describe('composed presets', () => {
  it('names each section preset', () => {
    const preset = getPreset('endgame', 'strict');
    expect(preset.id).toBe('endgame-strict');
    expect(preset.gear.id).toBe('preset-gear-endgame-strict');
    expect(preset.gems.id).toBe('preset-gems-endgame-strict');
    expect(preset.currency.id).toBe('preset-currency-endgame-strict');
    expect(preset.maps.id).toBe('preset-maps-endgame-strict');
    expect(preset.uniques.id).toBe('preset-uniques-endgame-strict');
    expect(preset.junk.id).toBe('preset-junk-endgame-strict');
  });

  it('keeps the section values intact', () => {
    const normal = getPreset('endgame', 'normal');
    expect(normal.gear).toMatchObject({
      rareMinItemLevel: 80,
      magicMinItemLevel: null,
      highlightLinks: false,
    });
    expect(normal.gems.minQuality).toBe(1);
    expect(normal.currency.maxVisibleTier).toBe(2);
    expect(normal.maps.minTier).toBe(1);

    const veryStrict = getPreset('endgame', 'very-strict');
    expect(veryStrict.gear.rareMinItemLevel).toBe(86);
    expect(veryStrict.gems.minQuality).toBe(10);
    expect(veryStrict.currency.maxVisibleTier).toBe(1);
    expect(veryStrict.maps.minTier).toBe(15);
  });

  it('disables map tier rules while leveling', () => {
    for (const strictness of ['normal', 'strict', 'very-strict'] as const) {
      expect(getPreset('leveling', strictness).maps.minTier).toBeNull();
    }
    expect(getPreset('leveling', 'normal').gems.minQuality).toBeNull();
    expect(getPreset('leveling', 'very-strict').gems.minQuality).toBe(5);
  });

  it('keeps one label and description for the whole preset', () => {
    const preset = getPreset('leveling', 'strict');
    expect(preset.label).toBe('Leveling · Strict');
    expect(preset.description).toContain('Acts and early maps');
  });
});