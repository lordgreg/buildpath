import { describe, expect, it } from 'vitest';
import type { Rule } from '../filter/types.ts';
import { migrateRuleClasses } from './class-migration.ts';

describe('migrateRuleClasses', () => {
  it('expands a partial name to every registered class that contains it', () => {
    const { rules, notices } = migrateRuleClasses([
      { action: 'Show', classNames: ['Swords'] },
    ]);
    expect(rules[0]?.classNames).toEqual([
      'One Hand Swords',
      'Thrusting One Hand Swords',
      'Two Hand Swords',
    ]);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain('"Swords" was expanded');
  });

  it('keeps a registered name and flags the longer class it no longer matches', () => {
    const { rules, notices } = migrateRuleClasses([
      { action: 'Show', classNames: ['Daggers'] },
    ]);
    expect(rules[0]?.classNames).toEqual(['Daggers']);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain('now matches only "Daggers"');
    expect(notices[0]).toContain('"Rune Daggers"');
  });

  it('does not flag a narrowing when the longer class is already listed', () => {
    const { rules, notices } = migrateRuleClasses([
      { action: 'Show', classNames: ['Daggers', 'Rune Daggers'] },
    ]);
    expect(rules[0]?.classNames).toEqual(['Daggers', 'Rune Daggers']);
    expect(notices).toEqual([]);
  });

  it('drops an unknown name and says so', () => {
    const { rules, notices } = migrateRuleClasses([
      { action: 'Show', classNames: ['Rings', 'Not A Class'] },
    ]);
    expect(rules[0]?.classNames).toEqual(['Rings']);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain('"Not A Class" is not a known class');
  });

  it('disables a rule left with no known class names, keeping them for the editor', () => {
    const { rules, notices } = migrateRuleClasses([
      { action: 'Show', classNames: ['Not A Class'] },
    ]);
    expect(rules[0]).toMatchObject({
      classNames: ['Not A Class'],
      disabled: true,
    });
    expect(notices.join(' ')).toContain('was disabled');
  });

  it('removes duplicate names without a notice', () => {
    const { rules, notices } = migrateRuleClasses([
      { action: 'Show', classNames: ['Rings', 'Rings'] },
    ]);
    expect(rules[0]?.classNames).toEqual(['Rings']);
    expect(notices).toEqual([]);
  });

  it('leaves rules without class names untouched', () => {
    const rule: Rule = { action: 'Hide', baseTypes: ['Leather Belt'] };
    const { rules, notices } = migrateRuleClasses([rule]);
    expect(rules).toEqual([rule]);
    expect(notices).toEqual([]);
  });
});
