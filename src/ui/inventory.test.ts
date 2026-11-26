import { describe, expect, it } from 'vitest';
import type { GearItem } from '../core/builds/types.ts';
import { inventoryArea, splitGear } from './inventory.ts';

function item(slot: string, base = 'Test Base'): GearItem {
  return { slot, base, mods: ['+1 to Life'], budget: 'test', ilvl: 1 };
}

describe('inventory layout', () => {
  it('maps PoB Weapon 2 to the offhand cell', () => {
    // A shield or quiver is Weapon 2 in PoB; looking for "Shield" is what made
    // the summoner's shield disappear from the page.
    expect(inventoryArea('Weapon 1')).toBe('weapon');
    expect(inventoryArea('Weapon 2')).toBe('offhand');
    expect(inventoryArea('Body Armour')).toBe('body');
    expect(inventoryArea('Shield')).toBeUndefined();
  });

  it('keeps jewels out of the equipment slots and in numeric order', () => {
    const { bySlot, jewels } = splitGear([
      item('Weapon 2', 'Twig Spirit Shield'),
      item('Jewel 10'),
      item('Jewel 2'),
      item('Helmet'),
    ]);
    expect(bySlot.get('Weapon 2')?.base).toBe('Twig Spirit Shield');
    expect(bySlot.has('Jewel 2')).toBe(false);
    expect(jewels.map((jewel) => jewel.slot)).toEqual(['Jewel 2', 'Jewel 10']);
  });
});
