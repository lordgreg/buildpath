import type { Archetype, ItemSlot } from '../archetypes/types.ts';
import { resolveSlotBases } from '../data/resolve.ts';
import { toFilterClass } from '../filter/classes.ts';
import type { PreviewItem } from './match.ts';

export interface PaperDollEntry {
  slot: ItemSlot;
  label: string;
  item: PreviewItem | null;
}

function makeItem(
  id: string,
  base: { name: string; itemClass: string },
  itemLevel = 86,
): PreviewItem {
  return {
    id,
    name: base.name,
    itemClass: toFilterClass(base.itemClass),
    baseType: base.name,
    rarity: 'Rare',
    itemLevel,
    identified: true,
  };
}

/**
 * One representative rare per equipment slot, resolved from the build's own
 * base lists. This is what the filter promises the player will see highlighted.
 */
export function paperDollItems(archetype: Archetype): PaperDollEntry[] {
  const entries: PaperDollEntry[] = [];

  const add = (slot: ItemSlot, label: string, index = 0) => {
    const spec = archetype.slots[slot];
    if (!spec) {
      entries.push({ slot, label, item: null });
      return;
    }
    const bases = resolveSlotBases(spec);
    const base = bases[index] ?? bases[0];
    entries.push({
      slot,
      label,
      item: base ? makeItem(`doll-${slot}-${label}`, base) : null,
    });
  };

  add('weapon', 'Weapon');
  add('offhand', 'Offhand');
  add('helmet', 'Helmet');
  add('body', 'Body armour');
  add('gloves', 'Gloves');
  add('boots', 'Boots');
  add('belt', 'Belt');
  add('amulet', 'Amulet');
  add('ring', 'Ring 1');
  add('ring', 'Ring 2', 1);
  add('jewel', 'Jewel');

  // Two flask slots chosen by class, not by list position.
  const flaskSpec = archetype.slots.flask;
  if (flaskSpec) {
    const bases = resolveSlotBases(flaskSpec);
    for (const [label, itemClass] of [
      ['Life flask', 'Life Flask'],
      ['Utility flask', 'Utility Flask'],
    ] as const) {
      const base = bases.find((entry) => entry.itemClass === itemClass);
      entries.push({
        slot: 'flask',
        label,
        item: base ? makeItem(`doll-flask-${itemClass}`, base) : null,
      });
    }
  } else {
    entries.push({ slot: 'flask', label: 'Life flask', item: null });
    entries.push({ slot: 'flask', label: 'Utility flask', item: null });
  }

  return entries;
}