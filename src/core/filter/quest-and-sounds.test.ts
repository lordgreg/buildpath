import { describe, expect, it } from 'vitest';
import { parseItemText } from '../demo/parse-item.ts';
import { emitRules } from './emit.ts';
import { generateFilter } from './generate.ts';
import { evaluateRules, type PreviewItem } from '../preview/match.ts';
import { validateFilter } from './validate.ts';
import type { Rule } from './types.ts';

const QUEST = `Item Class: Quest Items
Rarity: Quest
Sign of Purity
--------
Wrought from blood and gold, Innocence fashioned a weapon of tempered purity,
capable of banishing darkness, and bringing order to the chaos in men's hearts.`;

const currency = (name: string): PreviewItem => ({
  id: name,
  name,
  itemClass: 'Stackable Currency',
  baseType: name,
  rarity: 'Normal',
  itemLevel: 1,
});

const currencyRule = (name: string, phase: 'leveling' | 'endgame', strictness: 'soft' | 'uber') => {
  const filter = generateFilter({
    selection: { mode: 'family', familyId: 'minion' },
    phase,
    strictness,
  });
  return evaluateRules(filter.rules, currency(name));
};

describe('quest items', () => {
  it('always shows a quest item with the default alert, even in hide-all scratch', () => {
    const [quest] = parseItemText(QUEST);
    expect(quest?.rarity).toBe('Quest');

    for (const selection of [
      { mode: 'family' as const, familyId: 'minion' as const },
      { mode: 'scratch' as const, scratchStart: 'hide' as const },
    ]) {
      const filter = generateFilter({
        selection,
        phase: 'leveling',
        strictness: 'uber',
      });
      const result = evaluateRules(filter.rules, quest!);
      expect(result.shown).toBe(true);
      expect(result.rule?.comment).toBe('Quest items');
      expect(result.rule?.style?.alertSound).toBe(1);
      expect(result.rule?.style?.alertVolume).toBe(300);
    }
  });
});

describe('named currency alerts', () => {
  it('uses the Sh voice line for each major orb', () => {
    const expected = {
      'Chaos Orb': 'ShChaos',
      'Exalted Orb': 'ShExalted',
      'Divine Orb': 'ShDivine',
      'Mirror of Kalandra': 'ShMirror',
    };

    for (const [name, sound] of Object.entries(expected)) {
      const result = currencyRule(name, 'leveling', 'soft');
      expect(result.shown, name).toBe(true);
      expect(result.rule?.comment, name).toBe(`${name} - alert`);
      expect(result.rule?.style?.alertSound, name).toBe(sound);
    }
  });

  it('keeps tier-2 orbs and hides tier-3 at Uber', () => {
    expect(currencyRule('Divine Orb', 'endgame', 'uber').shown).toBe(
      true,
    );
    expect(currencyRule('Mirror of Kalandra', 'endgame', 'uber').shown).toBe(
      true,
    );
    expect(currencyRule('Chaos Orb', 'endgame', 'uber').shown).toBe(
      true,
    );
    expect(
      currencyRule('Scroll of Wisdom', 'endgame', 'uber').shown,
    ).toBe(false);
  });
});

describe('named alert emission', () => {
  it('emits and validates a Sh voice line without a volume argument', () => {
    const rule: Rule = {
      action: 'Show',
      baseTypes: ['Divine Orb'],
      style: { alertSound: 'ShDivine' },
    };
    expect(emitRules([rule])).toContain('PlayAlertSound ShDivine');
    expect(
      validateFilter(`Show\n    BaseType "Divine Orb"\n    PlayAlertSound ShDivine`),
    ).toEqual([]);
  });

  it('rejects an unknown Sh voice line', () => {
    expect(
      validateFilter(`Show\n    BaseType "Divine Orb"\n    PlayAlertSound ShNope`),
    ).not.toEqual([]);
  });
});