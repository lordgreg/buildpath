import type { Archetype, ItemSlot, SlotSpec } from '../../archetypes/types.ts';
import { resolveSlotBases } from '../../data/resolve.ts';
import { toFilterClass } from '../classes.ts';
import type { Preset } from '../presets.ts';
import { SLOT_STYLES, type Rule, type Style, type StyleKind } from '../types.ts';

const WEAPON_SLOTS = new Set<ItemSlot>(['weapon', 'offhand']);
const ARMOUR_SLOTS = new Set<ItemSlot>(['helmet', 'body', 'gloves', 'boots']);
const ACCESSORY_SLOTS = new Set<ItemSlot>([
  'belt',
  'amulet',
  'ring',
  'jewel',
  'flask',
]);
const SOCKET_SLOTS = new Set<ItemSlot>([
  'weapon',
  'offhand',
  'helmet',
  'body',
  'gloves',
  'boots',
]);

/** Accessories and jewels stay worth identifying below the gear cutoff. */
const ACCESSORY_ITEM_LEVEL = 68;

export function slotStyle(slot: ItemSlot): Style {
  if (WEAPON_SLOTS.has(slot)) return SLOT_STYLES.weapon;
  if (ARMOUR_SLOTS.has(slot)) return SLOT_STYLES.armour;
  return SLOT_STYLES.accessory;
}

function categoryFor(slot: ItemSlot): StyleKind | undefined {
  if (slot === 'jewel') return 'jewel';
  if (slot === 'flask') return 'flask';
  return undefined;
}

function quiet(style: Style): Style {
  return {
    textColor: style.textColor,
    borderColor: style.borderColor,
    fontSize: 34,
  };
}

export function filterClassesFor(spec: SlotSpec): string[] {
  return spec.itemClasses.map(toFilterClass);
}

/** Base types when the spec is narrow enough; otherwise an empty list. */
export function baseTypesFor(spec: SlotSpec): string[] {
  if (spec.bases?.length) return [...new Set(spec.bases)].sort();
  if (spec.tags?.length) {
    return [...new Set(resolveSlotBases(spec).map((base) => base.name))].sort();
  }
  return [];
}

export function usedFilterClasses(archetype: Archetype): Set<string> {
  const classes = new Set<string>();
  for (const spec of Object.values(archetype.slots)) {
    if (!spec) continue;
    for (const className of filterClassesFor(spec)) classes.add(className);
  }
  return classes;
}

export function gearRules(archetype: Archetype, preset: Preset): Rule[] {
  const rules: Rule[] = [];

  const excludedBases = new Set([
    ...(preset.gear.hiddenBases ?? []),
    ...(archetype.excludedBases ?? []),
  ]);
  for (const base of excludedBases) {
    for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
      rules.push({
        action: 'Hide',
        comment: `${base} (${rarity.toLowerCase()}) - excluded base`,
        baseTypes: [base],
        rarity,
      });
    }
  }

  for (const [slot, spec] of Object.entries(archetype.slots) as [
    ItemSlot,
    SlotSpec,
  ][]) {
    const bases = baseTypesFor(spec);
    const classNames = bases.length > 0 ? undefined : filterClassesFor(spec);
    const target = bases.length > 0 ? { baseTypes: bases } : { classNames };
    const rareMinItemLevel = ACCESSORY_SLOTS.has(slot)
      ? Math.min(preset.gear.rareMinItemLevel, ACCESSORY_ITEM_LEVEL)
      : preset.gear.rareMinItemLevel;

    rules.push({
      action: 'Show',
      comment: `${slot} - rare`,
      ...target,
      rarity: 'Rare',
      itemLevel: { min: rareMinItemLevel },
      ...(categoryFor(slot) ? { styleKind: categoryFor(slot) } : {}),
      style: slotStyle(slot),
    });

    if (preset.gear.magicMinItemLevel !== null) {
      rules.push({
        action: 'Show',
        comment: `${slot} - magic`,
        ...target,
        rarity: 'Magic',
        itemLevel: { min: preset.gear.magicMinItemLevel },
        ...(categoryFor(slot) ? { styleKind: categoryFor(slot) } : {}),
        style: quiet(slotStyle(slot)),
      });
    }

    if (preset.gear.highlightLinks && SOCKET_SLOTS.has(slot)) {
      rules.push({
        action: 'Show',
        comment: `4+ links (${slot})`,
        ...target,
        rarity: 'Normal',
        linkedSockets: { min: 4 },
        style: SLOT_STYLES.link,
      });
    }
  }

  for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
    rules.push({
      action: 'Show',
      comment: `Six sockets - ${rarity.toLowerCase()}`,
      rarity,
      sockets: { min: 6 },
      style: SLOT_STYLES.link,
    });
  }

  return rules;
}