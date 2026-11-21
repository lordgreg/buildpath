import type { Rule } from '../../core/filter/types.ts';

const STORAGE_KEY = 'filterpath.custom-rules.v2';
const LEGACY_CLONES = 'filterpath.clones.v1';

export function discardLegacyClones(): boolean {
  try {
    if (localStorage.getItem(LEGACY_CLONES) === null) return false;
    localStorage.removeItem(LEGACY_CLONES);
    return true;
  } catch {
    return false;
  }
}

function discardLegacy(): void {
  discardLegacyClones();
}

function readAll(): Record<string, Rule[]> {
  discardLegacy();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const rules: Record<string, Rule[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!Array.isArray(value) || value.length === 0) continue;
      rules[key] = value.filter(
        (rule): rule is Rule =>
          !!rule &&
          typeof rule === 'object' &&
          ((rule as Rule).action === 'Show' ||
            (rule as Rule).action === 'Hide'),
      );
    }
    return rules;
  } catch {
    return {};
  }
}

function writeAll(rules: Record<string, Rule[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // Ignore quota/blocked storage.
  }
}

export function loadCustomRules(key: string): Rule[] {
  return readAll()[key] ?? [];
}

export function saveCustomRules(key: string, rules: Rule[]): void {
  const all = readAll();
  if (rules.length === 0) delete all[key];
  else all[key] = rules;
  writeAll(all);
}

export function deleteCustomRules(key: string): void {
  const all = readAll();
  delete all[key];
  writeAll(all);
}