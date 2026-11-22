import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateFilter, type FilterConfig } from './generate.ts';

const CASES: FilterConfig[] = [
  {
    archetypeId: 'necro-minions',
    phase: 'leveling',
    strictness: 'soft',
  },
  {
    archetypeId: 'deadeye-lightning-arrow',
    phase: 'endgame',
    strictness: 'strict',
  },
  {
    archetypeId: 'jugg-boneshatter',
    phase: 'endgame',
    strictness: 'uber',
  },
];

function golden(name: string): string {
  return readFileSync(new URL(`./__golden__/${name}.filter`, import.meta.url), 'utf8');
}

describe('golden filters', () => {
  for (const config of CASES) {
    const name = `${config.archetypeId}-${config.phase}-${config.strictness}`;

    it(`matches ${name}`, () => {
      const text = generateFilter(config).text;
      // Regenerate with `GOLDEN_WRITE=1 npm test` after reviewing a diff.
      if (process.env.GOLDEN_WRITE) {
        writeFileSync(
          new URL(`./__golden__/${name}.filter`, import.meta.url),
          text,
        );
      }
      expect(text).toBe(golden(name));
    });
  }
});