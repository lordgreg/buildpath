import type { SavedRules } from '../core/rules/delta.ts';
import type { WizardState } from './wizardState.ts';

export function buildHash(
  state: WizardState,
  rules: SavedRules | undefined,
): string {
  return JSON.stringify({ state, rules: rules ?? null });
}
