import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateFilter, type FilterConfig } from './generate.ts';

const CASES: FilterConfig[] = [
  {
    archetypeId: 'necro-minions',
    phase: 'leveling',
    strictness: 'normal',
  },
  {
    archetypeId: 'deadeye-lightning-arrow',
    phase: 'endgame',
    strictness: 'strict',
  },
  {
    archetypeId: 'jugg-boneshatter',
    phase: 'endgame',
    strictness: 'very-strict',
  },
];

function golden(name: string): string {
  return readFileSync(new URL(`./__golden__/${name}.filter`, import.meta.url), 'utf8');
}

describe('golden filters', () => {
  for (const config of CASES) {
    const name = `${config.archetypeId}-${config.phase}-${config.strictness}`;

    it(`matches ${name}`, () => {
      expect(generateFilter(config).text).toBe(golden(name));
    });
  }
});