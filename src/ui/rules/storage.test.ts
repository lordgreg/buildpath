import { beforeEach, describe, expect, it } from 'vitest';
import {
  discardLegacyClones,
  loadCustomRules,
  saveCustomRules,
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

describe('custom rule storage', () => {
  it('round-trips rules per key', () => {
    const rules = [{ action: 'Show' as const, id: 'custom-1', section: 'custom' as const }];
    saveCustomRules('a', rules);
    saveCustomRules('b', [{ action: 'Hide' as const }]);
    expect(loadCustomRules('a')).toEqual(rules);
    expect(loadCustomRules('b')).toHaveLength(1);
    expect(loadCustomRules('missing')).toEqual([]);
  });

  it('drops malformed entries and empty keys', () => {
    data.set(
      'filterpath.custom-rules.v2',
      JSON.stringify({ a: [{ action: 'Show' }, { nope: true }], b: [] }),
    );
    expect(loadCustomRules('a')).toHaveLength(1);
    saveCustomRules('a', []);
    expect(JSON.parse(data.get('filterpath.custom-rules.v2') ?? '{}')).toEqual(
      {},
    );
  });

  it('removes the whole-set clone key once and reports it', () => {
    data.set('filterpath.clones.v1', '{}');
    expect(discardLegacyClones()).toBe(true);
    expect(data.has('filterpath.clones.v1')).toBe(false);
    expect(discardLegacyClones()).toBe(false);
  });
});