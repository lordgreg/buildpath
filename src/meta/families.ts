import type { Family, FamilyId } from './types.ts';

export const FAMILIES: Family[] = [
  {
    id: 'caster',
    name: 'Caster',
    summary: 'Intelligence bases, spells and an energy-shield shield.',
    attributes: ['int'],
    weapon: { itemClasses: ['Wand'] },
    offhand: { itemClasses: ['Shield'], tags: ['int_armour'] },
    armourTags: ['int_armour'],
    jewelTag: 'intjewel',
  },
  {
    id: 'minion',
    name: 'Minion',
    summary: 'Minion wand and shield, armour/ES hybrid bases.',
    attributes: ['int'],
    weapon: { itemClasses: ['Wand'], tags: ['weapon_can_roll_minion_modifiers'] },
    offhand: {
      itemClasses: ['Shield'],
      tags: ['focus_can_roll_minion_modifiers'],
    },
    armourTags: ['int_armour', 'str_int_armour'],
    jewelTag: 'intjewel',
  },
  {
    id: 'bow',
    name: 'Bow',
    summary: 'Evasion bases, bow and quiver.',
    attributes: ['dex'],
    weapon: { itemClasses: ['Bow'] },
    offhand: { itemClasses: ['Quiver'] },
    armourTags: ['dex_armour'],
    jewelTag: 'dexjewel',
  },
  {
    id: 'melee',
    name: 'Melee',
    summary: 'Strength bases, one-hander and shield by default.',
    attributes: ['str'],
    weapon: { itemClasses: ['One Hand Sword'] },
    offhand: { itemClasses: ['Shield'], tags: ['str_shield'] },
    armourTags: ['str_armour'],
    jewelTag: 'strjewel',
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    summary: 'Dexterity/intelligence bases, claw and shield.',
    attributes: ['dex', 'int'],
    weapon: { itemClasses: ['Claw'] },
    offhand: { itemClasses: ['Shield'], tags: ['dex_int_shield'] },
    armourTags: ['dex_int_armour'],
    jewelTag: 'dexjewel',
  },
];

export const FAMILY_BY_ID = new Map(FAMILIES.map((family) => [family.id, family]));

export function getFamily(id: FamilyId): Family {
  const family = FAMILY_BY_ID.get(id);
  if (!family) throw new Error(`Unknown family "${id}"`);
  return family;
}