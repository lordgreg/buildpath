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
    areaLevel: 45,
    identified: true,
  };
}

function result(
  sample: PreviewItem,
  phase: 'leveling' | 'endgame',
  strictness: 'soft' | 'strict' | 'uber',
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
    for (const strictness of ['soft', 'strict', 'uber'] as const) {
      for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
        const found = result(item('Gold Ring', rarity), 'leveling', strictness);
        expect(found.shown, `${strictness}/${rarity}`).toBe(false);
        expect(found.reason).toContain('excluded base');
      }
    }
  });

  it('keeps unique Gold Rings such as Andvarius visible', () => {
    const found = result(item('Gold Ring', 'Unique'), 'leveling', 'soft');
    expect(found.shown).toBe(true);
    expect(found.reason).toBe('Uniques');
  });

  it('does not hide Gold Ring at endgame', () => {
    const found = result(item('Gold Ring', 'Rare', 85), 'endgame', 'soft');
    expect(found.shown).toBe(true);
  });

  it('leaves other ring bases visible while leveling', () => {
    const found = result(item('Amethyst Ring', 'Rare'), 'leveling', 'soft');
    expect(found.shown).toBe(true);
  });
});

const NECROMANCER = {
  mode: 'ascendancy' as const,
  ascendancyId: 'necromancer',
};

const CLOTH_BELT = `Item Class: Belts
Rarity: Rare
Fated Cloth Belt
Cloth Belt
--------
Item Level: 48
--------
{ Implicit Modifier }
12(10-15)% increased Stun and Block Recovery
--------
Unidentified`;

function belt(
  baseType: string,
  rarity: PreviewItem['rarity'],
  itemLevel = 48,
): PreviewItem {
  return {
    id: `${baseType}-${rarity}`,
    name: baseType,
    itemClass: 'Belts',
    baseType,
    rarity,
    itemLevel,
    areaLevel: 45,
    identified: true,
  };
}

function necroResult(
  sample: PreviewItem,
  phase: 'leveling' | 'endgame',
  strictness: 'soft' | 'strict' | 'uber',
) {
  const filter = generateFilter({
    selection: NECROMANCER,
    phase,
    strictness,
  });
  return evaluateRules(filter.rules, sample);
}

describe('ascendancy excluded bases', () => {
  it('parses the reported Fated Cloth Belt', () => {
    const [parsed] = parseItemText(CLOTH_BELT);
    expect(parsed).toMatchObject({
      itemClass: 'Belts',
      baseType: 'Cloth Belt',
      rarity: 'Rare',
      itemLevel: 48,
    });
  });

  it('hides rare and magic Cloth Belts for the Necromancer in every preset', () => {
    for (const phase of ['leveling', 'endgame'] as const) {
      for (const strictness of [
        'soft',
        'strict',
        'uber',
      ] as const) {
        for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
          const found = necroResult(belt('Cloth Belt', rarity), phase, strictness);
          expect(found.shown, `${phase}/${strictness}/${rarity}`).toBe(false);
          expect(found.reason).toContain('excluded base');
        }
      }
    }
  });

  it('keeps unique Cloth Belts visible', () => {
    const found = necroResult(belt('Cloth Belt', 'Unique'), 'endgame', 'soft');
    expect(found.shown).toBe(true);
  });

  it('leaves Cloth Belts visible for other ascendancies', () => {
    const filter = generateFilter({
      selection: { mode: 'ascendancy', ascendancyId: 'elementalist' },
      phase: 'leveling',
      strictness: 'soft',
    });
    const found = evaluateRules(filter.rules, belt('Cloth Belt', 'Rare'));
    expect(found.shown).toBe(true);
  });
});

function ring(
  baseType: string,
  rarity: PreviewItem['rarity'],
  itemLevel = 49,
  areaLevel?: number,
): PreviewItem {
  return {
    id: `${baseType}-${rarity}`,
    name: baseType,
    itemClass: 'Rings',
    baseType,
    rarity,
    itemLevel,
    ...(areaLevel !== undefined ? { areaLevel } : {}),
    identified: true,
  };
}

const PHOENIX_GRIP = `Item Class: Rings
Rarity: Rare
Phoenix Grip
Iron Ring
--------
Requirements:
Level: 32
--------
Item Level: 49
--------
{ Implicit Modifier — Damage, Physical, Attack }
Adds 1 to 4 Physical Damage to Attacks
--------
{ Prefix Modifier "Cerulean" (Tier: 9) — Mana }
+39(35-39) to maximum Mana
{ Suffix Modifier "of Consumption" (Tier: 4) — Mana }
Gain 11(11-15) Mana per Enemy Killed
{ Suffix Modifier "of the Seal" (Tier: 7) — Elemental, Cold, Resistance }
+14(12-17)% to Cold Resistance
{ Suffix Modifier "of Excitement" (Tier: 6) — Mana }
18(10-19)% increased Mana Regeneration Rate`;

describe('family excluded bases', () => {
  const CASTER_SELECTIONS = [
    { mode: 'family' as const, familyId: 'caster' as const },
    { mode: 'ascendancy' as const, ascendancyId: 'elementalist' },
  ];

  it('parses and hides the reported Phoenix Grip Iron Ring for casters', () => {
    const [parsed] = parseItemText(PHOENIX_GRIP);
    expect(parsed).toMatchObject({
      itemClass: 'Rings',
      baseType: 'Iron Ring',
      rarity: 'Rare',
      itemLevel: 49,
    });
    for (const selection of CASTER_SELECTIONS) {
      const filter = generateFilter({
        selection,
        phase: 'leveling',
        strictness: 'soft',
      });
      const found = evaluateRules(filter.rules, parsed!);
      expect(found.shown).toBe(false);
      expect(found.reason).toContain('excluded base');
    }
  });

  it('hides rare Iron Rings for caster builds', () => {
    for (const selection of CASTER_SELECTIONS) {
      const filter = generateFilter({
        selection,
        phase: 'leveling',
        strictness: 'soft',
      });
      const found = evaluateRules(filter.rules, ring('Iron Ring', 'Rare'));
      expect(found.shown).toBe(false);
      expect(found.reason).toContain('excluded base');
    }
  });

  it('keeps unique Iron Rings visible for casters', () => {
    const filter = generateFilter({
      selection: CASTER_SELECTIONS[0]!,
      phase: 'leveling',
      strictness: 'soft',
    });
    const found = evaluateRules(filter.rules, ring('Iron Ring', 'Unique'));
    expect(found.shown).toBe(true);
  });

  it('does not exclude Iron Rings for attack builds', () => {
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'bow' },
      phase: 'leveling',
      strictness: 'soft',
    });
    const found = evaluateRules(filter.rules, ring('Iron Ring', 'Rare'));
    expect(found.shown).toBe(true);
  });

  it('hides Cloth Belts for the minion family like the Necromancer', () => {
    for (const phase of ['leveling', 'endgame'] as const) {
      for (const strictness of [
        'soft',
        'strict',
        'uber',
      ] as const) {
        const filter = generateFilter({
          selection: { mode: 'family', familyId: 'minion' },
          phase,
          strictness,
        });
        const found = evaluateRules(filter.rules, belt('Cloth Belt', 'Rare'));
        expect(found.shown, `${phase}/${strictness}`).toBe(false);
        expect(found.reason).toContain('excluded base');
      }
    }
  });

  it('keeps unique Cloth Belts visible for the minion family', () => {
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'leveling',
      strictness: 'soft',
    });
    const found = evaluateRules(filter.rules, belt('Cloth Belt', 'Unique'));
    expect(found.shown).toBe(true);
  });
});

const CORAL_AMULET = `Item Class: Amulets
Rarity: Rare
Coral Amulet
--------
Item Level: 53
--------
{ Implicit Modifier — Life }
Regenerate 3.9(2-4) Life per second
--------
Unidentified`;

function amulet(
  baseType: string,
  rarity: PreviewItem['rarity'],
  itemLevel = 53,
): PreviewItem {
  return {
    id: `${baseType}-${rarity}`,
    name: baseType,
    itemClass: 'Amulets',
    baseType,
    rarity,
    itemLevel,
    identified: true,
  };
}

describe('minion amulet exclusions', () => {
  const MINION_SELECTIONS = [
    { mode: 'family' as const, familyId: 'minion' as const },
    { mode: 'ascendancy' as const, ascendancyId: 'necromancer' },
  ];
  const REGEN_AMULETS = [
    'Coral Amulet',
    'Marble Amulet',
    'Blue Pearl Amulet',
  ];

  it('parses the reported unidentified rare Coral Amulet', () => {
    const [parsed] = parseItemText(CORAL_AMULET);
    expect(parsed).toMatchObject({
      itemClass: 'Amulets',
      baseType: 'Coral Amulet',
      rarity: 'Rare',
      itemLevel: 53,
      identified: false,
    });
  });

  it('hides normal, magic and rare regen amulets for minion builds', () => {
    for (const selection of MINION_SELECTIONS) {
      for (const base of REGEN_AMULETS) {
        for (const phase of ['leveling', 'endgame'] as const) {
          for (const strictness of ['soft', 'strict', 'uber'] as const) {
            for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
              const filter = generateFilter({ selection, phase, strictness });
              const found = evaluateRules(filter.rules, amulet(base, rarity));
              expect(
                found.shown,
                `${selection.mode}/${base}/${phase}/${strictness}/${rarity}`,
              ).toBe(false);
              expect(found.reason).toContain('excluded base');
            }
          }
        }
      }
    }
  });

  it('keeps unique regen amulets visible', () => {
    for (const base of REGEN_AMULETS) {
      const filter = generateFilter({
        selection: MINION_SELECTIONS[0]!,
        phase: 'leveling',
        strictness: 'soft',
      });
      const found = evaluateRules(filter.rules, amulet(base, 'Unique'));
      expect(found.shown, base).toBe(true);
    }
  });

  it('keeps other amulet bases visible for minion builds', () => {
    const filter = generateFilter({
      selection: MINION_SELECTIONS[0]!,
      phase: 'leveling',
      strictness: 'soft',
    });
    const found = evaluateRules(filter.rules, amulet('Onyx Amulet', 'Rare'));
    expect(found.shown).toBe(true);
  });
});

describe('minion belt allowlist', () => {
  const MINION_SELECTIONS = [
    { mode: 'family' as const, familyId: 'minion' as const },
    { mode: 'ascendancy' as const, ascendancyId: 'necromancer' },
  ];
  const STR_BELTS = ['Rustic Sash', 'Studded Belt', 'Heavy Belt'];

  it('hides rare str belts for minion builds in every preset', () => {
    for (const selection of MINION_SELECTIONS) {
      for (const base of STR_BELTS) {
        for (const phase of ['leveling', 'endgame'] as const) {
          for (const strictness of ['soft', 'strict', 'uber'] as const) {
            const filter = generateFilter({ selection, phase, strictness });
            const found = evaluateRules(filter.rules, belt(base, 'Rare', 86));
            expect(
              found.shown,
              `${selection.mode}/${base}/${phase}/${strictness}`,
            ).toBe(false);
            expect(found.reason).toContain('bases this build does not use');
          }
        }
      }
    }
  });

  it('keeps rare Leather Belts visible for minion builds', () => {
    for (const selection of MINION_SELECTIONS) {
      for (const phase of ['leveling', 'endgame'] as const) {
        const filter = generateFilter({ selection, phase, strictness: 'uber' });
        const found = evaluateRules(
          filter.rules,
          belt('Leather Belt', 'Rare', 86),
        );
        expect(found.shown, `${selection.mode}/${phase}`).toBe(true);
      }
    }
  });

  it('keeps unique str belts visible for minion builds', () => {
    const filter = generateFilter({
      selection: MINION_SELECTIONS[0]!,
      phase: 'leveling',
      strictness: 'soft',
    });
    const found = evaluateRules(filter.rules, belt('Heavy Belt', 'Unique', 86));
    expect(found.shown).toBe(true);
  });

  it('leaves str belts visible for other builds', () => {
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'melee' },
      phase: 'leveling',
      strictness: 'soft',
    });
    const found = evaluateRules(filter.rules, belt('Rustic Sash', 'Rare', 86));
    expect(found.shown).toBe(true);
  });
});

const FATED_IRON_RING = `Item Class: Rings
Rarity: Rare
Fated Iron Ring
Iron Ring
--------
Item Level: 58
--------
{ Implicit Modifier — Damage, Physical, Attack }
Adds 1 to 4 Physical Damage to Attacks
--------
Unidentified`;

describe('minion Iron Ring exclusion', () => {
  const MINION_SELECTIONS = [
    { mode: 'family' as const, familyId: 'minion' as const },
    { mode: 'ascendancy' as const, ascendancyId: 'necromancer' },
  ];

  it('parses the reported unidentified rare Fated Iron Ring', () => {
    const [parsed] = parseItemText(FATED_IRON_RING);
    expect(parsed).toMatchObject({
      itemClass: 'Rings',
      baseType: 'Iron Ring',
      rarity: 'Rare',
      itemLevel: 58,
      identified: false,
    });
  });

  it('hides normal, magic and rare Iron Rings for minion builds in every preset', () => {
    for (const selection of MINION_SELECTIONS) {
      for (const phase of ['leveling', 'endgame'] as const) {
        for (const strictness of ['soft', 'strict', 'uber'] as const) {
          for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
            const filter = generateFilter({ selection, phase, strictness });
            const found = evaluateRules(filter.rules, ring('Iron Ring', rarity));
            expect(
              found.shown,
              `${selection.mode}/${phase}/${strictness}/${rarity}`,
            ).toBe(false);
            expect(found.reason).toContain('excluded base');
          }
        }
      }
    }
  });

  it('keeps unique Iron Rings visible for minion builds', () => {
    for (const selection of MINION_SELECTIONS) {
      const filter = generateFilter({
        selection,
        phase: 'leveling',
        strictness: 'soft',
      });
      const found = evaluateRules(filter.rules, ring('Iron Ring', 'Unique'));
      expect(found.shown, selection.mode).toBe(true);
    }
  });
});

describe('melee accessory bases', () => {
  const MELEE_SELECTIONS = [
    { mode: 'family' as const, familyId: 'melee' as const },
    { mode: 'ascendancy' as const, ascendancyId: 'juggernaut' },
    { mode: 'build' as const, buildId: 'boneshatter-juggernaut' },
  ];

  it('hides Chain Belts at every rarity for melee builds', () => {
    for (const selection of MELEE_SELECTIONS) {
      for (const phase of ['leveling', 'endgame'] as const) {
        for (const strictness of ['soft', 'strict', 'uber'] as const) {
          for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
            const filter = generateFilter({ selection, phase, strictness });
            const found = evaluateRules(filter.rules, belt('Chain Belt', rarity));
            expect(
              found.shown,
              `${selection.mode}/${phase}/${strictness}/${rarity}`,
            ).toBe(false);
            expect(found.reason).toContain('excluded base');
          }
        }
      }
    }
  });

  it('hides normal and magic Paua Rings but keeps rare ones', () => {
    for (const selection of MELEE_SELECTIONS) {
      for (const strictness of ['soft', 'strict', 'uber'] as const) {
        const filter = generateFilter({
          selection,
          phase: 'leveling',
          strictness,
        });
        for (const rarity of ['Normal', 'Magic'] as const) {
          const found = evaluateRules(
            filter.rules,
            ring('Paua Ring', rarity, 13, 13),
          );
          expect(
            found.shown,
            `${selection.mode}/${strictness}/${rarity}`,
          ).toBe(false);
          expect(found.reason).toContain('excluded base');
        }
        const rare = evaluateRules(
          filter.rules,
          ring('Paua Ring', 'Rare', 30, 30),
        );
        expect(rare.shown, `${selection.mode}/${strictness}/Rare`).toBe(true);
      }
    }
  });

  it('keeps unique Paua Rings such as Doedre\'s Damning visible', () => {
    for (const selection of MELEE_SELECTIONS) {
      const filter = generateFilter({
        selection,
        phase: 'leveling',
        strictness: 'soft',
      });
      const found = evaluateRules(filter.rules, ring('Paua Ring', 'Unique'));
      expect(found.shown, selection.mode).toBe(true);
    }
  });

  it('leaves other melee ring bases visible', () => {
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'melee' },
      phase: 'leveling',
      strictness: 'soft',
    });
    const magic = evaluateRules(filter.rules, ring('Amethyst Ring', 'Magic', 13, 13));
    expect(magic.shown, 'Magic').toBe(true);
    const rare = evaluateRules(filter.rules, ring('Amethyst Ring', 'Rare', 49));
    expect(rare.shown, 'Rare').toBe(true);
  });
});