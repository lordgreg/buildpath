import type { GearItem } from '../core/builds/types.ts';

/**
 * The equipment window, in the order a player reads it: weapon and offhand on
 * the sides, helmet and amulet at the top, body in the middle, rings beside it,
 * gloves/belt/boots below. The `slot` values are PoB's names; in particular a
 * shield or quiver is `Weapon 2`, never `Shield` (PoB drops a slot it does not
 * know, which is how the summoner's shield once vanished from the page).
 */
export const INVENTORY_SLOTS = [
  { area: 'weapon', slot: 'Weapon 1', label: 'Weapon', tall: true },
  { area: 'helmet', slot: 'Helmet', label: 'Helmet' },
  { area: 'amulet', slot: 'Amulet', label: 'Amulet' },
  { area: 'offhand', slot: 'Weapon 2', label: 'Shield / Quiver', tall: true },
  { area: 'ring1', slot: 'Ring 1', label: 'Ring' },
  { area: 'body', slot: 'Body Armour', label: 'Body Armour', tall: true },
  { area: 'ring2', slot: 'Ring 2', label: 'Ring' },
  { area: 'gloves', slot: 'Gloves', label: 'Gloves' },
  { area: 'belt', slot: 'Belt', label: 'Belt' },
  { area: 'boots', slot: 'Boots', label: 'Boots' },
] as const;

// Seven equal columns keep the one-slot boxes (helmet, body, rings, gloves,
// boots) the same width. Weapon and offhand span two columns, so they read as
// the tall side slots without making the armour cells wide.
export const INVENTORY_AREAS = `
  "weapon weapon . helmet amulet offhand offhand"
  "weapon weapon ring1 body ring2 offhand offhand"
  "gloves . . belt . boots ."
`;

export const FLASK_COUNT = 5;

export function inventoryArea(slot: string): string | undefined {
  return INVENTORY_SLOTS.find((entry) => entry.slot === slot)?.area;
}

export function splitGear(gear: GearItem[]): {
  bySlot: Map<string, GearItem>;
  jewels: GearItem[];
} {
  const bySlot = new Map<string, GearItem>();
  const jewels: GearItem[] = [];
  for (const item of gear) {
    if (item.slot.startsWith('Jewel')) jewels.push(item);
    else bySlot.set(item.slot, item);
  }
  jewels.sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }));
  return { bySlot, jewels };
}
