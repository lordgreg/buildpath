import { describe, expect, it } from 'vitest';
import { parseItemText } from '../demo/parse-item.ts';
import { evaluateRules } from '../preview/match.ts';
import { generateFilter } from './generate.ts';

const SCEPTRE = `Item Class: Sceptres
Rarity: Rare
Shadow Sceptre
--------
Sceptre
Physical Damage: 29-44
Critical Strike Chance: 7.30%
Attacks per Second: 1.25
Weapon Range: 1.1 metres
--------
Requirements:
Str: 52
Int: 62
--------
Sockets: W-W W
--------
Item Level: 42
--------
{ Implicit Modifier — Damage, Elemental }
22% increased Elemental Damage
--------
Unidentified`;

const SWORD = `Item Class: One Hand Swords
Rarity: Rare
Baselard
--------
One Handed Sword
Physical Damage: 37-53
Critical Strike Chance: 5.00%
Attacks per Second: 1.30
Weapon Range: 1.1 metres
--------
Requirements:
Str: 72
Dex: 72
--------
Sockets: R W
--------
Item Level: 43
--------
{ Implicit Modifier — Attack }
40% increased Global Accuracy Rating
--------
Unidentified`;

const WAND = `Item Class: Wands
Rarity: Rare
Profane Wand
--------
Wand
Physical Damage: 20-37
Critical Strike Chance: 7.00%
Attacks per Second: 1.30
--------
Item Level: 42
--------`;

const selection = { mode: 'family', familyId: 'minion' } as const;

describe('unused-slot rares', () => {
  it('hides a rare sceptre in the minion preset at every phase and strictness', () => {
    const [item] = parseItemText(SCEPTRE);
    expect(item?.itemClass).toBe('Sceptres');
    expect(item?.baseType).toBe('Shadow Sceptre');

    for (const phase of ['leveling', 'endgame'] as const) {
      for (const strictness of ['normal', 'strict', 'very-strict'] as const) {
        const filter = generateFilter({ selection, phase, strictness });
        const result = evaluateRules(filter.rules, item!);
        expect(
          result.shown,
          `${phase}/${strictness}: ${result.reason}`,
        ).toBe(false);
      }
    }
  });

  it('hides a rare one-hand sword in the minion preset at every phase and strictness', () => {
    const [item] = parseItemText(SWORD);
    expect(item?.itemClass).toBe('One Hand Swords');
    expect(item?.baseType).toBe('Baselard');

    for (const phase of ['leveling', 'endgame'] as const) {
      for (const strictness of ['normal', 'strict', 'very-strict'] as const) {
        const filter = generateFilter({ selection, phase, strictness });
        const result = evaluateRules(filter.rules, item!);
        expect(
          result.shown,
          `${phase}/${strictness}: ${result.reason}`,
        ).toBe(false);
      }
    }
  });

  it('keeps a rare wand visible while leveling', () => {
    const [item] = parseItemText(WAND);
    const filter = generateFilter({
      selection,
      phase: 'leveling',
      strictness: 'normal',
    });
    expect(evaluateRules(filter.rules, item!).shown).toBe(true);
  });
});