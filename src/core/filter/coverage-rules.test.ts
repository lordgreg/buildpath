import { describe, expect, it } from 'vitest';
import { compileFilter } from './generate.ts';
import { STRICTNESS_ORDER } from './presets.ts';
import { COLORS } from './types.ts';

describe('unique maps', () => {
  it('shows a unique map before every other map rule', () => {
    for (const strictness of STRICTNESS_ORDER) {
      const compiled = compileFilter({
        selection: { mode: 'family', familyId: 'bow' },
        phase: 'endgame',
        strictness,
      });
      const show = compiled.rules.findIndex(
        (rule) => rule.comment === 'Unique maps',
      );
      const others = compiled.rules
        .map((rule, index) => ({ rule, index }))
        .filter(
          ({ rule, index }) =>
            index !== show && rule.classNames?.includes('Maps'),
        )
        .map(({ index }) => index);

      expect(show, strictness).toBeGreaterThan(-1);
      expect(others.length, strictness).toBeGreaterThan(0);
      for (const index of others) {
        expect(show < index, `${strictness}@${index}`).toBe(true);
      }
      expect(compiled.rules[show]).toMatchObject({
        action: 'Show',
        classNames: ['Maps'],
        rarity: 'Unique',
        styleKind: 'unique',
      });
    }
  });

  it('paints the unique map with the unique colour, not the map colour', () => {
    const compiled = compileFilter({
      selection: { mode: 'family', familyId: 'bow' },
      phase: 'endgame',
      strictness: 'uber',
      theme: 'rarity',
    });
    const show = compiled.rules.find((rule) => rule.comment === 'Unique maps');
    expect(show?.style?.borderColor).toEqual(COLORS.orange);
    expect(show?.style?.textColor).toEqual(COLORS.orange);
  });
});

describe('experience gems', () => {
  it('shows Empower, Enlighten and Enhance before the gem cutoff', () => {
    for (const phase of ['leveling', 'endgame'] as const) {
      for (const strictness of STRICTNESS_ORDER) {
        const rules = compileFilter({
          selection: { mode: 'family', familyId: 'caster' },
          phase,
          strictness,
        }).rules;
        const gate = rules.findIndex(
          (rule) => rule.comment?.startsWith('Gems - quality'),
        );
        const hide = rules.findIndex((rule) =>
          rule.comment?.startsWith('Gems - below'),
        );
        const experience = rules.findIndex(
          (rule) => rule.comment === 'Gems - Empower, Enlighten, Enhance',
        );

        if (gate === -1) {
          // No gate: the plain Gems rule already covers them.
          expect(experience, `${phase}/${strictness}`).toBe(-1);
          continue;
        }
        expect(experience, `${phase}/${strictness}`).toBeGreaterThan(-1);
        expect(experience, `${phase}/${strictness}`).toBeLessThan(gate);
        expect(experience, `${phase}/${strictness}`).toBeLessThan(hide);
        expect(rules[experience]?.baseTypes).toEqual([
          'Empower Support',
          'Enlighten Support',
          'Enhance Support',
        ]);
      }
    }
  });
});
