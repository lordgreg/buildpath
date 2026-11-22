import { describe, expect, it } from 'vitest';
import { generateFilter } from './generate.ts';
import { evaluateRules, type PreviewItem } from '../preview/match.ts';
import type { Phase, Strictness } from './presets.ts';
import type { Rule } from './types.ts';

const selection = { mode: 'family' as const, familyId: 'minion' as const };

function gem(quality: number, itemLevel: number): PreviewItem {
  return {
    id: `gem-${quality}-${itemLevel}`,
    name: 'Fireball',
    itemClass: 'Skill Gems',
    baseType: 'Fireball',
    rarity: 'Gem',
    itemLevel,
    quality,
  };
}

function rulesFor(phase: Phase, strictness: Strictness): Rule[] {
  return generateFilter({ selection, phase, strictness }).rules;
}

function gemRulesOf(rules: Rule[]): Rule[] {
  return rules.filter((rule) => rule.section === 'gems');
}

describe('gem alerts', () => {
  it('plays no alert for gems while leveling', () => {
    for (const strictness of ['soft', 'strict', 'uber'] as const) {
      for (const rule of gemRulesOf(rulesFor('leveling', strictness))) {
        expect(rule.style?.alertSound, `leveling ${strictness}`).toBeUndefined();
        expect(rule.style?.alertVolume, `leveling ${strictness}`).toBeUndefined();
      }
    }
  });

  it('keeps the gem alert at endgame', () => {
    for (const strictness of ['soft', 'strict', 'uber'] as const) {
      const show = gemRulesOf(rulesFor('endgame', strictness)).find(
        (rule) => rule.action === 'Show',
      );
      expect(show?.style?.alertSound, `endgame ${strictness}`).toBe(8);
    }
  });
});

describe('leveling gem gates', () => {
  it('shows every gem in leveling soft', () => {
    const rules = rulesFor('leveling', 'soft');
    expect(evaluateRules(rules, gem(0, 1)).shown).toBe(true);
    expect(gemRulesOf(rules).every((rule) => rule.action === 'Show')).toBe(true);
  });

  it('shows quality or high item level gems in leveling strict', () => {
    const rules = rulesFor('leveling', 'strict');
    expect(evaluateRules(rules, gem(5, 1)).shown).toBe(true);
    expect(evaluateRules(rules, gem(0, 20)).shown).toBe(true);
  });

  it('hides plain low item level gems in leveling strict', () => {
    const result = evaluateRules(rulesFor('leveling', 'strict'), gem(0, 1));
    expect(result.shown).toBe(false);
    expect(result.reason).toContain('cutoff');
  });
});
