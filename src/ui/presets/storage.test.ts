import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../wizardState.ts';
import {
  deleteBuild,
  discardLegacyBuilds,
  listBuilds,
  saveBuild,
  updateBuild,
} from './storage.ts';

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

let data: Map<string, string>;

beforeEach(() => {
  data = installStorage();
});

describe('saved builds', () => {
  it('creates and updates a build in place', () => {
    const state = { ...DEFAULT_STATE, name: 'minion' };
    const created = saveBuild('minion', state, [
      { action: 'Show', section: 'custom' },
    ]);
    expect(created.updatedAt).toBeUndefined();
    expect(created.presetVersion).toBeTruthy();

    const updated = updateBuild(
      created.id,
      'Vortex',
      { ...state, name: 'Vortex', phase: 'endgame' },
      [],
    );

    expect(updated?.id).toBe(created.id);
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(updated?.updatedAt).toBeTruthy();
    expect(updated?.name).toBe('Vortex');
    expect(updated?.state.phase).toBe('endgame');
    expect(updated?.customRules).toBeUndefined();

    const [stored] = listBuilds();
    expect(stored?.name).toBe('Vortex');
    expect(stored?.customRules).toBeUndefined();
  });

  it('returns null when updating a missing build', () => {
    expect(updateBuild('missing', 'x', DEFAULT_STATE)).toBeNull();
  });

  it('deletes a build', () => {
    const build = saveBuild('one', DEFAULT_STATE);
    expect(listBuilds()).toHaveLength(1);
    deleteBuild(build.id);
    expect(listBuilds()).toEqual([]);
  });

  it('discards the legacy builds key once', () => {
    data.set('filterpath.builds.v1', '[]');
    expect(discardLegacyBuilds()).toBe(true);
    expect(data.has('filterpath.builds.v1')).toBe(false);
    expect(discardLegacyBuilds()).toBe(false);
  });
});