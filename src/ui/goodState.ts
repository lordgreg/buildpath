import type { Rule } from '../core/filter/types.ts';
import { shapeRules } from '../core/rules/sanitize.ts';
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

export interface LoadedGoodState extends GoodState {
  /** Class-name migrations applied while reading the stored rules. */
  notices: string[];
}

const STORAGE_KEY = 'filterpath.good.v1';

export function loadGoodState(): LoadedGoodState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: unknown;
      customRules?: unknown;
    } | null;
    if (!parsed || typeof parsed !== 'object') return null;
    const state = coerceWizardState((parsed.state ?? {}) as Partial<WizardState>);
    const shaped = shapeRules(parsed.customRules);
    return { state, customRules: shaped.rules, notices: shaped.notices };
  } catch {
    return null;
  }
}

export function saveGoodState(good: GoodState): boolean {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: good.state, customRules: good.customRules }),
    );
    return true;
  } catch {
    // Storage can be blocked or full; the caller surfaces this.
    return false;
  }
}

export function clearGoodState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore blocked storage.
  }
}
