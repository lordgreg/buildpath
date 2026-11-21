import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, parseWizardHash, wizardHash } from './wizardState.ts';

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

  it('parses the filter theme', () => {
    const state = parseWizardHash(
      '#mode=family&family=minion&theme=contrast',
    );
    expect(state.theme).toBe('contrast');
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