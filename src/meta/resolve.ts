import type {
  Archetype,
  Attribute,
  ItemSlot,
  SlotSpec,
} from '../core/archetypes/types.ts';
import { getAscendancy } from './ascendancies.ts';
import { getFamily } from './families.ts';
import {
  CURRENT_LEAGUE_ID,
  getSkill,
  getSnapshot,
  isValidSelection,
} from './index.ts';
import type { Ascendancy, BuildSelection, Family } from './types.ts';

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

function loadout(
  weapon: SlotSpec,
  offhand: SlotSpec | null,
): Partial<Record<ItemSlot, SlotSpec>> {
  const slots: Partial<Record<ItemSlot, SlotSpec>> = { weapon };
  if (offhand) slots.offhand = offhand;
  return slots;
}

function loadoutLabel(weapon: SlotSpec, offhand: SlotSpec | null): string {
  const weaponName = weapon.itemClasses.join(' / ');
  return offhand
    ? `${weaponName} and ${offhand.itemClasses.join(' / ')}`
    : `${weaponName} (no offhand)`;
}

function verifiedFor(): string {
  return getSnapshot(CURRENT_LEAGUE_ID).league.name;
}

export function resolveFamily(familyId: string): Archetype {
  const family = getFamily(familyId as Family['id']);
  return {
    id: `family-${family.id}`,
    name: family.name,
    summary: family.summary,
    leveling: true,
    verifiedFor: verifiedFor(),
    slots: {
      ...armourSlots(family.armourTags),
      ...jewellery(family.jewelTag),
      ...loadout(family.weapon, family.offhand),
    },
    attributes: family.attributes as Attribute[],
    keyMods: [],
    skills: [],
  };
}

export function resolveAscendancy(ascendancyId: string): Archetype {
  const ascendancy = getAscendancy(ascendancyId);
  const family = getFamily(ascendancy.defaultFamily);
  const offhand =
    ascendancy.offhand !== undefined
      ? ascendancy.offhand
      : family.offhand?.itemClasses.includes('Shield')
        ? { ...family.offhand, tags: ascendancy.shieldTags }
        : family.offhand;
  const weapon = ascendancy.weapon ?? family.weapon;

  return {
    id: ascendancy.id,
    name: ascendancy.name,
    class: ascendancy.class,
    ascendancy: ascendancy.name,
    summary: `Default ${family.name.toLowerCase()} loadout: ${loadoutLabel(weapon, offhand)}.`,
    leveling: true,
    verifiedFor: verifiedFor(),
    slots: {
      ...armourSlots(ascendancy.defenceTags),
      ...jewellery(ascendancy.jewelTag),
      ...loadout(weapon, offhand),
    },
    attributes: ascendancy.attributes,
    keyMods: [],
    skills: [],
  };
}

export function resolveMeta(selection: BuildSelection): Archetype {
  const leagueId = selection.leagueId ?? CURRENT_LEAGUE_ID;
  const skill = getSkill(leagueId, selection.skillId ?? '');
  if (!skill) throw new Error(`Unknown skill "${selection.skillId}"`);
  const family = getFamily(skill.family);
  const ascendancy: Ascendancy = getAscendancy(selection.ascendancyId ?? '');

  const offhand =
    skill.offhand === null
      ? null
      : skill.offhand !== undefined
        ? skill.offhand
        : family.offhand;
  const weapon = skill.weapon ?? family.weapon;

  return {
    id: `${ascendancy.id}-${skill.id}`,
    name: `${ascendancy.name} ${skill.name}`,
    class: ascendancy.class,
    ascendancy: ascendancy.name,
    summary: `${family.name} profile for ${skill.name}: ${loadoutLabel(weapon, offhand)}.`,
    leveling: skill.leveling,
    verifiedFor: getSnapshot(leagueId).league.name,
    slots: {
      ...armourSlots(ascendancy.defenceTags),
      ...jewellery(ascendancy.jewelTag),
      ...loadout(weapon, offhand),
    },
    attributes: ascendancy.attributes,
    keyMods: [],
    skills: [skill.name],
  };
}

export function resolveBuild(selection: BuildSelection): Archetype {
  if (!isValidSelection(selection)) {
    throw new Error(
      `Invalid selection: ${selection.mode}/${selection.familyId ?? selection.ascendancyId ?? selection.skillId}`,
    );
  }

  switch (selection.mode) {
    case 'family':
      return resolveFamily(selection.familyId!);
    case 'ascendancy':
      return resolveAscendancy(selection.ascendancyId!);
    case 'meta':
      return resolveMeta(selection);
  }
}