import { describe, expect, it } from 'vitest';
import {
  getAscendanciesForSkill,
  getSnapshot,
  LEAGUE_IDS,
} from '../../meta/index.ts';
import knownBaseTypes from '../data/known-base-types.json';
import knownClasses from '../data/known-classes.json';
import { allSelections } from './all-selections.ts';
import { generateFilter } from './generate.ts';
import { STRICTNESS_ORDER } from './presets.ts';

const baseTypeNames = new Set(knownBaseTypes.names);
const classNames = new Set(knownClasses.names);
const PHASES = ['leveling', 'endgame'] as const;

function emittedNames(
  text: string,
  condition: 'Class' | 'BaseType',
): string[] {
  const names: string[] = [];
  const pattern = new RegExp(`^ {4}${condition} (?:== )?(.+)$`, 'm');
  for (const line of text.split('\n')) {
    const match = pattern.exec(line);
    if (!match) continue;
    for (const quoted of match[1]!.matchAll(/"([^"]*)"/g)) {
      names.push(quoted[1]!);
    }
  }
  return names;
}

describe('all-selections helper', () => {
  const selections = allSelections();

  it('covers every family and ascendancy', () => {
    expect(selections.some(({ selection }) => selection.mode === 'family')).toBe(
      true,
    );
    expect(
      selections.some(({ selection }) => selection.mode === 'ascendancy'),
    ).toBe(true);
  });

  it('covers every skill paired with every ascendancy it allows', () => {
    const pairs = new Set(
      selections
        .filter(({ selection }) => selection.mode === 'meta')
        .map(
          ({ selection }) =>
            `${selection.leagueId}:${selection.skillId}:${selection.ascendancyId}`,
        ),
    );

    for (const leagueId of LEAGUE_IDS) {
      for (const skill of getSnapshot(leagueId).skills) {
        for (const ascendancy of getAscendanciesForSkill(skill)) {
          const key = `${leagueId}:${skill.id}:${ascendancy.id}`;
          expect(pairs.has(key), key).toBe(true);
        }
      }
    }
  });

  it('covers both scratch starts', () => {
    const starts = new Set(
      selections
        .filter(({ selection }) => selection.mode === 'scratch')
        .map(({ selection }) => selection.scratchStart),
    );
    expect(starts).toEqual(new Set(['hide', 'show']));
  });
});

describe('generated filters across every selection', () => {
  it('only reference registered Class and BaseType names', () => {
    const unknownClasses = new Set<string>();
    const unknownBases = new Set<string>();

    for (const { label, selection } of allSelections()) {
      for (const phase of PHASES) {
        for (const strictness of STRICTNESS_ORDER) {
          const where = `${label} ${phase}/${strictness}`;
          const filter = generateFilter({ selection, phase, strictness });

          for (const name of emittedNames(filter.text, 'Class')) {
            if (!classNames.has(name)) unknownClasses.add(`${where}: ${name}`);
          }
          for (const name of emittedNames(filter.text, 'BaseType')) {
            if (!baseTypeNames.has(name)) unknownBases.add(`${where}: ${name}`);
          }
        }
      }
    }

    expect([...unknownClasses]).toEqual([]);
    expect([...unknownBases]).toEqual([]);
  });
});
