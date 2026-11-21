import type { SlotSpec } from '../archetypes/types.ts';
import { baseTypes, type BaseType } from './base-types.ts';

/**
 * Expands a slot spec into concrete base types.
 *
 * Precedence: explicit `bases` > RePoE `tags` > the whole `itemClasses` set.
 * Bases are always intersected with `itemClasses` so a typo cannot leak a
 * weapon into an armour slot.
 */
export function resolveSlotBases(spec: SlotSpec): BaseType[] {
  const byClass = baseTypes.filter((base) =>
    spec.itemClasses.includes(base.itemClass),
  );

  if (spec.bases?.length) {
    return byClass.filter((base) => spec.bases!.includes(base.name));
  }

  if (spec.tags?.length) {
    return byClass.filter((base) =>
      spec.tags!.some((tag) => base.tags.includes(tag)),
    );
  }

  return byClass;
}