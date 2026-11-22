import { describe, expect, it } from 'vitest';
import { parseItemText } from './parse-item.ts';

const LEAKS = `Item Class: Gloves
Rarity: Normal
Superior Rawhide Gloves
--------
Quality: +17% (augmented)
Evasion Rating: 20 (augmented)
--------
Sockets: W-W-W 
--------
Item Level: 14

Item Class: One Hand Axes
Rarity: Magic
Boarding Axe
--------
Physical Damage: 11-21
--------
Sockets: W W 
--------
Item Level: 15
--------
Unidentified

Item Class: Body Armours
Rarity: Magic
Oiled Vest
--------
Energy Shield: 18
--------
Sockets: W-W 
--------
Item Level: 16
--------
Unidentified`;

describe('parseItemText', () => {
  it('parses several pasted items', () => {
    const items = parseItemText(LEAKS);
    expect(items).toHaveLength(3);

    expect(items[0]).toMatchObject({
      name: 'Superior Rawhide Gloves',
      baseType: 'Rawhide Gloves',
      itemClass: 'Gloves',
      rarity: 'Normal',
      itemLevel: 14,
      quality: 17,
      sockets: 3,
      linkedSockets: 3,
    });

    expect(items[1]).toMatchObject({
      baseType: 'Boarding Axe',
      itemClass: 'One Hand Axes',
      rarity: 'Magic',
      itemLevel: 15,
      sockets: 2,
      linkedSockets: 1,
      identified: false,
    });

    expect(items[2]).toMatchObject({
      baseType: 'Oiled Vest',
      sockets: 2,
      linkedSockets: 2,
      itemLevel: 16,
    });
  });

  it('uses the second line as the base for rares and uniques', () => {
    const items = parseItemText(`Item Class: Rings
Rarity: Rare
Doom Loop
Amethyst Ring
--------
Item Level: 86
--------
Unidentified`);
    expect(items[0]).toMatchObject({
      name: 'Doom Loop',
      baseType: 'Amethyst Ring',
      rarity: 'Rare',
      itemLevel: 86,
    });
  });

  it('parses currency blocks with Rarity: Currency', () => {
    const items = parseItemText(`Item Class: Stackable Currency
Rarity: Currency
Divine Orb
--------
Stack Size: 1/20
--------
Randomises the values of the random modifiers on an item
--------
Right click this item then left click a magic, rare or unique item to apply it.`);
    expect(items[0]).toMatchObject({
      name: 'Divine Orb',
      itemClass: 'Stackable Currency',
      baseType: 'Divine Orb',
      rarity: 'Currency',
      stackSize: 1,
    });
  });

  it('parses league Viscera drops without a Rarity line', () => {
    const items = parseItemText(`Item Class: Viscera
Lesser Justicar's Helm
--------
Head
--------
Item Level: 41
--------
{ Implicit Modifier }
22(18-24)% increased Stun Threshold
--------
Take this to the Wickerman in a town or hideout to attach it.`);
    expect(items[0]).toMatchObject({
      name: "Lesser Justicar's Helm",
      itemClass: 'Viscera',
      baseType: "Lesser Justicar's Helm",
      rarity: 'Normal',
      itemLevel: 41,
    });
  });

  it('ignores text without an item class', () => {
    expect(parseItemText('hello world')).toEqual([]);
  });
});