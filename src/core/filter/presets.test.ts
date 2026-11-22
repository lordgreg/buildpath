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
    const normal = getPreset('endgame', 'soft');
    expect(normal.gear).toMatchObject({
      rareMinItemLevel: 80,
      normalMinItemLevel: 68,
      magicMinItemLevel: 75,
      highlightLinks: true,
    });
    expect(normal.gems.minQuality).toBe(1);
    expect(normal.currency.maxVisibleTier).toBe(3);
    expect(normal.maps.minTier).toBe(1);
    expect(normal.uniques.maxVisibleTier).toBe(3);

    const veryStrict = getPreset('endgame', 'uber');
    expect(veryStrict.gear.rareMinItemLevel).toBe(86);
    expect(veryStrict.gear.highlightLinks).toBe(false);
    expect(veryStrict.gems.minQuality).toBe(10);
    expect(veryStrict.currency.maxVisibleTier).toBe(2);
    expect(veryStrict.maps.minTier).toBe(15);
    expect(veryStrict.uniques.maxVisibleTier).toBe(2);
  });

  it('shows 4-links while leveling and in endgame normal', () => {
    for (const strictness of ['soft', 'strict', 'uber'] as const) {
      expect(
        getPreset('leveling', strictness).gear.highlightLinks,
        `leveling ${strictness}`,
      ).toBe(true);
    }
    expect(getPreset('endgame', 'soft').gear.highlightLinks).toBe(true);
    expect(getPreset('endgame', 'strict').gear.highlightLinks).toBe(false);
    expect(getPreset('endgame', 'uber').gear.highlightLinks).toBe(false);
  });

  it('hides poor uniques only at very strict', () => {
    for (const phase of ['leveling', 'endgame'] as const) {
      expect(getPreset(phase, 'soft').uniques.maxVisibleTier).toBe(3);
      expect(getPreset(phase, 'strict').uniques.maxVisibleTier).toBe(3);
      expect(getPreset(phase, 'uber').uniques.maxVisibleTier).toBe(2);
    }
  });

  it('disables map tier rules while leveling', () => {
    for (const strictness of ['soft', 'strict', 'uber'] as const) {
      expect(getPreset('leveling', strictness).maps.minTier).toBeNull();
    }
    expect(getPreset('leveling', 'soft').gems.minQuality).toBeNull();
    expect(getPreset('leveling', 'uber').gems.minQuality).toBe(5);
    expect(getPreset('leveling', 'soft').gear.magicMinItemLevel).toBe(10);
    expect(getPreset('leveling', 'strict').gear.magicMinItemLevel).toBe(80);
    expect(getPreset('leveling', 'uber').gear.magicMinItemLevel).toBe(85);
  });

  it('raises the white and blue floors with strictness', () => {
    const whites: Record<string, [number, number, number]> = {
      leveling: [0, 68, 75],
      endgame: [68, 75, 80],
    };
    const blues: Record<string, [number, number, number]> = {
      leveling: [10, 80, 85],
      endgame: [75, 80, 85],
    };
    for (const phase of ['leveling', 'endgame'] as const) {
      (['soft', 'strict', 'uber'] as const).forEach(
        (strictness, index) => {
          const gear = getPreset(phase, strictness).gear;
          expect(gear.normalMinItemLevel, `${phase}/${strictness} white`).toBe(
            whites[phase]![index],
          );
          expect(gear.magicMinItemLevel, `${phase}/${strictness} blue`).toBe(
            blues[phase]![index],
          );
        },
      );
    }
  });

  it('shows all currency at normal and hides the vendor tier above it', () => {
    for (const phase of ['leveling', 'endgame'] as const) {
      expect(getPreset(phase, 'soft').currency.maxVisibleTier).toBe(3);
      expect(getPreset(phase, 'strict').currency.maxVisibleTier).toBe(2);
      expect(getPreset(phase, 'uber').currency.maxVisibleTier).toBe(2);
    }
  });

  it('keeps one label and description for the whole preset', () => {
    const preset = getPreset('leveling', 'strict');
    expect(preset.label).toBe('Leveling · Strict');
    expect(preset.description).toContain('Acts and early maps');
  });
});