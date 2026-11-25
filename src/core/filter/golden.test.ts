import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateFilter, type FilterConfig } from './generate.ts';
import type { Phase, Strictness } from './presets.ts';
import type { BuildSelection } from '../../meta/types.ts';

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

/**
 * `mode=build` is a third source of slots (D15). Its goldens pin the output for
 * a fixed preset hash, so a build filter that silently changes shape is caught
 * here rather than in a downloaded file.
 */
const BUILD_CASES: {
  selection: BuildSelection;
  phase: Phase;
  strictness: Strictness;
}[] = [
  {
    selection: { mode: 'build', buildId: 'summon-skeletons-necromancer' },
    phase: 'leveling',
    strictness: 'soft',
  },
  {
    selection: { mode: 'build', buildId: 'summon-skeletons-necromancer' },
    phase: 'endgame',
    strictness: 'strict',
  },
];

function golden(name: string): string {
  return readFileSync(new URL(`./__golden__/${name}.filter`, import.meta.url), 'utf8');
}

function pin(name: string, text: string): void {
  // Regenerate with `GOLDEN_WRITE=1 npm test` after reviewing a diff.
  if (process.env.GOLDEN_WRITE) {
    writeFileSync(new URL(`./__golden__/${name}.filter`, import.meta.url), text);
  }
  expect(text).toBe(golden(name));
}

describe('golden filters', () => {
  for (const config of CASES) {
    const name = `${config.archetypeId}-${config.phase}-${config.strictness}`;

    it(`matches ${name}`, () => {
      pin(name, generateFilter(config).text);
    });
  }

  for (const { selection, phase, strictness } of BUILD_CASES) {
    const name = `build-${selection.buildId}-${phase}-${strictness}`;

    it(`matches ${name}`, () => {
      pin(name, generateFilter({ selection, phase, strictness }).text);
    });
  }
});
