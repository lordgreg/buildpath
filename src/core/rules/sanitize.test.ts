import { describe, expect, it } from 'vitest';
import { emitRules } from '../filter/emit.ts';
import { generateFilter } from '../filter/generate.ts';
import type { Rule } from '../filter/types.ts';
import { evaluateRules } from '../preview/match.ts';
import {
  customRuleProblem,
  prepareCustomRules,
  shapeRules,
  withoutUnknownBases,
} from './sanitize.ts';

describe('withoutUnknownBases', () => {
  it('drops names the game no longer accepts and keeps the rest', () => {
    const rule: Rule = {
      action: 'Show',
      baseTypes: ['Rawhide Gloves', 'Gauche Gloves', 'Sinistral Gloves'],
    };
    const [cleaned] = withoutUnknownBases([rule]);
    expect(cleaned!.baseTypes).toEqual(['Rawhide Gloves']);
  });

  it('leaves a rule without base types alone', () => {
    const rule: Rule = { action: 'Hide', classNames: ['Gloves'] };
    const [cleaned] = withoutUnknownBases([rule]);
    expect(cleaned).toBe(rule);
  });

  it('never emits a stale base in a generated filter', () => {
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
