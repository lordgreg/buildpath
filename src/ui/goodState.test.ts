import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearGoodState,
  loadGoodState,
  saveGoodState,
} from './goodState.ts';
import { DEFAULT_STATE, parseWizardHash } from './wizardState.ts';

function installStorage(): Map<string, string> {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  });
  return data;
}

beforeEach(() => {
  installStorage();
});

describe('good state', () => {
  it('round-trips a build and its rules', () => {
    const state = parseWizardHash('#mode=family&family=bow&phase=endgame');
    const rules = [{ action: 'Show' as const, id: 'custom-1', section: 'custom' as const }];
    saveGoodState({ state, customRules: rules });

    const loaded = loadGoodState();
    expect(loaded?.state).toEqual(state);
    expect(loaded?.customRules).toEqual(rules);
  });

  it('returns null when nothing was saved', () => {
    expect(loadGoodState()).toBeNull();
  });

  it('drops base types the game no longer accepts', () => {
    saveGoodState({
      state: DEFAULT_STATE,
      customRules: [
        {
          action: 'Show',
          id: 'custom-1',
          section: 'custom',
          baseTypes: ['Not A Real Base', 'Leather Belt'],
        },
      ],
    });
    expect(loadGoodState()?.customRules[0]?.baseTypes).toEqual(['Leather Belt']);
  });

  it('forgets the saved build on clear', () => {
    saveGoodState({ state: DEFAULT_STATE, customRules: [] });
    clearGoodState();
    expect(loadGoodState()).toBeNull();
  });

  it('ignores malformed data', () => {
    localStorage.setItem('filterpath.good.v1', 'not json');
    expect(loadGoodState()).toBeNull();
  });
});
