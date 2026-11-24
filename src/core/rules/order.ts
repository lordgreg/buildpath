import type { Rule } from '../filter/types.ts';

/**
 * Generated rules that the emitter writes before any custom rule: the always-on
 * quest, treasure-key and veiled blocks. `compileFilter` puts them first so they
 * cannot be overridden by accident.
 */
const ALWAYS_ON_SECTIONS = new Set(['quest', 'veiled']);

function isAlwaysOn(rule: Rule): boolean {
  return rule.section !== undefined && ALWAYS_ON_SECTIONS.has(rule.section);
}

/**
 * The rules in the order the filter writes them: always-on blocks first, then
 * My rules, then the preset. The web builder compiles the preset without the
 * custom rules, so the two lists are merged here for tools such as the item
 * test that must match the emitted filter.
 */
export function emittedRuleOrder(
  baseRules: readonly Rule[],
  customRules: readonly Rule[],
): Rule[] {
  return [
    ...baseRules.filter(isAlwaysOn),
    ...customRules,
    ...baseRules.filter((rule) => !isAlwaysOn(rule)),
  ];
}
