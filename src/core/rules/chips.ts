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
  switch (id) {
    case 'attr:str':
      return names(basesRequiring('str'));
    case 'attr:dex':
      return names(basesRequiring('dex'));
    case 'attr:int':
      return names(basesRequiring('int'));
    case 'slot:head':
      return names(baseTypes.filter((base) => base.itemClass === 'Helmet'));
    case 'weapon:2h':
      return names(
        baseTypes.filter((base) =>
          TWO_HAND_CLASSES.has(toFilterClass(base.itemClass)),
        ),
      );
    case 'weapon:ranged':
      return names(basesWithTag('ranged'));
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