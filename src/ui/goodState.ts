import type { Rule } from '../core/filter/types.ts';
import { withoutUnknownBases } from '../core/rules/sanitize.ts';
import { coerceWizardState, type WizardState } from './wizardState.ts';

/**
 * The last committed build: the state reload, Leave and Reset go back to.
 * Stored in `localStorage` so it survives a refresh, a new tab and a browser
 * restart. Unsaved edits live only in memory and never overwrite this.
 */
export interface GoodState {
  state: WizardState;
  customRules: Rule[];
}

const STORAGE_KEY = 'filterpath.good.v1';

export function loadGoodState(): GoodState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: unknown;
      customRules?: unknown;
    } | null;
    if (!parsed || typeof parsed !== 'object') return null;
    const state = coerceWizardState((parsed.state ?? {}) as Partial<WizardState>);
    const customRules = withoutUnknownBases(
      Array.isArray(parsed.customRules) ? (parsed.customRules as Rule[]) : [],
    );
    return { state, customRules };
  } catch {
    return null;
  }
}

export function saveGoodState(good: GoodState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(good));
  } catch {
    // Storage can be blocked or full; the in-memory state still works.
  }
}

export function clearGoodState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore blocked storage.
  }
}
