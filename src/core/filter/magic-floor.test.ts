import { describe, expect, it } from 'vitest';
import { evaluateRules, type PreviewItem } from '../preview/match.ts';
import { generateFilter } from './generate.ts';

const selection = {
  mode: 'ascendancy' as const,
  ascendancyId: 'necromancer',
};

function item(
  name: string,
  itemClass: string,
  itemLevel: number,
): PreviewItem {
  return {
    id: name,
    name,
    itemClass,
    baseType: name,
    rarity: 'Magic',
    itemLevel,
    identified: true,
  };
}

function shownAt(
  sample: PreviewItem,
  phase: 'leveling' | 'endgame',
  strictness: 'soft' | 'strict' | 'uber',
): boolean {
  const filter = generateFilter({ selection, phase, strictness });
  return evaluateRules(filter.rules, sample).shown;
}

describe('leveling strict magic floor', () => {
  it('hides the reported magic ring at leveling strict', () => {
    const ring = item('Topaz Ring', 'Rings', 43);
    expect(shownAt(ring, 'leveling', 'soft')).toBe(true);
    expect(shownAt(ring, 'leveling', 'strict')).toBe(false);
    expect(shownAt(ring, 'leveling', 'uber')).toBe(false);
    expect(shownAt(ring, 'endgame', 'soft')).toBe(false);
    expect(shownAt(ring, 'endgame', 'strict')).toBe(false);
    expect(shownAt(ring, 'endgame', 'uber')).toBe(false);
  });

  it('shows an allowed base at ilvl 80+ only', () => {
    const high = item('Hubris Circlet', 'Helmets', 80);
    const low = item('Hubris Circlet', 'Helmets', 79);
    expect(shownAt(high, 'leveling', 'strict')).toBe(true);
    expect(shownAt(low, 'leveling', 'strict')).toBe(false);
  });

  it('does not revive wrong bases at ilvl 80+', () => {
    const strengthHelmet = item('Reaver Helmet', 'Helmets', 80);
    expect(shownAt(strengthHelmet, 'leveling', 'strict')).toBe(false);
  });

  it('allows an ilvl 80+ magic ring because rings are an allowed base', () => {
    const highRing = item('Topaz Ring', 'Rings', 80);
    expect(shownAt(highRing, 'leveling', 'strict')).toBe(true);
  });
});
