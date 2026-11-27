import { beforeEach, describe, expect, it } from 'vitest';
import type { BuildChip, BuildIndexEntry, BuildStepSummary } from '../core/builds/types.ts';
import { discardLegacyBuilds } from './presets/storage.ts';
import {
  catalogueDps,
  catalogueOptions,
  coerceCatalogueState,
  filterBuilds,
  keepKnown,
  readCatalogueState,
  saveCatalogueState,
  clearCatalogueState,
  sortBuilds,
  DEFAULT_CATALOGUE_STATE,
  type CatalogueState,
} from './buildsCatalogue.ts';

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

function build(
  id: string,
  options: {
    class?: BuildIndexEntry['class'];
    medal?: BuildIndexEntry['medal'];
    chips?: BuildChip[];
    gateSteps?: BuildStepSummary[];
    verifiedAt?: string;
    name?: string;
  } = {},
): BuildIndexEntry {
  return {
    id,
    name: options.name ?? id,
    class: options.class ?? 'Witch',
    ascendancyId: 'elementalist',
    family: 'caster',
    mainSkill: 'Arc',
    summary: 'A generated test build.',
    status: 'verified',
    seedHash: id,
    medal: options.medal,
    chips: options.chips ?? [{ label: 'SSF', kind: 'ssf' }],
    gateSteps: options.gateSteps,
    verifiedAt: options.verifiedAt,
  };
}

const dpsSteps = (dps: number): BuildStepSummary[] => [
  { id: 'maps-red', pass: true, level: 90, dps },
];

const state = (overrides: Partial<CatalogueState> = {}): CatalogueState => ({
  ...DEFAULT_CATALOGUE_STATE,
  ...overrides,
});

let data: Map<string, string>;

beforeEach(() => {
  data = installStorage();
});

describe('catalogue settings', () => {
  it('starts with cards, tier order and no filters', () => {
    expect(readCatalogueState()).toEqual(DEFAULT_CATALOGUE_STATE);
  });

  it('round-trips every control and clears back to defaults', () => {
    saveCatalogueState(
      state({ view: 'list', sort: 'dps', direction: 'asc', classes: ['Witch'], tags: ['SSF'] }),
    );
    expect(readCatalogueState()).toEqual({
      view: 'list',
      sort: 'dps',
      direction: 'asc',
      classes: ['Witch'],
      tags: ['SSF'],
    });
    clearCatalogueState();
    expect(readCatalogueState()).toEqual(DEFAULT_CATALOGUE_STATE);
    expect(data.size).toBe(0);
  });

  it('drops a malformed or unknown stored state instead of trusting it', () => {
    expect(coerceCatalogueState({ view: 'grid', sort: 'chaos', direction: 'sideways', classes: 'Witch' }))
      .toEqual(DEFAULT_CATALOGUE_STATE);
    expect(coerceCatalogueState({ classes: ['Witch', 'Witch', 3], tags: ['SSF', null] })).toEqual({
      ...DEFAULT_CATALOGUE_STATE,
      classes: ['Witch'],
      tags: ['SSF'],
    });
    saveCatalogueState(state({ view: 'list' }));
    data.set([...data.keys()][0]!, '{not json');
    expect(readCatalogueState()).toEqual(DEFAULT_CATALOGUE_STATE);
  });

  it('ignores the legacy saved-build key', () => {
    data.set('filterpath.builds.v1', '[]');
    expect(readCatalogueState()).toEqual(DEFAULT_CATALOGUE_STATE);
  });

  it('keeps its own key when the builder discards legacy saved builds', () => {
    // The builder deletes `filterpath.builds.v1` on load. The catalogue used to
    // share that key, so opening the filter page reset the card/list choice.
    saveCatalogueState(state({ view: 'list', sort: 'dps' }));
    data.set('filterpath.builds.v1', '[]');
    discardLegacyBuilds();
    expect(readCatalogueState()).toEqual(state({ view: 'list', sort: 'dps' }));
  });

  it('keeps only selections that still exist', () => {
    expect(keepKnown(['Witch', 'Templar', 'Gone'], ['Witch', 'Templar'])).toEqual([
      'Witch',
      'Templar',
    ]);
  });
});

describe('catalogue options', () => {
  it('lists each class and chip label once, sorted', () => {
    const options = catalogueOptions([
      build('a', {
        class: 'Witch',
        chips: [
          { label: 'SSF', kind: 'ssf' },
          { label: 'Minion', kind: 'playstyle' },
        ],
      }),
      build('b', {
        class: 'Templar',
        chips: [
          { label: 'SSF', kind: 'ssf' },
          { label: 'Fast clear', kind: 'note' },
        ],
      }),
    ]);
    expect(options.classes).toEqual(['Templar', 'Witch']);
    expect(options.tags).toEqual(['Fast clear', 'Minion', 'SSF']);
  });
});

describe('catalogue filters', () => {
  const builds = [
    build('witch-minion', {
      class: 'Witch',
      chips: [
        { label: 'SSF', kind: 'ssf' },
        { label: 'Minion', kind: 'playstyle' },
      ],
    }),
    build('templar-minion', {
      class: 'Templar',
      chips: [
        { label: 'SSF', kind: 'ssf' },
        { label: 'Minion', kind: 'playstyle' },
      ],
    }),
    build('ranger-bow', {
      class: 'Ranger',
      chips: [
        { label: 'SSF', kind: 'ssf' },
        { label: 'Fast clear', kind: 'note' },
      ],
    }),
  ];

  it('ORs within a facet and ANDs across facets', () => {
    expect(filterBuilds(builds, state({ classes: ['Witch', 'Templar'] })).map((b) => b.id)).toEqual([
      'witch-minion',
      'templar-minion',
    ]);
    expect(
      filterBuilds(builds, state({ classes: ['Witch', 'Templar'], tags: ['Fast clear'] })),
    ).toEqual([]);
    expect(filterBuilds(builds, state({ tags: ['Fast clear'] })).map((b) => b.id)).toEqual([
      'ranger-bow',
    ]);
  });

  it('treats an empty facet as all and matches a build with no chips only when unfiltered', () => {
    expect(filterBuilds(builds, state())).toHaveLength(3);
    const unchanged = [build('no-chips', { chips: [] })];
    expect(filterBuilds(unchanged, state())).toHaveLength(1);
    expect(filterBuilds(unchanged, state({ tags: ['SSF'] }))).toHaveLength(0);
  });
});

describe('catalogue order', () => {
  const builds = [
    build('a', {
      name: 'Alpha',
      class: 'Witch',
      medal: 'B',
      gateSteps: dpsSteps(20_000),
      verifiedAt: '2026-11-26T18:00:00.000Z',
    }),
    build('b', {
      name: 'Bravo',
      class: 'Templar',
      medal: 'S',
      gateSteps: dpsSteps(90_000),
      verifiedAt: '2026-11-26T19:00:00.000Z',
    }),
    build('c', {
      name: 'Charlie',
      class: 'Ranger',
      medal: 'A',
      gateSteps: dpsSteps(50_000),
      verifiedAt: '2026-11-26T17:00:00.000Z',
    }),
  ];

  it('orders by medal with the best first by default', () => {
    expect(sortBuilds(builds, 'tier', 'desc').map((b) => b.id)).toEqual(['b', 'c', 'a']);
    expect(sortBuilds(builds, 'tier', 'asc').map((b) => b.id)).toEqual(['a', 'c', 'b']);
  });

  it('orders by red-map damage, using the best step when there is no red-map step', () => {
    expect(sortBuilds(builds, 'dps', 'desc').map((b) => b.id)).toEqual(['b', 'c', 'a']);
    expect(sortBuilds(builds, 'dps', 'asc').map((b) => b.id)).toEqual(['a', 'c', 'b']);
    const noRed = build('d', {
      gateSteps: [
        { id: 'until-12', pass: true, level: 12, dps: 90 },
        { id: 'pinnacle', pass: true, level: 96, dps: 9_000 },
      ],
    });
    expect(catalogueDps(noRed)).toBe(9_000);
  });

  it('orders by verification date and keeps unknown dates last in both directions', () => {
    const unknown = build('d', { name: 'Delta' });
    expect(sortBuilds([...builds, unknown], 'newest', 'desc').map((b) => b.id)).toEqual([
      'b',
      'a',
      'c',
      'd',
    ]);
    expect(sortBuilds([...builds, unknown], 'newest', 'asc').map((b) => b.id)).toEqual([
      'c',
      'a',
      'b',
      'd',
    ]);
  });

  it('breaks ties by name so the same controls always give the same page', () => {
    const tieA = build('tie-a', { name: 'Zulu', medal: 'A' });
    const tieB = build('tie-b', { name: 'Alpha', medal: 'A' });
    expect(sortBuilds([tieA, tieB], 'tier', 'desc').map((b) => b.id)).toEqual(['tie-b', 'tie-a']);
  });

  it('does not mutate the input order', () => {
    const original = builds.map((b) => b.id);
    sortBuilds(builds, 'dps', 'asc');
    expect(builds.map((b) => b.id)).toEqual(original);
  });
});
