import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, parseWizardHash, wizardHash } from './wizardState.ts';

describe('wizard hash', () => {
  it('maps an interim archetype link onto a selection', () => {
    const state = parseWizardHash('#archetype=necro-minions');
    expect(state.leagueId).toBe('covens');
    expect(state.familyId).toBe('minion');
    expect(state.skillId).toBe('summon-skeletons');
    expect(state.ascendancyId).toBe('necromancer');
  });

  it('parses the new selection fields', () => {
    const state = parseWizardHash(
      '#league=standard&family=bow&skill=lightning-arrow&ascendancy=deadeye&phase=endgame&strictness=strict&sections=gear,currency',
    );

    expect(state.leagueId).toBe('standard');
    expect(state.familyId).toBe('bow');
    expect(state.skillId).toBe('lightning-arrow');
    expect(state.ascendancyId).toBe('deadeye');
    expect(state.phase).toBe('endgame');
    expect(state.strictness).toBe('strict');
    expect(state.sections.gems).toBe(false);
    expect(state.sections.currency).toBe(true);
  });

  it('round-trips through the hash', () => {
    const hash = wizardHash(DEFAULT_STATE);
    const state = parseWizardHash(`#${hash}`);
    expect(state).toEqual(DEFAULT_STATE);
  });

  it('repairs an impossible selection', () => {
    const state = parseWizardHash(
      '#league=covens&family=bow&skill=summon-skeletons&ascendancy=necromancer',
    );
    expect(state.familyId).toBe('bow');
    expect(state.skillId).toBe('lightning-arrow');
    expect(state.ascendancyId).toBe('deadeye');
  });

  it('falls back on an unknown league', () => {
    const state = parseWizardHash('#league=nope&family=minion');
    expect(state.leagueId).toBe('covens');
    expect(state.familyId).toBe('minion');
  });
});