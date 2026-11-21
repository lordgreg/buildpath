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

describe('generated rule metadata', () => {
  it('gives every rule an id and a section', () => {
    const compiled = compileFilter({
      selection,
      phase: 'leveling',
      strictness: 'normal',
    });

    expect(compiled.rules.length).toBeGreaterThan(10);
    for (const rule of compiled.rules) {
      expect(rule.id, rule.comment).toMatch(/^[a-z]+-\d+$/);
      expect(rule.section).toBeTruthy();
    }
    expect(new Set(compiled.rules.map((rule) => rule.section))).toContain(
      'gear',
    );
    expect(new Set(compiled.rules.map((rule) => rule.section))).toContain(
      'junk',
    );
  });
});

describe('rulesOverride', () => {
  const override: Rule[] = [
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
      baseTypes: ['Divine Orb'],
      disabled: true,
    },
  ];

  it('replaces generated rules and skips disabled ones', () => {
    const compiled = compileFilter({
      selection,
      phase: 'leveling',
      strictness: 'normal',
      rulesOverride: override,
    });

    expect(compiled.rules).toHaveLength(1);
    expect(compiled.rules[0]?.id).toBe('custom-0');
    expect(compiled.baseTypes).toEqual(['Hubris Circlet']);
  });

  it('emits a valid filter with only the custom rule', () => {
    const filter = generateFilter({
      selection,
      phase: 'leveling',
      strictness: 'normal',
      rulesOverride: override,
    });

    expect(validateFilter(filter.text)).toEqual([]);
    expect(filter.text).toContain('# Hide high DEX heads');
    expect(filter.text).not.toContain('Divine Orb');
    expect(filter.ruleCount).toBe(1);
  });

  it('skips disabled rules when matching', () => {
    const item = {
      id: 'orb',
      name: 'Divine Orb',
      itemClass: 'Stackable Currency',
      baseType: 'Divine Orb',
      rarity: 'Normal' as const,
      itemLevel: 1,
    };
    expect(evaluateRules(override, item).shown).toBe(true);
  });

  it('skips disabled rules when emitting', () => {
    expect(emitRules(override)).not.toContain('Divine Orb');
  });
});