import { describe, expect, it } from 'vitest';
import {
  coerceWizardState,
  DEFAULT_STATE,
  parseWizardHash,
  ruleKey,
  wizardHash,
} from './wizardState.ts';

describe('wizard hash', () => {
  it('maps an interim archetype link onto meta mode', () => {
    const state = parseWizardHash('#archetype=necro-minions');
    expect(state.mode).toBe('meta');
    expect(state.leagueId).toBe('covens');
    expect(state.familyId).toBe('minion');
    expect(state.skillId).toBe('summon-skeletons');
    expect(state.ascendancyId).toBe('necromancer');
  });

  it('parses family mode', () => {
    const state = parseWizardHash('#mode=family&family=bow');
    expect(state.mode).toBe('family');
    expect(state.familyId).toBe('bow');
  });

  it('parses ascendancy mode', () => {
    const state = parseWizardHash('#mode=ascendancy&ascendancy=juggernaut');
    expect(state.mode).toBe('ascendancy');
    expect(state.ascendancyId).toBe('juggernaut');
    expect(state.familyId).toBe('melee');
  });

  it('parses every meta field', () => {
    const state = parseWizardHash(
      '#mode=meta&league=standard&family=bow&skill=lightning-arrow&ascendancy=deadeye&phase=endgame&strictness=strict&sections=gear,currency',
    );

    expect(state.mode).toBe('meta');
    expect(state.leagueId).toBe('standard');
    expect(state.familyId).toBe('bow');
    expect(state.skillId).toBe('lightning-arrow');
    expect(state.ascendancyId).toBe('deadeye');
    expect(state.phase).toBe('endgame');
    expect(state.strictness).toBe('strict');
    // Sections are always fully enabled; advanced rules control inclusion.
    expect(Object.values(state.sections).every(Boolean)).toBe(true);
  });

  it('round-trips a verified build selection', () => {
    const state = coerceWizardState({
      mode: 'build',
      buildId: 'summon-skeletons-necromancer',
    });
    expect(state.mode).toBe('build');
    expect(state.buildId).toBe('summon-skeletons-necromancer');
    // The build decides the ascendancy and family, so a bare build link works.
    expect(state.ascendancyId).toBe('necromancer');
    expect(state.familyId).toBe('minion');
    expect(ruleKey(state)).toBe('build:summon-skeletons-necromancer');

    const hash = wizardHash(state);
    expect(hash).toContain('mode=build');
    expect(hash).toContain('build=summon-skeletons-necromancer');
    const parsed = parseWizardHash(`#${hash}`);
    expect(parsed.mode).toBe('build');
    expect(parsed.buildId).toBe('summon-skeletons-necromancer');
  });

  it('falls back to the first seed for an unknown build id', () => {
    const state = coerceWizardState({ mode: 'build', buildId: 'nope' });
    expect(state.mode).toBe('build');
    expect(state.buildId).toBe('summon-skeletons-necromancer');
  });

  it('trims the imported build name', () => {
    const state = coerceWizardState({ name: '  My Vortex  ' });
    expect(state.name).toBe('My Vortex');
  });

  it('parses the filter theme', () => {
    const state = parseWizardHash(
      '#mode=family&family=minion&theme=contrast',
    );
    expect(state.theme).toBe('contrast');
  });

  it('defaults to rarity and maps the legacy classic id', () => {
    expect(parseWizardHash('#mode=family&family=minion').theme).toBe('rarity');
    expect(
      parseWizardHash('#mode=family&family=minion&theme=classic').theme,
    ).toBe('rarity');
  });

  it('carries the build name through the hash', () => {
    const state = parseWizardHash(
      '#mode=scratch&scratchStart=show&name=My%20Vortex',
    );
    expect(state.name).toBe('My Vortex');
    expect(wizardHash(state)).toContain('name=My+Vortex');
    expect(parseWizardHash(`#${wizardHash(state)}`)).toEqual(state);
  });

  it('parses from-scratch mode', () => {
    const state = parseWizardHash(
      '#mode=scratch&scratchStart=show&theme=contrast',
    );
    expect(state.mode).toBe('scratch');
    expect(state.scratchStart).toBe('show');
    expect(state.theme).toBe('contrast');
    expect(wizardHash(state)).toContain('mode=scratch');
    expect(wizardHash(state)).toContain('scratchStart=show');
  });

  it('infers meta mode from an old skill link', () => {
    const state = parseWizardHash(
      '#league=covens&family=bow&skill=lightning-arrow&ascendancy=deadeye',
    );
    expect(state.mode).toBe('meta');
  });

  it('round-trips every mode through the hash', () => {
    for (const state of [
      DEFAULT_STATE,
      { ...DEFAULT_STATE, mode: 'ascendancy' as const, ascendancyId: 'deadeye', familyId: 'bow' as const },
      {
        ...DEFAULT_STATE,
        mode: 'meta' as const,
        familyId: 'bow' as const,
        skillId: 'lightning-arrow',
        ascendancyId: 'deadeye',
      },
    ]) {
      expect(parseWizardHash(`#${wizardHash(state)}`)).toEqual(state);
    }
  });

  it('repairs an impossible meta selection', () => {
    const state = parseWizardHash(
      '#mode=meta&league=covens&family=bow&skill=nope&ascendancy=necromancer',
    );
    expect(state.familyId).toBe('bow');
    expect(state.skillId).toBe('lightning-arrow');
    expect(state.ascendancyId).toBe('deadeye');
  });

  it('allows a skill from another family', () => {
    const state = parseWizardHash(
      '#mode=meta&league=covens&family=bow&skill=summon-skeletons&ascendancy=necromancer',
    );
    expect(state.familyId).toBe('minion');
    expect(state.skillId).toBe('summon-skeletons');
    expect(state.ascendancyId).toBe('necromancer');
  });

  it('falls back on an unknown league', () => {
    const state = parseWizardHash(
      '#mode=meta&league=nope&family=minion&skill=summon-skeletons&ascendancy=necromancer',
    );
    expect(state.leagueId).toBe('covens');
    expect(state.familyId).toBe('minion');
  });
});

describe('empty start state', () => {
  it('opens an empty hash with nothing selected', () => {
    expect(parseWizardHash('').mode).toBe('start');
    expect(parseWizardHash('#').mode).toBe('start');
    expect(parseWizardHash('#mode=start').mode).toBe('start');
    expect(parseWizardHash('#mode=start')).toEqual(DEFAULT_STATE);
  });

  it('round-trips the empty state through the hash', () => {
    expect(wizardHash(DEFAULT_STATE)).toBe('mode=start');
    expect(parseWizardHash(`#${wizardHash(DEFAULT_STATE)}`)).toEqual(
      DEFAULT_STATE,
    );
  });

  it('coerces a missing or unknown mode to the empty state', () => {
    expect(coerceWizardState({}).mode).toBe('start');
    expect(coerceWizardState({ name: 'X' }).name).toBe('X');
  });

  it('keeps a family hash out of the empty state', () => {
    expect(parseWizardHash('#family=bow').mode).toBe('family');
  });

  it('uses a stand-in rule key for the empty state', () => {
    expect(ruleKey(DEFAULT_STATE)).toBe('start');
    expect(ruleKey(parseWizardHash('#mode=family&family=bow'))).toBe(
      'family:bow',
    );
  });
});

describe('coerceWizardState', () => {
  it('normalizes an imported full build', () => {
    const state = coerceWizardState({
      mode: 'meta',
      leagueId: 'covens',
      familyId: 'bow',
      skillId: 'toxic-rain',
      ascendancyId: 'pathfinder',
      phase: 'endgame',
      strictness: 'strict',
      theme: 'contrast',
    });
    expect(state).toMatchObject({
      mode: 'meta',
      familyId: 'bow',
      skillId: 'toxic-rain',
      ascendancyId: 'pathfinder',
      phase: 'endgame',
      strictness: 'strict',
      theme: 'contrast',
    });
    expect(Object.values(state.sections).every(Boolean)).toBe(true);
  });

  it('trims the imported build name', () => {
    const state = coerceWizardState({ name: '  My Vortex  ' });
    expect(state.name).toBe('My Vortex');
  });
});
