import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (name: string) => readFileSync(resolve(root, name), 'utf8');

describe('site entrypoints', () => {
  it('makes the build catalogue the landing page', () => {
    const index = read('index.html');
    expect(index).toContain('/src/builds-main.tsx');
    expect(index).toContain('./filter.html');
    expect(index).toContain('window.location.hash');
  });

  it('keeps the filter builder on its own page', () => {
    expect(read('filter.html')).toContain('/src/main.tsx');
    expect(read('builds.html')).toContain('/src/builds-main.tsx');
  });
});
