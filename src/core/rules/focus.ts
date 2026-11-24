import type { Rule } from '../filter/types.ts';
import { customRuleProblem } from './sanitize.ts';

/** The editor rule behind one rule of the emitted filter. */
export type FocusTarget =
  | { kind: 'custom'; index: number }
  | { kind: 'preset'; rule: Rule };

/**
 * Maps an index into the emitted rule list (what the loot simulator reports)
 * back to the editor: a position in My rules, or a preset rule.
 *
 * The emitted list is the always-on rules, then the My rules compileFilter
 * keeps (enabled, and writable), then the preset. `baseRules` is the same
 * filter compiled without My rules, so its preset ids differ from the emitted
 * ones; positions are used instead.
 */
export function focusTargetAt(
  index: number,
  baseRules: readonly Rule[],
  customRules: readonly Rule[],
): FocusTarget | null {
  let fixed = 0;
  while (
    fixed < baseRules.length &&
    (baseRules[fixed]!.section === 'quest' || baseRules[fixed]!.section === 'veiled')
  ) {
    fixed += 1;
  }

  const emittedCustom = customRules
    .map((rule, position) => ({ rule, position }))
    .filter(({ rule }) => !rule.disabled && !customRuleProblem(rule))
    .map(({ position }) => position);

  if (index < 0) return null;
  if (index < fixed) return { kind: 'preset', rule: baseRules[index]! };
  if (index < fixed + emittedCustom.length) {
    return { kind: 'custom', index: emittedCustom[index - fixed]! };
  }
  const preset = baseRules[index - emittedCustom.length];
  return preset ? { kind: 'preset', rule: preset } : null;
}
