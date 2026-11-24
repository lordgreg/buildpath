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

/** Cluster jewels are never part of a slot spec; they are always worth a look. */
const CLUSTER_JEWELS = [
  'Large Cluster Jewel',
  'Medium Cluster Jewel',
  'Small Cluster Jewel',
];

/**
 * Abyss jewels roll one affix pool per damage style. The build's family picks
 * the eye that fits; a family without a match keeps the generic jewel behaviour.
 */
const ABYSS_JEWELS: Record<string, string> = {
  caster: 'Hypnotic Eye Jewel',
  minion: 'Ghastly Eye Jewel',
  melee: 'Murderous Eye Jewel',
  bow: 'Searching Eye Jewel',
  hybrid: 'Searching Eye Jewel',
};

/** Quiet jewel styling: visible and labelled, without an alert. */
const JEWEL_COVERAGE_STYLE: Style = {
  textColor: SLOT_STYLES.accessory.textColor,
  borderColor: SLOT_STYLES.accessory.borderColor,
  fontSize: 38,
  minimapIcon: { size: 1, color: 'Green', shape: 'Hexagon' },
};

/** Jewels every build should see, whatever its slot targeting. */
export function jewelCoverageRules(archetype: Archetype): Rule[] {
  const rules: Rule[] = [
    {
      action: 'Show',
      comment: 'Cluster jewels',
      baseTypes: CLUSTER_JEWELS,
      styleKind: 'jewel',
      style: JEWEL_COVERAGE_STYLE,
    },
  ];

  const abyss = archetype.familyId ? ABYSS_JEWELS[archetype.familyId] : undefined;
  if (abyss) {
    rules.push({
      action: 'Show',
      comment: `Abyss jewels - ${archetype.familyId}`,
      baseTypes: [abyss],
      styleKind: 'jewel',
      style: JEWEL_COVERAGE_STYLE,
    });
  }

  return rules;
}

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
  const rules: Rule[] = [...jewelCoverageRules(archetype)];

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
      // Links matter more than the item level floor, so every rarity the build
      // can craft on keeps its highlight; uniques are handled separately.
      for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
        rules.push({
          action: 'Show',
          comment: `${slot} - ${rarity.toLowerCase()} 4+ links`,
          ...target,
          rarity,
          linkedSockets: { min: 4 },
          style: SLOT_STYLES.link,
        });
      }
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

  // White base floors run after the 6-socket rules so a six-socket still wins
  // the link highlight, and skip flasks: a normal flask is never a crafting
  // base, so the junk rules hide it.
  if (preset.gear.normalMinItemLevel !== null) {
    for (const [slot, spec] of Object.entries(archetype.slots) as [
      ItemSlot,
      SlotSpec,
    ][]) {
      if (slot === 'flask') continue;
      const bases = baseTypesFor(spec);
      const classNames = bases.length > 0 ? undefined : filterClassesFor(spec);
      const target = bases.length > 0 ? { baseTypes: bases } : { classNames };
      rules.push({
        action: 'Show',
        comment: `${slot} - normal`,
        ...target,
        rarity: 'Normal',
        itemLevel: { min: preset.gear.normalMinItemLevel },
        ...(categoryFor(slot) ? { styleKind: categoryFor(slot) } : {}),
        style: quiet(slotStyle(slot)),
      });
    }
  }

  return rules;
}