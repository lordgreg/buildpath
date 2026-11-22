import known from '../data/known-base-types.json';
import type { Rule } from '../filter/types.ts';

const KNOWN_BASES = new Set(known.names);

/**
 * Drops BaseType names the game no longer accepts.
 *
 * A stored custom rule can predate a data fix (for example a copied preset rule
 * that listed a base since removed from the game). The client refuses the whole
 * filter on the first unknown name, so such a name must never be emitted. Only
 * `baseTypes` is touched; every other condition is left exactly as written.
 */
export function withoutUnknownBases(rules: readonly Rule[]): Rule[] {
  return rules.map((rule) => {
    if (!rule.baseTypes?.length) return rule;
    const baseTypes = rule.baseTypes.filter((name) => KNOWN_BASES.has(name));
    return baseTypes.length === rule.baseTypes.length
      ? rule
      : { ...rule, baseTypes };
  });
}
