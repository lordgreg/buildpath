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

const REAVER_HELMET = `Item Class: Helmets
Rarity: Magic
Reaver Helmet
--------
Armour: 230
--------
Requirements:
Strength: 85
--------
Sockets: W
--------
Item Level: 42
--------
Unidentified`;

const HUSSAR_BRIGANDINE = `Item Class: Body Armours
Rarity: Magic
Hussar Brigandine
--------
Armour: 245
Evasion Rating: 245
--------
Requirements:
Str: 62
Dex: 62
--------
Sockets: W
--------
Item Level: 42
--------
Unidentified`;

const FOOTMAN_SWORD = `Item Class: Two Hand Swords
Rarity: Normal
Footman Sword
--------
Two Handed Sword
Physical Damage: 39-65
Critical Strike Chance: 5.00%
Attacks per Second: 1.45
Weapon Range: 1.3 metres
--------
Requirements:
Level: 40
Str: 57
Dex: 83
--------
Sockets: W-W-W-W
--------
Item Level: 41
--------
{ Implicit Modifier — Attack }
60% increased Global Accuracy Rating`;

const BURNISHED_FOIL = `Item Class: Thrusting One Hand Swords
Rarity: Rare
Burnished Foil
--------
One Handed Sword
Physical Damage: 25-46
Critical Strike Chance: 6.00%
Attacks per Second: 1.40
Weapon Range: 1.4 metres
--------
Requirements:
Dexterity: 131 (unmet)
--------
Sockets: W
--------
Item Level: 43
--------
{ Implicit Modifier — Damage, Critical }
+25% to Global Critical Strike Multiplier
--------
Unidentified`;

const HUBRIS_CIRCLET = `Item Class: Helmets
Rarity: Magic
Hubris Circlet
--------
Armour: 180
Energy Shield: 40
--------
Requirements:
Int: 69
--------
Sockets: W
--------
Item Level: 42
--------`;

const WAND = `Item Class: Wands
Rarity: Rare
Calling Wand
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

  it('hides magic helmets and body armours outside the minion bases', () => {
    for (const [label, text] of [
      ['str helmet', REAVER_HELMET],
      ['str/dex body armour', HUSSAR_BRIGANDINE],
    ] as const) {
      const [item] = parseItemText(text);
      expect(item, label).toBeTruthy();
      for (const phase of ['leveling', 'endgame'] as const) {
        for (const strictness of ['normal', 'strict', 'very-strict'] as const) {
          const filter = generateFilter({ selection, phase, strictness });
          const result = evaluateRules(filter.rules, item!);
          expect(
            result.shown,
            `${label} ${phase}/${strictness}: ${result.reason}`,
          ).toBe(false);
        }
      }
    }
  });

  it('hides a normal 4-link two-hand sword in the minion preset', () => {
    const [item] = parseItemText(FOOTMAN_SWORD);
    expect(item?.itemClass).toBe('Two Hand Swords');
    expect(item?.linkedSockets).toBe(4);

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

  it('hides a rare thrusting sword in the minion preset', () => {
    const [item] = parseItemText(BURNISHED_FOIL);
    expect(item?.itemClass).toBe('Thrusting One Hand Swords');
    expect(item?.baseType).toBe('Burnished Foil');

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

  it('keeps a magic int helmet visible while leveling', () => {
    const [item] = parseItemText(HUBRIS_CIRCLET);
    const filter = generateFilter({
      selection,
      phase: 'leveling',
      strictness: 'normal',
    });
    expect(evaluateRules(filter.rules, item!).shown).toBe(true);
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