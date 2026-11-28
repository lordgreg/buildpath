import { describe, expect, it } from 'vitest';
import type { BuildIndexEntry } from '../core/builds/types.ts';
import { searchSite } from './search.ts';

function build(overrides: Partial<BuildIndexEntry> & Pick<BuildIndexEntry, 'id' | 'name'>): BuildIndexEntry {
  return {
    class: 'Templar',
    ascendancyId: 'guardian',
    family: 'minion',
    mainSkill: 'Absolution',
    summary: '',
    status: 'verified',
    seedHash: 'x',
    ...overrides,
  };
}

const builds = [
  build({ id: 'absolution-guardian', name: 'Absolution Guardian' }),
  build({
    id: 'summon-skeletons-necromancer',
    name: 'Summon Skeletons Necromancer',
    class: 'Witch',
    ascendancyId: 'necromancer',
    family: 'minion',
    mainSkill: 'Summon Skeletons',
    summary: 'A league-start minion build.',
    chips: [{ label: 'Minion', kind: 'playstyle' }],
  }),
  build({
    id: 'lightning-arrow-deadeye',
    name: 'Lightning Arrow Deadeye',
    class: 'Ranger',
    ascendancyId: 'deadeye',
    family: 'bow',
    mainSkill: 'Lightning Arrow',
  }),
];

describe('site search', () => {
  it('matches a build title first', () => {
    const results = searchSite('lightning arrow', builds);
    expect(results[0]?.kind).toBe('build');
    expect(results[0]?.title).toBe('Lightning Arrow Deadeye');
  });

  it('matches an ascendancy', () => {
    const results = searchSite('necromancer', builds);
    expect(results.some((result) => result.id === 'summon-skeletons-necromancer')).toBe(true);
  });

  it('matches a chip label', () => {
    const results = searchSite('minion', builds);
    expect(results.some((result) => result.id === 'summon-skeletons-necromancer')).toBe(true);
  });

  it('matches a site page', () => {
    const results = searchSite('changelog', builds);
    expect(results.some((result) => result.kind === 'page' && result.id === 'changelog')).toBe(true);
  });

  it('returns pages for an empty query', () => {
    const results = searchSite('', builds);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.kind === 'page')).toBe(true);
  });
});
