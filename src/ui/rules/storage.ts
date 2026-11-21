import { parseClone, type RuleClone } from '../../core/rules/clone.ts';

const STORAGE_KEY = 'filterpath.clones.v1';

function readAll(): Record<string, RuleClone> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clones: Record<string, RuleClone> = {};
    for (const value of Object.values(parsed)) {
      const clone = parseClone(value);
      if (clone) clones[clone.key] = clone;
    }
    return clones;
  } catch {
    return {};
  }
}

function writeAll(clones: Record<string, RuleClone>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clones));
  } catch {
    // Storage can be full or blocked; the caller keeps the in-memory copy.
  }
}

export function loadClone(key: string): RuleClone | null {
  return readAll()[key] ?? null;
}

export function saveClone(clone: RuleClone): void {
  const clones = readAll();
  clones[clone.key] = clone;
  writeAll(clones);
}

export function deleteClone(key: string): void {
  const clones = readAll();
  delete clones[key];
  writeAll(clones);
}

export function listClones(): RuleClone[] {
  return Object.values(readAll()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}