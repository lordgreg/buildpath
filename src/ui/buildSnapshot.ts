import type { Rule } from '../core/filter/types.ts';
import type { WizardState } from './wizardState.ts';

export function buildHash(
  state: WizardState,
  customRules?: Rule[],
): string {
  return JSON.stringify({ state, customRules: customRules ?? [] });
}