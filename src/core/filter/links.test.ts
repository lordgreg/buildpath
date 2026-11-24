import { describe, expect, it } from 'vitest';
import { compileFilter } from './generate.ts';
import type { Rule } from './types.ts';

function linkRules(rules: Rule[]): Rule[] {
  return rules.filter((rule) => rule.linkedSockets?.min === 4);
}

describe('link coverage', () => {
  it('keeps 4-links of every craftable rarity while leveling', () => {
    const rules = compileFilter({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'leveling',
      strictness: 'uber',
    }).rules;

    const links = linkRules(rules);
    expect(links.length).toBeGreaterThan(0);
    for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
      expect(
        links.some((rule) => rule.rarity === rarity && rule.action === 'Show'),
        rarity,
      ).toBe(true);
    }
    // Uniques are never highlighted by the gear link rules.
    expect(links.every((rule) => rule.rarity !== 'Unique')).toBe(true);
  });

  it('keeps the build targeting on a 4-link rule', () => {
    const rules = compileFilter({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'leveling',
      strictness: 'soft',
    }).rules;
    const weapon = linkRules(rules).find((rule) =>
      rule.comment?.startsWith('weapon'),
    );
    expect(weapon?.baseTypes?.length).toBeGreaterThan(0);
    expect(weapon?.classNames).toBeUndefined();
  });

  it('drops 4-link highlights when the preset turns them off', () => {
    const rules = compileFilter({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'endgame',
      strictness: 'strict',
    }).rules;
    expect(linkRules(rules)).toEqual([]);
  });

  it('shows a six-linked unique before the low-tier hide', () => {
    const rules = compileFilter({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'endgame',
      strictness: 'uber',
    });
    const six = rules.rules.findIndex(
      (rule) => rule.comment === 'Uniques - six links',
    );
    const lowTier = rules.rules.findIndex(
      (rule) => rule.comment === 'Uniques - low tier bases',
    );
    expect(six).toBeGreaterThan(-1);
    expect(lowTier).toBeGreaterThan(-1);
    expect(six).toBeLessThan(lowTier);
    expect(rules.rules[six]?.rarity).toBe('Unique');
    expect(rules.rules[six]?.linkedSockets).toEqual({ min: 6 });
  });
});
