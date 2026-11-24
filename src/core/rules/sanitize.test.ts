import { describe, expect, it } from 'vitest';
import { emitRules } from '../filter/emit.ts';
import { generateFilter } from '../filter/generate.ts';
import { THEMES } from '../filter/themes.ts';
import type { Rule } from '../filter/types.ts';
import { evaluateRules } from '../preview/match.ts';
import {
  customRuleProblem,
  prepareCustomRules,
  shapeRules,
} from './sanitize.ts';

describe('unknown base types', () => {
  it('are dropped while the known ones stay', () => {
    const { rules } = prepareCustomRules([
      {
        action: 'Show',
        baseTypes: ['Rawhide Gloves', 'Gauche Gloves', 'Sinistral Gloves'],
      },
    ]);
    expect(rules[0]!.baseTypes).toEqual(['Rawhide Gloves']);
  });

  it('never reach a generated filter', () => {
    // This is the shape of a rule copied from an older preset.
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'leveling',
      strictness: 'soft',
      customRules: [
        {
          action: 'Show',
          baseTypes: ['Rawhide Gloves', 'Gauche Gloves', 'Serpent Wand'],
        },
      ],
    });
    expect(filter.text).toContain('"Rawhide Gloves"');
    expect(filter.text).not.toContain('Gauche Gloves');
    expect(filter.text).not.toContain('Serpent Wand');
  });
});

describe('customRuleProblem', () => {
  it('flags a list that is empty or holds only unknown base types', () => {
    expect(customRuleProblem({ action: 'Hide', baseTypes: [] })).toMatch(
      /empty/,
    );
    expect(customRuleProblem({ action: 'Hide', classNames: [] })).toMatch(
      /empty/,
    );
    expect(customRuleProblem({ action: 'Hide', hasExplicitMod: [] })).toMatch(
      /empty/,
    );
    expect(
      customRuleProblem({ action: 'Hide', baseTypes: ['Serpent Wand'] }),
    ).toMatch(/Serpent Wand/);
  });

  it('accepts intentional catch-alls and rules with a known name', () => {
    expect(customRuleProblem({ action: 'Hide' })).toBeNull();
    expect(customRuleProblem({ action: 'Hide', rarity: 'Normal' })).toBeNull();
    expect(
      customRuleProblem({
        action: 'Hide',
        baseTypes: ['Rawhide Gloves', 'Serpent Wand'],
      }),
    ).toBeNull();
  });
});

describe('custom rule values', () => {
  it('disable a rule whose condition the game cannot read', () => {
    const bad: unknown[] = [
      { action: 'Hide', rarity: 'Legendary' },
      { action: 'Hide', itemLevel: { min: 2.5 } },
      { action: 'Hide', itemLevel: { min: -1 } },
      { action: 'Hide', quality: { max: '\nShow' } },
      { action: 'Hide', corrupted: 'true' },
      { action: 'Hide', continue: 1 },
      { action: 'Delete' },
      { action: 'Hide', classNames: ['Rings\nShow'] },
      { action: 'Hide', hasExplicitMod: ['   '] },
      { action: 'Hide', baseTypes: ['Maelstr\u00f6m Staff'] },
      { action: 'Hide', classNames: ['"Rings"'] },
    ];
    for (const rule of bad) {
      expect(customRuleProblem(rule as Rule), JSON.stringify(rule)).not.toBeNull();
    }
    const { rules, skipped } = prepareCustomRules(bad as Rule[]);
    expect(rules).toEqual([]);
    expect(skipped).toHaveLength(bad.length);
  });

  it('drop unsafe names from a list instead of mangling them', () => {
    const { rules } = prepareCustomRules([
      {
        action: 'Hide',
        baseTypes: ['Maelstr\u00f6m Staff', 'Rawhide Gloves'],
        classNames: ['Gloves', 'Rings\nShow', ''],
      },
    ]);
    expect(rules[0]!.baseTypes).toEqual(['Rawhide Gloves']);
    expect(rules[0]!.classNames).toEqual(['Gloves']);
  });

  it('keep only style lines the game accepts', () => {
    const { rules } = prepareCustomRules([
      {
        action: 'Show',
        rarity: 'Rare',
        comment: 'caf\u00e9\nShow\tnow',
        style: {
          fontSize: 0,
          textColor: [255, 0, 0],
          borderColor: [300, 0, 0],
          backgroundColor: [0, 0, '\n'] as unknown as [number, number, number],
          alertSound: 'Boom' as never,
          alertVolume: 999,
          playEffect: 'Gray' as never,
          minimapIcon: { size: 1, color: 'Grey', shape: 'Star' },
        },
      },
    ]);
    expect(rules[0]).toMatchObject({
      action: 'Show',
      rarity: 'Rare',
      comment: 'cafShownow',
      style: {
        textColor: [255, 0, 0],
        minimapIcon: { size: 1, color: 'Grey', shape: 'Star' },
      },
    });
    expect(Object.keys(rules[0]!.style!)).toEqual(['textColor', 'minimapIcon']);
  });

  it('emit hostile rules as ASCII without extra blocks', () => {
    const base = {
      selection: { mode: 'family' as const, familyId: 'minion' as const },
      phase: 'endgame' as const,
      strictness: 'soft' as const,
    };
    const plain = generateFilter(base);
    const hostile = generateFilter({
      ...base,
      customRules: [
        { action: 'Show', rarity: 'Rare', comment: 'x\nShow\n# \u00fc' },
        { action: 'Hide', classNames: ['Rings\nShow'] },
        { action: 'Hide', itemLevel: { min: '1\nShow' as unknown as number } },
      ],
    });
    expect(/^[\x0A\x20-\x7E]*$/.test(hostile.text)).toBe(true);
    expect(hostile.lineSpans).toHaveLength(plain.lineSpans.length + 1);
    expect(hostile.skippedCustomRules.map((entry) => entry.index)).toEqual([1, 2]);
    expect(hostile.warnings).toEqual(plain.warnings);
  });

  it('keep a known card name that carries its own quotes', () => {
    const { rules } = prepareCustomRules([
      { action: 'Show', baseTypes: ['"The Nameless Play"'] },
    ]);
    expect(rules[0]!.baseTypes).toEqual(['"The Nameless Play"']);
  });

  it('keep intentional catch-alls', () => {
    const { rules } = prepareCustomRules([{ action: 'Hide' }]);
    expect(rules).toEqual([{ action: 'Hide' }]);
  });

  it('drop a style kind or section the theme does not know', () => {
    const { rules } = prepareCustomRules([
      {
        action: 'Show',
        rarity: 'Rare',
        styleKind: 'constructor' as never,
        section: 'toString' as never,
      },
      { action: 'Show', rarity: 'Magic', styleKind: 'gem', section: 'gear' },
    ]);
    expect(rules[0]).toEqual({ action: 'Show', rarity: 'Rare' });
    expect(rules[1]).toMatchObject({ styleKind: 'gem', section: 'gear' });
  });

  it('never crash the generator, whatever the theme', () => {
    for (const { id: theme } of THEMES) {
      expect(() =>
        generateFilter({
          selection: { mode: 'family', familyId: 'minion' },
          phase: 'endgame',
          strictness: 'soft',
          theme,
          customRules: [
            {
              action: 'Show',
              rarity: 'Rare',
              style: {},
              styleKind: '__proto__' as never,
              section: 'hasOwnProperty' as never,
            },
          ],
        }),
      ).not.toThrow();
    }
  });
});

describe('prepareCustomRules', () => {
  it('skips rules whose list condition would end up empty', () => {
    const { rules, skipped } = prepareCustomRules([
      { action: 'Hide', baseTypes: ['Serpent Wand'], rarity: 'Normal' },
      { action: 'Hide', classNames: [] },
      { action: 'Show', baseTypes: ['Rawhide Gloves'] },
      { action: 'Hide' },
    ]);
    expect(rules).toEqual([
      { action: 'Show', baseTypes: ['Rawhide Gloves'] },
      { action: 'Hide' },
    ]);
    expect(skipped.map((entry) => entry.index)).toEqual([0, 1]);
  });
});

describe('empty list conditions', () => {
  it('are neither emitted nor matched', () => {
    const empty: Rule = { action: 'Hide', baseTypes: [], comment: 'empty' };
    expect(emitRules([empty])).toBe('\n');
    const item = {
      id: 'x',
      name: 'Chaos Orb',
      itemClass: 'Stackable Currency',
      baseType: 'Chaos Orb',
      rarity: 'Normal' as const,
      itemLevel: 1,
      explicitMods: ['Veiled'],
    };
    expect(evaluateRules([empty], item).rule).toBeNull();
    expect(
      evaluateRules([{ action: 'Hide', hasExplicitMod: [] }], item).rule,
    ).toBeNull();
  });

  it('never turn a stale custom Hide into a hide-everything block', () => {
    const base = {
      selection: { mode: 'family' as const, familyId: 'minion' as const },
      phase: 'endgame' as const,
      strictness: 'soft' as const,
    };
    const plain = generateFilter(base);
    const stale = generateFilter({
      ...base,
      customRules: [
        { action: 'Hide', baseTypes: ['Serpent Wand'], comment: 'stale' },
      ],
    });
    expect(stale.text).not.toContain('# stale');
    expect(stale.lineSpans).toHaveLength(plain.lineSpans.length);
    expect(stale.skippedCustomRules).toEqual([
      { index: 0, reason: expect.stringContaining('Serpent Wand') },
    ]);
  });
});

describe('shapeRules', () => {
  it('keeps well-formed rules, unknown names included', () => {
    const rule = { action: 'Hide', baseTypes: ['Serpent Wand'] };
    expect(shapeRules([rule])).toEqual({ rules: [rule], dropped: 0 });
  });

  it('drops rules whose fields have the wrong type', () => {
    const { rules, dropped } = shapeRules([
      null,
      'Show',
      { action: 'Delete' },
      { action: 'Hide', baseTypes: 'Serpent Wand' },
      { action: 'Hide', classNames: ['Rings', 3] },
      { action: 'Hide', itemLevel: { min: '\nShow' } },
      { action: 'Hide', corrupted: 'true' },
      { action: 'Hide', style: 'loud' },
      { action: 'Show', classNames: ['Rings'], itemLevel: { min: 80 } },
    ]);
    expect(rules).toEqual([
      { action: 'Show', classNames: ['Rings'], itemLevel: { min: 80 } },
    ]);
    expect(dropped).toBe(8);
  });

  it('treats anything but an array as no rules', () => {
    expect(shapeRules({ action: 'Show' })).toEqual({ rules: [], dropped: 0 });
    expect(shapeRules(undefined)).toEqual({ rules: [], dropped: 0 });
  });
});
