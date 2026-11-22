import { beforeEach, describe, expect, it } from 'vitest';
import { readOpenFlag, writeOpenFlag } from './usePersistedOpen.ts';

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

describe('persisted collapse state', () => {
  it('round-trips a flag under the ui namespace', () => {
    writeOpenFlag('preview-open', true);
    expect(readOpenFlag('preview-open')).toBe(true);
    expect(data.get('filterpath.ui.preview-open')).toBe('1');
    writeOpenFlag('preview-open', false);
    expect(readOpenFlag('preview-open')).toBe(false);
  });

  it('falls back when nothing is stored', () => {
    expect(readOpenFlag('preview-open')).toBe(false);
    expect(readOpenFlag('preview-open', true)).toBe(true);
  });
});
