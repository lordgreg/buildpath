import { describe, expect, it } from 'vitest';
import { archetypes } from '../archetypes/index.ts';
import { compileFilter } from '../filter/generate.ts';
import type { Phase, Strictness } from '../filter/presets.ts';
import type { Rule } from '../filter/types.ts';
import { evaluateRules, ruleMatches } from './match.ts';
import { REPORTED_LEAKS, SAMPLE_ITEMS } from './samples.ts';

const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['soft', 'strict', 'uber'];

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

  it('hides a normal glove below the white floor at every strict tier', () => {
    for (const archetype of archetypes) {
      for (const phase of PHASES) {
        for (const strictness of ['strict', 'uber'] as const) {
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

  it('shows a normal glove on a matching base at the loosest leveling tier', () => {
    const result = evaluateRules(
      rulesFor('deadeye-lightning-arrow', 'leveling', 'soft'),
      item('report-normal-gloves'),
    );
    expect(result.shown, result.reason).toBe(true);
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
    const rules = rulesFor('pathfinder-toxic-rain', 'leveling', 'soft');
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

  it('shows a four-link normal item in endgame normal but hides it in strict', () => {
    const normal = rulesFor('necro-minions', 'endgame', 'soft');
    expect(evaluateRules(normal, item('four-link')).shown).toBe(true);

    const strict = rulesFor('necro-minions', 'endgame', 'strict');
    expect(evaluateRules(strict, item('four-link')).shown).toBe(false);
  });

  it('always shows six-socket items', () => {
    const rules = rulesFor('jugg-boneshatter', 'endgame', 'uber');
    expect(evaluateRules(rules, item('six-socket')).shown).toBe(true);
  });

  it('shows a high-level rare ring in endgame very strict', () => {
    const rules = rulesFor('necro-minions', 'endgame', 'uber');
    expect(evaluateRules(rules, item('rare-ring')).shown).toBe(true);
  });

  it('shows currency and hides it below the cutoff', () => {
    const endgame = rulesFor('necro-minions', 'endgame', 'uber');
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

  it('treats currency, gems and cards as Normal rarity', () => {
    const normal = { action: 'Show', rarity: 'Normal' } as const;
    for (const id of ['currency-divine', 'gem-zero', 'divination-card']) {
      expect(ruleMatches(normal, item(id)), id).toBe(true);
    }
    expect(ruleMatches(normal, item('rare-ring'))).toBe(false);
    expect(
      ruleMatches({ action: 'Show', rarity: 'Rare' }, item('currency-divine')),
    ).toBe(false);
  });

  it('reads missing sockets, links, quality and stack size as the game does', () => {
    const nonSocketable = item('currency-divine');
    expect(
      ruleMatches({ action: 'Show', sockets: { max: 0 } }, nonSocketable),
    ).toBe(true);
    expect(
      ruleMatches({ action: 'Show', sockets: { min: 1 } }, nonSocketable),
    ).toBe(false);
    expect(
      ruleMatches({ action: 'Show', linkedSockets: { max: 0 } }, nonSocketable),
    ).toBe(true);
    expect(
      ruleMatches({ action: 'Show', quality: { max: 0 } }, nonSocketable),
    ).toBe(true);
    expect(
      ruleMatches({ action: 'Show', quality: { min: 1 } }, nonSocketable),
    ).toBe(false);
    expect(
      ruleMatches({ action: 'Show', stackSize: { max: 1 } }, item('rare-ring')),
    ).toBe(true);
    expect(
      ruleMatches({ action: 'Show', stackSize: { min: 2 } }, item('rare-ring')),
    ).toBe(false);
  });
});