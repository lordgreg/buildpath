import { describe, expect, it } from 'vitest';
import { archetypes } from '../archetypes/index.ts';
import { compileFilter } from '../filter/generate.ts';
import type { Phase, Strictness } from '../filter/presets.ts';
import type { Rule } from '../filter/types.ts';
import { evaluateRules, ruleMatches } from './match.ts';
import { REPORTED_LEAKS, SAMPLE_ITEMS } from './samples.ts';

const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['normal', 'strict', 'very-strict'];

function rulesFor(
  archetypeId: string,
  phase: Phase,
  strictness: Strictness,
): Rule[] {
  return compileFilter({ archetypeId, phase, strictness }).rules;
}

function item(id: string) {
  const found = SAMPLE_ITEMS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing sample item "${id}"`);
  return found;
}

describe('reported leaks', () => {
  it('hides all four in the filter that was reported (necro, strict leveling)', () => {
    const rules = rulesFor('necro-minions', 'leveling', 'strict');

    for (const leak of REPORTED_LEAKS) {
      const result = evaluateRules(rules, leak);
      expect(result.shown, `${leak.name}: ${result.reason}`).toBe(false);
    }
  });

  it('always hides normal gear without links, for every build and preset', () => {
    for (const archetype of archetypes) {
      for (const phase of PHASES) {
        for (const strictness of STRICTNESS) {
          const result = evaluateRules(
            rulesFor(archetype.id, phase, strictness),
            item('report-normal-gloves'),
          );
          expect(
            result.shown,
            `${archetype.id}/${phase}/${strictness}: ${result.reason}`,
          ).toBe(false);
        }
      }
    }
  });

  it('always hides one-hand axes, since no archetype uses them', () => {
    for (const archetype of archetypes) {
      for (const phase of PHASES) {
        for (const strictness of STRICTNESS) {
          const result = evaluateRules(
            rulesFor(archetype.id, phase, strictness),
            item('report-magic-axe'),
          );
          expect(
            result.shown,
            `${archetype.id}/${phase}/${strictness}: ${result.reason}`,
          ).toBe(false);
        }
      }
    }
  });

  it('hides low-level magic armour in strict leveling', () => {
    const rules = rulesFor('pathfinder-toxic-rain', 'leveling', 'strict');
    for (const id of ['report-magic-vest', 'report-magic-mitts']) {
      const result = evaluateRules(rules, item(id));
      expect(result.shown, `${id}: ${result.reason}`).toBe(false);
    }
  });

  it('shows low-level magic armour for a matching build in normal leveling', () => {
    const rules = rulesFor('pathfinder-toxic-rain', 'leveling', 'normal');
    for (const id of ['report-magic-vest', 'report-magic-mitts']) {
      const result = evaluateRules(rules, item(id));
      expect(result.shown, `${id}: ${result.reason}`).toBe(true);
    }
  });
});

describe('preview matcher', () => {
  it('shows a four-link normal item while leveling', () => {
    const rules = rulesFor('necro-minions', 'leveling', 'strict');
    expect(evaluateRules(rules, item('four-link')).shown).toBe(true);
  });

  it('hides a four-link normal item in endgame', () => {
    const rules = rulesFor('necro-minions', 'endgame', 'normal');
    expect(evaluateRules(rules, item('four-link')).shown).toBe(false);
  });

  it('always shows six-socket items', () => {
    const rules = rulesFor('jugg-boneshatter', 'endgame', 'very-strict');
    expect(evaluateRules(rules, item('six-socket')).shown).toBe(true);
  });

  it('shows a high-level rare ring in endgame very strict', () => {
    const rules = rulesFor('necro-minions', 'endgame', 'very-strict');
    expect(evaluateRules(rules, item('rare-ring')).shown).toBe(true);
  });

  it('shows currency and hides it below the cutoff', () => {
    const endgame = rulesFor('necro-minions', 'endgame', 'very-strict');
    expect(evaluateRules(endgame, item('currency-divine')).shown).toBe(true);
    expect(evaluateRules(endgame, item('currency-wisdom')).shown).toBe(false);
  });

  it('shows uniques, quality gems and high maps', () => {
    const endgame = rulesFor('deadeye-lightning-arrow', 'endgame', 'strict');
    expect(evaluateRules(endgame, item('unique-belt')).shown).toBe(true);
    expect(evaluateRules(endgame, item('gem-quality')).shown).toBe(true);
    expect(evaluateRules(endgame, item('map')).shown).toBe(true);
  });

  it('defaults to visible when nothing matches', () => {
    const result = evaluateRules([], item('rare-ring'));
    expect(result.shown).toBe(true);
    expect(result.rule).toBeNull();
  });

  it('lets Continue keep evaluating later rules', () => {
    const withContinue: Rule[] = [
      { action: 'Hide', rarity: 'Normal', continue: true },
      { action: 'Show', sockets: { min: 6 } },
    ];
    expect(evaluateRules(withContinue, item('six-socket')).shown).toBe(true);

    const withoutContinue: Rule[] = [
      { action: 'Hide', rarity: 'Normal' },
      { action: 'Show', sockets: { min: 6 } },
    ];
    expect(evaluateRules(withoutContinue, item('six-socket')).shown).toBe(false);
  });

  it('matches classes and base types exactly', () => {
    const itemA = item('report-magic-vest');
    expect(
      ruleMatches({ action: 'Show', classNames: ['Body Armours'] }, itemA),
    ).toBe(true);
    expect(
      ruleMatches({ action: 'Show', classNames: ['Body Armour'] }, itemA),
    ).toBe(false);
    expect(
      ruleMatches(
        { action: 'Show', baseTypes: ['Oiled Vest'] },
        itemA,
      ),
    ).toBe(true);
    expect(
      ruleMatches(
        { action: 'Show', baseTypes: ['Silken Vest'] },
        itemA,
      ),
    ).toBe(false);
  });
});