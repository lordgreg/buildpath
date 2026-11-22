import {
  baseTypes,
  basesRequiring,
  basesWithTag,
} from '../data/base-types.ts';
import { toFilterClass } from '../filter/classes.ts';

export type ChipId =
  | 'attr:str'
  | 'attr:dex'
  | 'attr:int'
  | 'slot:head'
  | 'slot:body'
  | 'slot:gloves'
  | 'slot:boots'
  | 'slot:shield'
  | 'slot:quiver'
  | 'slot:belt'
  | 'slot:amulet'
  | 'slot:ring'
  | 'weapon:1h'
  | 'weapon:2h'
  | 'weapon:ranged';

export interface ChipDefinition {
  id: ChipId;
  label: string;
  hint: string;
}

export const CHIPS: ChipDefinition[] = [
  {
    id: 'attr:dex',
    label: 'DEX item',
    hint: 'Bases whose requirements include dexterity',
  },
  {
    id: 'attr:str',
    label: 'STR item',
    hint: 'Bases whose requirements include strength',
  },
  {
    id: 'attr:int',
    label: 'INT item',
    hint: 'Bases whose requirements include intelligence',
  },
  { id: 'slot:head', label: 'Head', hint: 'Helmets' },
  { id: 'slot:body', label: 'Body', hint: 'Body armours' },
  { id: 'slot:gloves', label: 'Gloves', hint: 'Gloves' },
  { id: 'slot:boots', label: 'Boots', hint: 'Boots' },
  { id: 'slot:shield', label: 'Shield', hint: 'Shields' },
  { id: 'slot:quiver', label: 'Quiver', hint: 'Quivers' },
  { id: 'slot:belt', label: 'Belt', hint: 'Belts' },
  { id: 'slot:amulet', label: 'Amulet', hint: 'Amulets' },
  { id: 'slot:ring', label: 'Ring', hint: 'Rings' },
  {
    id: 'weapon:1h',
    label: 'Weapon 1H',
    hint: 'One-hand axes, swords, maces, claws, daggers, sceptres and wands',
  },
  {
    id: 'weapon:2h',
    label: 'Weapon 2H',
    hint: 'Two-hand axes, swords, maces, staves and warstaves',
  },
  {
    id: 'weapon:ranged',
    label: 'Weapon ranged',
    hint: 'Bases tagged ranged, such as bows and wands',
  },
];

/** RePoE item class behind each slot chip. */
const SLOT_CLASS: Partial<Record<ChipId, string>> = {
  'slot:head': 'Helmet',
  'slot:body': 'Body Armour',
  'slot:gloves': 'Gloves',
  'slot:boots': 'Boots',
  'slot:shield': 'Shield',
  'slot:quiver': 'Quiver',
  'slot:belt': 'Belt',
  'slot:amulet': 'Amulet',
  'slot:ring': 'Ring',
};

const ONE_HAND_CLASSES = new Set([
  'One Hand Axes',
  'One Hand Maces',
  'One Hand Swords',
  'Thrusting One Hand Swords',
  'Claws',
  'Daggers',
  'Rune Daggers',
  'Sceptres',
  'Wands',
]);

const TWO_HAND_CLASSES = new Set([
  'Two Hand Axes',
  'Two Hand Swords',
  'Two Hand Maces',
  'Staves',
  'Warstaves',
]);

function names(bases: { name: string }[]): string[] {
  return [...new Set(bases.map((base) => base.name))].sort();
}

export function chipBaseTypes(id: ChipId): string[] {
  const slotClass = SLOT_CLASS[id];
  if (slotClass) {
    return names(
      baseTypes.filter((base) => base.itemClass === slotClass),
    );
  }

  switch (id) {
    case 'attr:str':
      return names(basesRequiring('str'));
    case 'attr:dex':
      return names(basesRequiring('dex'));
    case 'attr:int':
      return names(basesRequiring('int'));
    case 'weapon:1h':
      return names(
        baseTypes.filter((base) =>
          ONE_HAND_CLASSES.has(toFilterClass(base.itemClass)),
        ),
      );
    case 'weapon:2h':
      return names(
        baseTypes.filter((base) =>
          TWO_HAND_CLASSES.has(toFilterClass(base.itemClass)),
        ),
      );
    case 'weapon:ranged':
      return names(basesWithTag('ranged'));
    default:
      return [];
  }
}

export function unionChipBases(ids: readonly ChipId[]): string[] {
  const union = new Set<string>();
  for (const id of ids) {
    for (const name of chipBaseTypes(id)) union.add(name);
  }
  return [...union].sort();
}

export function chipLabel(id: string): string {
  return CHIPS.find((chip) => chip.id === id)?.label ?? id;
}
