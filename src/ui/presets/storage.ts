import type { Rule } from '../../core/filter/types.ts';
import { PRESET_VERSION } from '../../meta/index.ts';
import type { WizardState } from '../wizardState.ts';

export interface SavedBuild {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  /** Preset hash at save time; used to tell the user presets have changed. */
  presetVersion?: string;
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

function cloneRules(rules?: Rule[]): Rule[] | undefined {
  return rules && rules.length > 0
    ? (JSON.parse(JSON.stringify(rules)) as Rule[])
    : undefined;
}

export function listBuilds(): SavedBuild[] {
  return readAll().sort((a, b) =>
    (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
  );
}

export function saveBuild(
  name: string,
  state: WizardState,
  customRules?: Rule[],
): SavedBuild {
  const rules = cloneRules(customRules);
  const build: SavedBuild = {
    id: `build-${Date.now()}`,
    name: name.trim() || 'Untitled build',
    createdAt: new Date().toISOString(),
    presetVersion: PRESET_VERSION,
    state: JSON.parse(JSON.stringify(state)) as WizardState,
    ...(rules ? { customRules: rules } : {}),
  };
  writeAll([...readAll(), build]);
  return build;
}

/** Overwrites a saved build in place, keeping its id and creation time. */
export function updateBuild(
  id: string,
  name: string,
  state: WizardState,
  customRules?: Rule[],
): SavedBuild | null {
  const builds = readAll();
  const index = builds.findIndex((build) => build.id === id);
  if (index < 0) return null;
  const previous = builds[index]!;
  const rules = cloneRules(customRules);
  const build: SavedBuild = {
    ...previous,
    name: name.trim() || 'Untitled build',
    updatedAt: new Date().toISOString(),
    presetVersion: PRESET_VERSION,
    state: JSON.parse(JSON.stringify(state)) as WizardState,
    ...(rules ? { customRules: rules } : {}),
  };
  if (!rules) delete build.customRules;
  builds[index] = build;
  writeAll(builds);
  return build;
}

export function deleteBuild(id: string): void {
  writeAll(readAll().filter((build) => build.id !== id));
}