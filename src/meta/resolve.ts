import type {
  Archetype,
  ItemSlot,
  SlotSpec,
} from '../core/archetypes/types.ts';
import { getAscendancy } from './ascendancies.ts';
import { getFamily } from './families.ts';
import {
  getSkill,
  getSnapshot,
  isValidSelection,
} from './index.ts';
import type { BuildSelection } from './types.ts';

function armourSlots(tags: string[]): Partial<Record<ItemSlot, SlotSpec>> {
  return {
    helmet: { itemClasses: ['Helmet'], tags },
    body: { itemClasses: ['Body Armour'], tags },
    gloves: { itemClasses: ['Gloves'], tags },
    boots: { itemClasses: ['Boots'], tags },
  };
}

function jewellery(jewelTag: string): Partial<Record<ItemSlot, SlotSpec>> {
  return {
    belt: { itemClasses: ['Belt'] },
    amulet: { itemClasses: ['Amulet'] },
    ring: { itemClasses: ['Ring'] },
    jewel: { itemClasses: ['Jewel'], tags: [jewelTag] },
    flask: { itemClasses: ['Life Flask', 'Utility Flask'] },
  };
}

export function resolveBuild(selection: BuildSelection): Archetype {
  if (!isValidSelection(selection)) {
    throw new Error(
      `Invalid selection: ${selection.leagueId}/${selection.familyId}/${selection.skillId}/${selection.ascendancyId}`,
    );
  }

  const snapshot = getSnapshot(selection.leagueId);
  const skill = getSkill(selection.leagueId, selection.skillId)!;
  const family = getFamily(selection.familyId);
  const ascendancy = getAscendancy(selection.ascendancyId);

  const slots: Partial<Record<ItemSlot, SlotSpec>> = {
    ...armourSlots(ascendancy.defenceTags),
    ...jewellery(ascendancy.jewelTag),
    weapon: skill.weapon ?? family.weapon,
  };

  const offhand =
    skill.offhand === null
      ? null
      : skill.offhand !== undefined
        ? skill.offhand
        : family.offhand;
  if (offhand) slots.offhand = offhand;

  const weaponName = (skill.weapon ?? family.weapon).itemClasses.join(' / ');
  const offhandName = offhand ? offhand.itemClasses.join(' / ') : null;

  return {
    id: `${ascendancy.id}-${skill.id}`,
    name: `${ascendancy.name} ${skill.name}`,
    class: ascendancy.class,
    ascendancy: ascendancy.name,
    summary: `${family.name} profile for ${skill.name}: ${weaponName}${
      offhandName ? ` and ${offhandName}` : ' (no offhand)'
    }.`,
    leveling: skill.leveling,
    verifiedFor: snapshot.league.name,
    slots,
    attributes: ascendancy.attributes,
    keyMods: [],
    skills: [skill.name],
  };
}