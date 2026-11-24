import { describe, expect, it } from 'vitest';
import { FAMILIES } from '../../meta/families.ts';
import { compileFilter } from './generate.ts';
import { STRICTNESS_ORDER } from './presets.ts';

const ABYSS_EYE: Record<string, string> = {
  caster: 'Hypnotic Eye Jewel',
  minion: 'Ghastly Eye Jewel',
  melee: 'Murderous Eye Jewel',
  bow: 'Searching Eye Jewel',
  hybrid: 'Searching Eye Jewel',
};

describe('jewel coverage', () => {
  for (const family of FAMILIES) {
    it(`shows cluster jewels and the ${family.id} abyss eye`, () => {
      for (const strictness of STRICTNESS_ORDER) {
        const rules = compileFilter({
          selection: { mode: 'family', familyId: family.id },
          phase: 'endgame',
          strictness,
        }).rules;

        const cluster = rules.find((rule) => rule.comment === 'Cluster jewels');
        expect(cluster?.action, family.id).toBe('Show');
        expect(cluster?.baseTypes, family.id).toEqual([
          'Large Cluster Jewel',
          'Medium Cluster Jewel',
          'Small Cluster Jewel',
        ]);
        expect(cluster?.rarity, family.id).toBeUndefined();

        const abyss = rules.find((rule) =>
          rule.comment?.startsWith('Abyss jewels'),
        );
        expect(abyss?.baseTypes, family.id).toEqual([ABYSS_EYE[family.id]]);
        expect(abyss?.rarity, family.id).toBeUndefined();
      }
    });
  }

  it('shows the same jewels for an ascendancy', () => {
    const rules = compileFilter({
      selection: { mode: 'ascendancy', ascendancyId: 'necromancer' },
      phase: 'leveling',
      strictness: 'soft',
    }).rules;
    const abyss = rules.find((rule) => rule.comment?.startsWith('Abyss jewels'));
    expect(abyss?.baseTypes).toEqual(['Ghastly Eye Jewel']);
  });
});
