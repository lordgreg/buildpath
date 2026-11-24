import { describe, expect, it } from 'vitest';
import { compileFilter, type FilterConfig } from '../filter/generate.ts';
import type { Rule } from '../filter/types.ts';
import { focusTargetAt } from './focus.ts';

const CUSTOM: Rule[] = [
  { action: 'Show', id: 'a', comment: 'first', rarity: 'Rare' },
  { action: 'Hide', id: 'b', comment: 'disabled', rarity: 'Magic', disabled: true },
  { action: 'Hide', id: 'c', comment: 'skipped', baseTypes: ['Serpent Wand'] },
  { action: 'Show', comment: 'no id', rarity: 'Unique' },
];

function check(config: Omit<FilterConfig, 'customRules'>) {
  const baseRules = compileFilter(config).rules;
  const emitted = compileFilter({ ...config, customRules: CUSTOM }).rules;
  emitted.forEach((rule, index) => {
    const target = focusTargetAt(index, baseRules, CUSTOM);
    expect(target, `rule ${index}`).not.toBeNull();
    if (target!.kind === 'custom') {
      expect(CUSTOM[target!.index]!.comment, `rule ${index}`).toBe(rule.comment);
    } else {
      expect(target!.rule.comment, `rule ${index}`).toBe(rule.comment);
      expect(target!.rule.section, `rule ${index}`).toBe(rule.section);
    }
  });
  expect(focusTargetAt(emitted.length, baseRules, CUSTOM)).toBeNull();
}

describe('focusTargetAt', () => {
  it('maps every emitted rule back to the editor rule it came from', () => {
    check({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'leveling',
      strictness: 'soft',
    });
  });

  it('maps rules in From Scratch mode too', () => {
    check({
      selection: { mode: 'scratch', scratchStart: 'hide' },
      phase: 'leveling',
      strictness: 'soft',
    });
  });

  it('points the always-on rules before My rules at the preset', () => {
    const config = {
      selection: { mode: 'family' as const, familyId: 'minion' as const },
      phase: 'leveling' as const,
      strictness: 'soft' as const,
    };
    const baseRules = compileFilter(config).rules;
    const veiled = focusTargetAt(2, baseRules, CUSTOM);
    expect(veiled).toMatchObject({ kind: 'preset', rule: { id: 'veiled-items' } });
    expect(focusTargetAt(3, baseRules, CUSTOM)).toEqual({ kind: 'custom', index: 0 });
    expect(focusTargetAt(4, baseRules, CUSTOM)).toEqual({ kind: 'custom', index: 3 });
  });
});
