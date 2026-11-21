import { describe, expect, it } from 'vitest';
import { parseItemText } from '../demo/parse-item.ts';
import { evaluateRules, type PreviewItem } from '../preview/match.ts';
import { generateFilter } from './generate.ts';

const selection = { mode: 'family' as const, familyId: 'minion' as const };

const GOLD_RING = `Item Class: Rings
Rarity: Rare
Gold Ring
--------
Item Level: 47
--------
{ Implicit Modifier — Drop }
+12(6-15)% to Item Rarity
--------
Unidentified`;

function item(
  baseType: string,
  rarity: PreviewItem['rarity'],
  itemLevel = 47,
): PreviewItem {
  return {
    id: `${baseType}-${rarity}`,
    name: baseType,
    itemClass: 'Rings',
    baseType,
    rarity,
    itemLevel,
    identified: true,
  };
}

function result(
  sample: PreviewItem,
  phase: 'leveling' | 'endgame',
  strictness: 'normal' | 'strict' | 'very-strict',
) {
  const filter = generateFilter({ selection, phase, strictness });
  return evaluateRules(filter.rules, sample);
}

describe('hidden bases', () => {
  it('parses the reported unidentified rare Gold Ring', () => {
    const [ring] = parseItemText(GOLD_RING);
    expect(ring).toMatchObject({
      itemClass: 'Rings',
      baseType: 'Gold Ring',
      rarity: 'Rare',
      itemLevel: 47,
      identified: false,
    });
  });

  it('hides normal, magic and rare Gold Rings in every leveling preset', () => {
    for (const strictness of ['normal', 'strict', 'very-strict'] as const) {
      for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
        const found = result(item('Gold Ring', rarity), 'leveling', strictness);
        expect(found.shown, `${strictness}/${rarity}`).toBe(false);
        expect(found.reason).toContain('excluded base');
      }
    }
  });

  it('keeps unique Gold Rings such as Andvarius visible', () => {
    const found = result(item('Gold Ring', 'Unique'), 'leveling', 'normal');
    expect(found.shown).toBe(true);
    expect(found.reason).toBe('Uniques');
  });

  it('does not hide Gold Ring at endgame', () => {
    const found = result(item('Gold Ring', 'Rare', 85), 'endgame', 'normal');
    expect(found.shown).toBe(true);
  });

  it('leaves other ring bases visible while leveling', () => {
    const found = result(item('Amethyst Ring', 'Rare'), 'leveling', 'normal');
    expect(found.shown).toBe(true);
  });
});