import { describe, expect, it } from 'vitest';
import { emitRules } from './emit.ts';
import { compileFilter, generateFilter } from './generate.ts';
import type { Rule } from './types.ts';
import { validateFilter } from './validate.ts';
import { evaluateRules } from '../preview/match.ts';

const selection = {
  mode: 'family' as const,
  familyId: 'minion' as const,
};

const customRules: Rule[] = [
  {
    id: 'custom-0',
    section: 'custom',
    action: 'Hide',
    baseTypes: ['Hubris Circlet'],
    rarity: 'Rare',
    itemLevel: { min: 80 },
    comment: 'Hide high DEX heads',
  },
  {
    id: 'custom-1',
    section: 'custom',
    action: 'Show',
    baseTypes: ['Foo Base'],
    disabled: true,
  },
];

describe('custom rules', () => {
  it('puts custom rules before the generated preset', () => {
    const compiled = compileFilter({
      selection,
      phase: 'leveling',
      strictness: 'soft',
      customRules,
    });

    expect(compiled.rules[0]?.id).toBe('quest-items');
    expect(compiled.rules[1]?.id).toBe('quest-treasure-key');
    expect(compiled.rules[2]?.id).toBe('veiled-items');
    expect(compiled.rules[3]?.id).toBe('custom-0');
    expect(compiled.rules.length).toBeGreaterThan(1);
    expect(compiled.rules.some((rule) => rule.section === 'gear')).toBe(true);
    expect(compiled.baseTypes).toContain('Hubris Circlet');
  });

  it('emits both custom and preset rules, skipping disabled ones', () => {
    const filter = generateFilter({
      selection,
      phase: 'leveling',
      strictness: 'soft',
      customRules,
    });

    expect(validateFilter(filter.text)).toEqual([]);
    expect(filter.text).toContain('# Hide high DEX heads');
    expect(filter.text).toContain('# helmet - rare');
    expect(filter.text).not.toContain('Foo Base');
  });

  it('skips disabled custom rules when matching and emitting', () => {
    const item = {
      id: 'foo',
      name: 'Foo Base',
      itemClass: 'Helmets',
      baseType: 'Foo Base',
      rarity: 'Normal' as const,
      itemLevel: 1,
    };
    expect(evaluateRules(customRules, item).shown).toBe(true);
    expect(emitRules(customRules)).not.toContain('Foo Base');
  });
});

describe('from scratch', () => {
  const scratch = {
    mode: 'scratch' as const,
    scratchStart: 'hide' as const,
  };

  it('emits only custom rules plus the hide-all base', () => {
    const filter = generateFilter({
      selection: scratch,
      phase: 'leveling',
      strictness: 'soft',
      customRules: [
        {
          id: 'custom-0',
          section: 'custom',
          action: 'Show',
          rarity: 'Unique',
          comment: 'Uniques',
        },
      ],
    });

    expect(filter.text).toContain('# Uniques');
    expect(filter.text).toContain('# From scratch - hide everything');
    expect(filter.text).not.toContain('# helmet - rare');
    expect(filter.fileName).toBe(
      'filterpath-custom-hide-all.filter',
    );
  });

  it('supports show-all as the base', () => {
    const filter = generateFilter({
      selection: { mode: 'scratch', scratchStart: 'show' },
      phase: 'leveling',
      strictness: 'soft',
    });
    expect(filter.text).toContain('# From scratch - show everything');
  });
});