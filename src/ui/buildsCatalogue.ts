import type { BuildIndexEntry } from '../core/builds/types.ts';
import type { BuildMedal } from '../core/builds/ratings.ts';

/**
 * The catalogue's remembered controls. They live in `localStorage` so a reader
 * who prefers a dense list, a particular order or a class filter finds the same
 * catalogue on the next visit. The page keeps the state small and JSON-shaped:
 * no build ids, so a delisted build cannot leave a stale selection behind.
 */
export const CATALOGUE_VIEWS = ['cards', 'list'] as const;
export type CatalogueView = (typeof CATALOGUE_VIEWS)[number];

export const CATALOGUE_SORTS = ['tier', 'dps', 'newest'] as const;
export type CatalogueSort = (typeof CATALOGUE_SORTS)[number];

export type SortDirection = 'asc' | 'desc';

export interface CatalogueState {
  view: CatalogueView;
  sort: CatalogueSort;
  direction: SortDirection;
  /** Character classes; empty means every class. */
  classes: string[];
  /** Chip labels, e.g. SSF or Minion; empty means every tag. */
  tags: string[];
}

export const DEFAULT_CATALOGUE_STATE: CatalogueState = {
  view: 'cards',
  sort: 'tier',
  direction: 'desc',
  classes: [],
  tags: [],
};

// Not `filterpath.builds.v1`: that is the legacy saved-build key the builder
// deletes on load, which used to wipe the catalogue controls every time the
// reader opened the filter page and came back.
const STORAGE_KEY = 'filterpath.catalogue.v1';

const MEDAL_RANK: Record<BuildMedal, number> = {
  C: 1,
  B: 2,
  A: 3,
  S: 4,
  'S+': 5,
};

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))];
}

function isView(value: unknown): value is CatalogueView {
  return (CATALOGUE_VIEWS as readonly unknown[]).includes(value);
}

function isSort(value: unknown): value is CatalogueSort {
  return (CATALOGUE_SORTS as readonly unknown[]).includes(value);
}

/** A stored state that is valid now, or the defaults. Unknown values are dropped. */
export function coerceCatalogueState(raw: unknown): CatalogueState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CATALOGUE_STATE };
  const value = raw as Partial<CatalogueState>;
  return {
    view: isView(value.view) ? value.view : DEFAULT_CATALOGUE_STATE.view,
    sort: isSort(value.sort) ? value.sort : DEFAULT_CATALOGUE_STATE.sort,
    direction: value.direction === 'asc' ? 'asc' : 'desc',
    classes: strings(value.classes),
    tags: strings(value.tags),
  };
}

export function readCatalogueState(): CatalogueState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CATALOGUE_STATE };
    return coerceCatalogueState(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CATALOGUE_STATE };
  }
}

export function saveCatalogueState(state: CatalogueState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Blocked or full storage must not break the catalogue.
  }
}

export function clearCatalogueState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore blocked storage.
  }
}

export interface CatalogueOptions {
  classes: string[];
  tags: string[];
}

/** The class and chip filters that exist in the published catalogue. */
export function catalogueOptions(builds: BuildIndexEntry[]): CatalogueOptions {
  const classes = new Set<string>();
  const tags = new Set<string>();
  for (const build of builds) {
    classes.add(build.class);
    for (const chip of build.chips ?? []) tags.add(chip.label);
  }
  return {
    classes: [...classes].sort((a, b) => a.localeCompare(b)),
    tags: [...tags].sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * Within a facet a selection is an OR (Templar or Witch); across facets it is
 * an AND (Templar with SSF). An empty facet means "all", which is the only
 * reading that keeps the reset button honest.
 */
export function filterBuilds(builds: BuildIndexEntry[], state: CatalogueState): BuildIndexEntry[] {
  return builds.filter((build) => {
    if (state.classes.length > 0 && !state.classes.includes(build.class)) return false;
    if (state.tags.length > 0) {
      const labels = (build.chips ?? []).map((chip) => chip.label);
      if (!labels.some((label) => state.tags.includes(label))) return false;
    }
    return true;
  });
}

/** The red-map damage the card shows; a build without that step uses its best. */
export function catalogueDps(build: BuildIndexEntry): number {
  const red = build.steps?.find((step) => step.id === 'maps-red');
  if (red) return red.dps;
  return build.steps?.reduce((best, step) => Math.max(best, step.dps), 0) ?? 0;
}

function newestKey(build: BuildIndexEntry): string {
  return build.verifiedAt ?? '';
}

function nameOrder(a: BuildIndexEntry, b: BuildIndexEntry): number {
  return a.name.localeCompare(b.name);
}

function compareValues(
  a: number | string,
  b: number | string,
  direction: SortDirection,
): number {
  const base = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
  return direction === 'asc' ? base : -base;
}

/**
 * The catalogue order. Ties fall back to the build name so the same controls
 * always produce the same page, whatever order the generated index arrives in.
 */
export function sortBuilds(
  builds: BuildIndexEntry[],
  sort: CatalogueSort,
  direction: SortDirection,
): BuildIndexEntry[] {
  const sorted = [...builds];
  sorted.sort((a, b) => {
    if (sort === 'tier') {
      const rank = compareValues(MEDAL_RANK[a.medal ?? 'C'] ?? 0, MEDAL_RANK[b.medal ?? 'C'] ?? 0, direction);
      return rank === 0 ? nameOrder(a, b) : rank;
    }
    if (sort === 'dps') {
      const damage = compareValues(catalogueDps(a), catalogueDps(b), direction);
      return damage === 0 ? nameOrder(a, b) : damage;
    }
    // A build that has never been verified stays last in both directions; an
    // empty key is "unknown", not "the oldest".
    if (!a.verifiedAt && !b.verifiedAt) return nameOrder(a, b);
    if (!a.verifiedAt) return 1;
    if (!b.verifiedAt) return -1;
    const newest = compareValues(newestKey(a), newestKey(b), direction);
    return newest === 0 ? nameOrder(a, b) : newest;
  });
  return sorted;
}

/** Readable direction label; tier and damage are best-first, newest is recent-first. */
export function directionLabel(sort: CatalogueSort, direction: SortDirection): string {
  if (sort === 'newest') return direction === 'desc' ? 'Newest first' : 'Oldest first';
  if (sort === 'dps') return direction === 'desc' ? 'Highest DPS first' : 'Lowest DPS first';
  return direction === 'desc' ? 'Best tier first' : 'Lowest tier first';
}

/** Keep selections that still exist, so a removed tag cannot blank the page. */
export function keepKnown(values: string[], options: string[]): string[] {
  return values.filter((value) => options.includes(value));
}
