import { describe, expect, it } from 'vitest';
import { compileFilter } from './generate.ts';
import { evaluateRules, type PreviewItem } from '../preview/match.ts';

const selection = { mode: 'family' as const, familyId: 'minion' as const };

function flask(name: string, rarity: PreviewItem['rarity'], itemLevel = 60): PreviewItem {
  return {
    id: `flask-${name}-${rarity}`,
    name,
    itemClass: 'Mana Flasks',
    baseType: name,
    rarity,
    itemLevel,
    areaLevel: 60,
    identified: true,
  };
}

describe('leveling mana flasks', () => {
  it('treats a mana flask like a life flask while leveling', () => {
    const rules = compileFilter({
      selection,
      phase: 'leveling',
      strictness: 'strict',
    }).rules;

    const mana = evaluateRules(rules, flask('Colossal Mana Flask', 'Rare'));
    const life = evaluateRules(
      rules,
      { ...flask('Colossal Life Flask', 'Rare'), itemClass: 'Life Flasks' },
    );
    expect(mana.shown).toBe(true);
    expect(life.shown).toBe(true);
    expect(mana.rule?.comment).toMatch(/^flask - rare$/);
    expect(mana.rule?.comment).toBe(life.rule?.comment);

    for (const rarity of ['Normal', 'Magic'] as const) {
      const manaResult = evaluateRules(rules, flask('Colossal Mana Flask', rarity));
      const lifeResult = evaluateRules(rules, {
        ...flask('Colossal Life Flask', rarity),
        itemClass: 'Life Flasks',
      });
      expect(manaResult.shown, rarity).toBe(lifeResult.shown);
    }
  });

  it('still hides mana flasks in endgame', () => {
    const rules = compileFilter({
      selection,
      phase: 'endgame',
      strictness: 'soft',
    }).rules;
    expect(evaluateRules(rules, flask('Colossal Mana Flask', 'Rare')).shown).toBe(
      false,
    );
  });

  it('names the mana flask class in the leveling filter', () => {
    const text = compileFilter({
      selection,
      phase: 'leveling',
      strictness: 'soft',
    }).rules
      .flatMap((rule) => rule.classNames ?? [])
      .join(' ');
    expect(text).toContain('Mana Flasks');
  });
});