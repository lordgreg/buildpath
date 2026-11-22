import { describe, expect, it } from 'vitest';
import { parseItemText } from '../demo/parse-item.ts';
import { generateFilter } from './generate.ts';
import { evaluateRules, type PreviewItem } from '../preview/match.ts';
import { validateFilter } from './validate.ts';

const VEILED_BOW = `Item Class: Bows
Rarity: Rare
Wrath Barrage
Ranger Bow
--------
Bow
Physical Damage: 56-117
Critical Strike Chance: 6.00%
Attacks per Second: 1.30
--------
Requirements:
Level: 60
Dex: 173 (augmented) (unmet)
--------
Sockets: W-W
--------
Item Level: 63
--------
{ Suffix Modifier "of Renewal" (Tier: 3) — Life, Attack }
Grants 22(19-22) Life per Enemy Hit
{ Suffix Modifier "of the Worthy" (Tier: 2) }
18% reduced Attribute Requirements
{ Suffix Modifier "of the Sniper" (Tier: 4) — Attack }
+288(216-325) to Accuracy Rating
{ Prefix Modifier "Veiled" }
Veiled Prefix`;

const plainBow = (): PreviewItem => ({
  id: 'plain-bow',
  name: 'Plain Bow',
  itemClass: 'Bows',
  baseType: 'Ranger Bow',
  rarity: 'Rare',
  itemLevel: 63,
});

const filterFor = (
  phase: 'leveling' | 'endgame',
  strictness: 'soft' | 'strict' | 'uber',
  selection:
    | { mode: 'family'; familyId: 'minion' }
    | { mode: 'scratch'; scratchStart: 'hide' } = {
    mode: 'family',
    familyId: 'minion',
  },
) => generateFilter({ selection, phase, strictness });

describe('veiled items', () => {
  it('parses the reported veiled rare bow', () => {
    const [bow] = parseItemText(VEILED_BOW);
    expect(bow?.name).toBe('Wrath Barrage');
    expect(bow?.baseType).toBe('Ranger Bow');
    expect(bow?.itemClass).toBe('Bows');
    expect(bow?.rarity).toBe('Rare');
    expect(bow?.explicitMods).toContain('Veiled');
  });

  it('always shows a veiled item, leveling and endgame, even in hide-all scratch', () => {
    const [bow] = parseItemText(VEILED_BOW);
    for (const phase of ['leveling', 'endgame'] as const) {
      for (const strictness of ['soft', 'strict', 'uber'] as const) {
        for (const selection of [
          { mode: 'family' as const, familyId: 'minion' as const },
          { mode: 'scratch' as const, scratchStart: 'hide' as const },
        ]) {
          const filter = filterFor(phase, strictness, selection);
          const result = evaluateRules(filter.rules, bow!);
          expect(result.shown, `${phase}/${strictness}/${selection.mode}`).toBe(
            true,
          );
          expect(result.rule?.comment).toBe('Veiled items');
        }
      }
    }
  });

  it('leaves a plain rare bow to the preset rules', () => {
    const filter = filterFor('endgame', 'uber');
    const result = evaluateRules(filter.rules, plainBow());
    expect(result.rule?.comment).not.toBe('Veiled items');
  });

  it('emits the HasExplicitMod condition and validates', () => {
    const filter = filterFor('leveling', 'soft');
    expect(filter.text).toContain('HasExplicitMod "Veil"');
    expect(validateFilter(filter.text)).toEqual([]);
  });
});
