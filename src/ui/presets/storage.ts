import type { SavedRules } from '../../core/rules/delta.ts';
import type { WizardState } from '../wizardState.ts';

export interface SavedBuild {
  id: string;
  name: string;
  createdAt: string;
  state: WizardState;
  /** Present when the build had an advanced clone. */
  rules?: SavedRules;
}

const STORAGE_KEY = 'filterpath.builds.v1';

function readAll(): SavedBuild[] {
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
  rules?: SavedRules,
): SavedBuild {
  const build: SavedBuild = {
    id: `build-${Date.now()}`,
    name: name.trim() || 'Untitled build',
    createdAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(state)) as WizardState,
    ...(rules
      ? { rules: JSON.parse(JSON.stringify(rules)) as SavedRules }
      : {}),
  };
  writeAll([...readAll(), build]);
  return build;
}

export function deleteBuild(id: string): void {
  writeAll(readAll().filter((build) => build.id !== id));
}