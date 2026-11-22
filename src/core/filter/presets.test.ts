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
      highlightLinks: true,
    });
    expect(normal.gems.minQuality).toBe(1);
    expect(normal.currency.maxVisibleTier).toBe(2);
    expect(normal.maps.minTier).toBe(1);
    expect(normal.uniques.maxVisibleTier).toBe(3);

    const veryStrict = getPreset('endgame', 'very-strict');
    expect(veryStrict.gear.rareMinItemLevel).toBe(86);
    expect(veryStrict.gear.highlightLinks).toBe(false);
    expect(veryStrict.gems.minQuality).toBe(10);
    expect(veryStrict.currency.maxVisibleTier).toBe(2);
    expect(veryStrict.maps.minTier).toBe(15);
    expect(veryStrict.uniques.maxVisibleTier).toBe(2);
  });

  it('shows 4-links while leveling and in endgame normal', () => {
    for (const strictness of ['normal', 'strict', 'very-strict'] as const) {
      expect(
        getPreset('leveling', strictness).gear.highlightLinks,
        `leveling ${strictness}`,
      ).toBe(true);
    }
    expect(getPreset('endgame', 'normal').gear.highlightLinks).toBe(true);
    expect(getPreset('endgame', 'strict').gear.highlightLinks).toBe(false);
    expect(getPreset('endgame', 'very-strict').gear.highlightLinks).toBe(false);
  });

  it('hides poor uniques only at very strict', () => {
    for (const phase of ['leveling', 'endgame'] as const) {
      expect(getPreset(phase, 'normal').uniques.maxVisibleTier).toBe(3);
      expect(getPreset(phase, 'strict').uniques.maxVisibleTier).toBe(3);
      expect(getPreset(phase, 'very-strict').uniques.maxVisibleTier).toBe(2);
    }
  });

  it('disables map tier rules while leveling', () => {
    for (const strictness of ['normal', 'strict', 'very-strict'] as const) {
      expect(getPreset('leveling', strictness).maps.minTier).toBeNull();
    }
    expect(getPreset('leveling', 'normal').gems.minQuality).toBeNull();
    expect(getPreset('leveling', 'very-strict').gems.minQuality).toBe(5);
    expect(getPreset('leveling', 'normal').gear.magicMinItemLevel).toBe(10);
    expect(getPreset('leveling', 'strict').gear.magicMinItemLevel).toBe(80);
    expect(getPreset('leveling', 'very-strict').gear.magicMinItemLevel).toBeNull();
  });

  it('keeps one label and description for the whole preset', () => {
    const preset = getPreset('leveling', 'strict');
    expect(preset.label).toBe('Leveling · Strict');
    expect(preset.description).toContain('Acts and early maps');
  });
});