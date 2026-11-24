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

  it('keeps unknown base types for the editor to show', () => {
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
    // The generator drops the unknown name; stripping it on load would let an
    // edit turn a rule listing only unknown names into a catch-all.
    expect(loadGoodState()?.customRules[0]?.baseTypes).toEqual([
      'Not A Real Base',
      'Leather Belt',
    ]);
  });

  it('migrates legacy class names and reports them', () => {
    localStorage.setItem(
      'filterpath.good.v1',
      JSON.stringify({
        state: DEFAULT_STATE,
        customRules: [
          { action: 'Show', id: 'custom-1', classNames: ['Swords'] },
        ],
      }),
    );
    const loaded = loadGoodState();
    expect(loaded?.customRules[0]?.classNames).toEqual([
      'One Hand Swords',
      'Thrusting One Hand Swords',
      'Two Hand Swords',
    ]);
    expect(loaded?.notices).toHaveLength(1);
    expect(loaded?.notices[0]).toContain('"Swords" was expanded');
  });

  it('disables a rule whose class names are all unknown', () => {
    localStorage.setItem(
      'filterpath.good.v1',
      JSON.stringify({
        state: DEFAULT_STATE,
        customRules: [
          { action: 'Show', id: 'custom-1', classNames: ['Not A Class'] },
        ],
      }),
    );
    const loaded = loadGoodState();
    expect(loaded?.customRules[0]).toMatchObject({
      classNames: ['Not A Class'],
      disabled: true,
    });
    expect(loaded?.notices.join(' ')).toContain('was disabled');
  });

  it('repairs a malformed field instead of dropping the rule', () => {
    localStorage.setItem(
      'filterpath.good.v1',
      JSON.stringify({
        state: DEFAULT_STATE,
        customRules: [
          { action: 'Hide', baseTypes: 'Leather Belt' },
          { action: 'Show', baseTypes: ['Leather Belt'] },
        ],
      }),
    );
    expect(loadGoodState()?.customRules).toEqual([
      { action: 'Hide', baseTypes: ['Leather Belt'] },
      { action: 'Show', baseTypes: ['Leather Belt'] },
    ]);
  });

  it('reports a blocked storage write', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota');
        },
        removeItem: () => {},
      },
    });
    expect(saveGoodState({ state: DEFAULT_STATE, customRules: [] })).toBe(false);
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
