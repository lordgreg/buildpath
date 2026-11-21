import type { Rule } from '../../core/filter/types.ts';
import type { WizardState } from '../wizardState.ts';

export interface SavedBuild {
  id: string;
  name: string;
  createdAt: string;
  state: WizardState;
  /** User rules only; the preset is always regenerated from the latest data. */
  customRules?: Rule[];
}

const STORAGE_KEY = 'filterpath.builds.v2';
const LEGACY_KEY = 'filterpath.builds.v1';

export function discardLegacyBuilds(): boolean {
  try {
    if (localStorage.getItem(LEGACY_KEY) === null) return false;
    localStorage.removeItem(LEGACY_KEY);
    return true;
  } catch {
    return false;
  }
}

function discardLegacy(): void {
  discardLegacyBuilds();
}

function readAll(): SavedBuild[] {
  discardLegacy();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SavedBuild =>
        !!entry &&
        typeof entry === 'object' &&
        typeof (entry as SavedBuild).id === 'string' &&
        typeof (entry as SavedBuild).name === 'string' &&
        typeof (entry as SavedBuild).state === 'object',
    );
  } catch {
    return [];
  }
}

function writeAll(builds: SavedBuild[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(builds));
  } catch {
    // Ignore storage failures; the in-memory list still works.
  }
}

export function listBuilds(): SavedBuild[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveBuild(
  name: string,
  state: WizardState,
  customRules?: Rule[],
): SavedBuild {
  const build: SavedBuild = {
    id: `build-${Date.now()}`,
    name: name.trim() || 'Untitled build',
    createdAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(state)) as WizardState,
    ...(customRules && customRules.length > 0
      ? { customRules: JSON.parse(JSON.stringify(customRules)) as Rule[] }
      : {}),
  };
  writeAll([...readAll(), build]);
  return build;
}

export function deleteBuild(id: string): void {
  writeAll(readAll().filter((build) => build.id !== id));
}