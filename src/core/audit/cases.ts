import economy from '../../generated/economy.json';
import type { Phase, Preset, Strictness } from '../filter/presets.ts';
import type { PreviewItem } from '../preview/match.ts';

/**
 * Categories the audit must cover. A test asserts every category has at least
 * one case, so a new kind of drop cannot be added without a fixture.
 */
export type AuditCategory =
  | 'currency'
  | 'fragment'
  | 'divination'
  | 'map'
  | 'gem'
  | 'unique'
  | 'flask'
  | 'jewel'
  | 'gear-normal'
  | 'gear-magic'
  | 'gear-rare'
  | 'quest'
  | 'veiled'
  | 'league'
  | 'leak';

export interface ExpectContext {
  phase: Phase;
  strictness: Strictness;
  preset: Preset;
}

/**
 * A labelled drop the audit runs through the matcher. `expect` records the
 * expected visibility for selection-independent categories (currency, maps,
 * uniques, gems, quest). Gear expectations depend on the build and live in the
 * preset coverage audit instead, so those cases are observations only.
 */
export interface AuditCase {
  id: string;
  label: string;
  category: AuditCategory;
  item: PreviewItem;
  /** Short note shown next to the label in the report. */
  note?: string;
  expect?: (ctx: ExpectContext) => boolean | undefined;
}

const currencyTier = economy.tiers.currency as Record<string, number>;
const fragmentTier = economy.tiers.fragment as Record<string, number>;
const divinationTier = economy.tiers.divination as Record<string, number>;
const uniqueBaseTier = economy.tiers.uniqueBase as Record<string, number>;

function item(
  id: string,
  itemClass: string,
  baseType: string,
  rarity: PreviewItem['rarity'],
  extra: Partial<PreviewItem> = {},
): PreviewItem {
  return { id, name: baseType, itemClass, baseType, rarity, itemLevel: 86, ...extra };
}

function currency(id: string, label: string, name: string): AuditCase {
  return {
    id,
    label,
    category: 'currency',
    note: `tier ${currencyTier[name] ?? '?'}`,
    item: item(id, 'Stackable Currency', name, 'Currency', {
      itemLevel: 1,
      stackSize: 1,
    }),
    // Tier 1 always shows; tier 3 hides at Strict/Uber.
    expect: ({ preset }) =>
      (currencyTier[name] ?? 1) <= preset.currency.maxVisibleTier,
  };
}

/**
 * Gems show when no gate is set, or when they clear the quality or item level
 * gate; the preset treats the two gates as an OR.
 */
function gemShown(preset: Preset, quality: number, itemLevel: number): boolean {
  const { minQuality, minItemLevel } = preset.gems;
  if (minQuality === null && minItemLevel === null) return true;
  return (
    (minQuality !== null && quality >= minQuality) ||
    (minItemLevel !== null && itemLevel >= minItemLevel)
  );
}

/** Gold is auto-collected; only piles at or above the preset threshold show. */
function gold(stackSize: number): AuditCase {
  const id = `gold-${stackSize}`;
  return {
    id,
    label: `Gold x${stackSize}`,
    category: 'currency',
    note: `stack ${stackSize}`,
    item: item(id, 'Stackable Currency', 'Gold', 'Currency', {
      itemLevel: 1,
      stackSize,
    }),
    expect: ({ preset }) => stackSize >= preset.currency.goldMinStack,
  };
}

export const AUDIT_CASES: AuditCase[] = [
  // Currency: an orb per tier, plus the vendor scrolls.
  currency('currency-mirror', 'Mirror of Kalandra', 'Mirror of Kalandra'),
  currency('currency-divine', 'Divine Orb', 'Divine Orb'),
  currency('currency-exalted', 'Exalted Orb', 'Exalted Orb'),
  currency('currency-chaos', 'Chaos Orb', 'Chaos Orb'),
  currency('currency-regal', 'Regal Orb', 'Regal Orb'),
  currency('currency-fusing', 'Orb of Fusing', 'Orb of Fusing'),
  currency('currency-transmute', 'Orb of Transmutation', 'Orb of Transmutation'),
  currency('currency-wisdom', 'Scroll of Wisdom', 'Scroll of Wisdom'),
  currency('currency-portal', 'Portal Scroll', 'Portal Scroll'),

  // Gold: piles below the preset threshold are hidden at every phase.
  gold(1),
  gold(10),
  gold(100),

  // Fragments: tier 3 hides at the strictest cutoffs.
  {
    id: 'fragment-tier-3',
    label: 'Fragment of the Phoenix',
    category: 'fragment',
    note: `tier ${fragmentTier['Fragment of the Phoenix'] ?? '?'}`,
    item: item(
      'fragment-tier-3',
      'Map Fragments',
      'Fragment of the Phoenix',
      'Normal',
      { itemLevel: 1 },
    ),
    expect: ({ preset }) =>
      (fragmentTier['Fragment of the Phoenix'] ?? 1) <=
      preset.maps.fragmentMaxTier,
  },
  {
    id: 'fragment-tier-2',
    label: 'Timeless Vaal Emblem',
    category: 'fragment',
    note: `tier ${fragmentTier['Timeless Vaal Emblem'] ?? '?'}`,
    item: item('fragment-tier-2', 'Map Fragments', 'Timeless Vaal Emblem', 'Normal', {
      itemLevel: 1,
    }),
    expect: ({ preset }) =>
      (fragmentTier['Timeless Vaal Emblem'] ?? 1) <= preset.maps.fragmentMaxTier,
  },

  // Divination cards: top tier always shows, low tiers hide as strictness rises.
  {
    id: 'divination-top',
    label: 'The Apothecary',
    category: 'divination',
    note: `tier ${divinationTier['The Apothecary'] ?? '?'}`,
    item: item('divination-top', 'Divination Cards', 'The Apothecary', 'Divination Card', {
      itemLevel: 1,
    }),
    expect: ({ preset }) =>
      (divinationTier['The Apothecary'] ?? 1) <=
      preset.currency.divinationMaxTier,
  },
  {
    id: 'divination-low',
    label: 'Rain of Chaos',
    category: 'divination',
    note: `tier ${divinationTier['Rain of Chaos'] ?? '?'}`,
    item: item('divination-low', 'Divination Cards', 'Rain of Chaos', 'Divination Card', {
      itemLevel: 1,
    }),
    expect: ({ preset }) =>
      (divinationTier['Rain of Chaos'] ?? 1) <=
      preset.currency.divinationMaxTier,
  },

  // Maps: endgame hides below the tier cutoff; leveling shows every map.
  {
    id: 'map-high',
    label: 'Strand Map',
    category: 'map',
    note: 'tier 16',
    item: item('map-high', 'Maps', 'Strand Map', 'Normal', {
      itemLevel: 83,
      mapTier: 16,
    }),
    expect: ({ phase, preset }) =>
      phase === 'leveling' || preset.maps.minTier === null || 16 >= preset.maps.minTier,
  },
  {
    id: 'map-mid',
    label: 'Beach Map',
    category: 'map',
    note: 'tier 5',
    item: item('map-mid', 'Maps', 'Beach Map', 'Normal', {
      itemLevel: 68,
      mapTier: 5,
    }),
    expect: ({ phase, preset }) =>
      phase === 'leveling' || preset.maps.minTier === null || 5 >= preset.maps.minTier,
  },

  // Gems: a gem shows when no gate is set, or when it clears the quality or
  // item level gate (the two are an OR).
  {
    id: 'gem-quality',
    label: 'Fireball (20 quality)',
    category: 'gem',
    note: 'quality 20',
    item: item('gem-quality', 'Skill Gems', 'Fireball', 'Gem', {
      itemLevel: 1,
      quality: 20,
    }),
    expect: ({ preset }) => gemShown(preset, 20, 1),
  },
  {
    id: 'gem-plain',
    label: 'Fireball (0 quality)',
    category: 'gem',
    note: 'quality 0',
    item: item('gem-plain', 'Skill Gems', 'Fireball', 'Gem', {
      itemLevel: 1,
      quality: 0,
    }),
    expect: ({ preset }) => gemShown(preset, 0, 1),
  },
  {
    id: 'gem-level',
    label: 'Fireball (item level 20)',
    category: 'gem',
    note: 'quality 0, ilvl 20',
    item: item('gem-level', 'Skill Gems', 'Fireball', 'Gem', {
      itemLevel: 20,
      quality: 0,
    }),
    expect: ({ preset }) => gemShown(preset, 0, 20),
  },

  // Uniques: cheap bases are hidden at Uber, valuable bases always show.
  {
    id: 'unique-high',
    label: 'Leather Belt (unique)',
    category: 'unique',
    note: 'tier 1 base',
    item: item('unique-high', 'Belts', 'Leather Belt', 'Unique', {
      itemLevel: 70,
      identified: false,
    }),
    expect: ({ preset }) =>
      (uniqueBaseTier['Leather Belt'] ?? 1) <= preset.uniques.maxVisibleTier,
  },
  {
    id: 'unique-low-base',
    label: 'Hubris Circlet (unique)',
    category: 'unique',
    note: `tier ${uniqueBaseTier['Hubris Circlet'] ?? '?'} base`,
    item: item('unique-low-base', 'Helmets', 'Hubris Circlet', 'Unique', {
      itemLevel: 70,
      identified: false,
    }),
    expect: ({ preset }) =>
      (uniqueBaseTier['Hubris Circlet'] ?? 1) <= preset.uniques.maxVisibleTier,
  },
  {
    id: 'unique-jewel',
    label: 'Prismatic Jewel (unique)',
    category: 'unique',
    note: 'tier 1 base',
    item: item('unique-jewel', 'Jewels', 'Prismatic Jewel', 'Unique', {
      itemLevel: 80,
      identified: true,
    }),
  },

  // Flasks: endgame consumable shows; a plain white flask never does.
  {
    id: 'flask-magic',
    label: 'Diamond Flask (magic)',
    category: 'flask',
    note: 'quality 20',
    item: item('flask-magic', 'Utility Flasks', 'Diamond Flask', 'Magic', {
      itemLevel: 86,
      quality: 20,
      identified: false,
    }),
    expect: ({ preset }) =>
      preset.gear.magicMinItemLevel === null ||
      86 >= preset.gear.magicMinItemLevel,
  },
  {
    id: 'flask-normal',
    label: 'Divine Life Flask (normal)',
    category: 'flask',
    note: 'white flask',
    item: item('flask-normal', 'Life Flasks', 'Divine Life Flask', 'Normal', {
      itemLevel: 60,
    }),
    expect: () => false,
  },

  // Jewels and gear: base-per-build, so observations only.
  {
    id: 'jewel-rare',
    label: 'Cobalt Jewel (rare)',
    category: 'jewel',
    item: item('jewel-rare', 'Jewels', 'Cobalt Jewel', 'Rare', {
      itemLevel: 86,
      identified: true,
    }),
  },
  {
    id: 'gear-weapon-minion',
    label: 'Convoking Wand (rare)',
    category: 'gear-rare',
    item: item('gear-weapon-minion', 'Wands', 'Convoking Wand', 'Rare', {
      itemLevel: 86,
      identified: true,
    }),
  },
  {
    id: 'gear-helm-int',
    label: 'Hubris Circlet (rare)',
    category: 'gear-rare',
    item: item('gear-helm-int', 'Helmets', 'Hubris Circlet', 'Rare', {
      itemLevel: 86,
      identified: true,
    }),
  },
  {
    id: 'gear-boots-rare',
    label: 'Two-Toned Boots (rare)',
    category: 'gear-rare',
    item: item('gear-boots-rare', 'Boots', 'Two-Toned Boots', 'Rare', {
      itemLevel: 86,
      identified: true,
    }),
  },
  {
    id: 'gear-amulet-rare',
    label: 'Onyx Amulet (rare)',
    category: 'gear-rare',
    item: item('gear-amulet-rare', 'Amulets', 'Onyx Amulet', 'Rare', {
      itemLevel: 86,
      identified: true,
    }),
  },
  {
    id: 'gear-ring-magic',
    label: 'Iron Ring (magic)',
    category: 'gear-magic',
    item: item('gear-ring-magic', 'Rings', 'Iron Ring', 'Magic', {
      itemLevel: 20,
      identified: false,
    }),
  },
  {
    id: 'gear-helm-normal',
    label: 'Iron Hat (normal)',
    category: 'gear-normal',
    item: item('gear-helm-normal', 'Helmets', 'Iron Hat', 'Normal', {
      itemLevel: 8,
      sockets: 2,
      linkedSockets: 1,
    }),
  },
  {
    id: 'gear-6link',
    label: 'Vaal Regalia (6-socket)',
    category: 'gear-normal',
    note: 'always shown',
    item: item('gear-6link', 'Body Armours', 'Vaal Regalia', 'Normal', {
      itemLevel: 70,
      sockets: 6,
      linkedSockets: 1,
    }),
    expect: () => true,
  },
  {
    id: 'gear-4link',
    label: 'Silken Vest (4-link)',
    category: 'gear-normal',
    item: item('gear-4link', 'Body Armours', 'Silken Vest', 'Normal', {
      itemLevel: 20,
      sockets: 4,
      linkedSockets: 4,
    }),
  },

  // Always-on classes.
  {
    id: 'quest-item',
    label: 'Decanter Spiritus (quest)',
    category: 'quest',
    item: item('quest-item', 'Quest Items', 'Decanter Spiritus', 'Quest', {
      itemLevel: 1,
    }),
    expect: () => true,
  },
  {
    id: 'quest-treasure-key',
    label: 'Treasure Key (labyrinth)',
    category: 'quest',
    note: 'always shown',
    item: item(
      'quest-treasure-key',
      'Labyrinth Items',
      'Treasure Key',
      'Currency',
      { itemLevel: 1 },
    ),
    expect: () => true,
  },
  {
    id: 'veiled-bow',
    label: 'Wrath Barrage (veiled)',
    category: 'veiled',
    note: 'always shown',
    item: item('veiled-bow', 'Bows', 'Ranger Bow', 'Rare', {
      name: 'Wrath Barrage',
      itemLevel: 63,
      explicitMods: ['Veiled'],
    }),
    expect: () => true,
  },
  {
    id: 'cluster-jewel',
    label: 'Large Cluster Jewel',
    category: 'jewel',
    note: 'every build, every rarity',
    item: item('cluster-jewel', 'Jewels', 'Large Cluster Jewel', 'Magic', {
      itemLevel: 75,
    }),
    expect: () => true,
  },
  {
    id: 'league-viscera',
    label: "Lesser Justicar's Helm",
    category: 'league',
    item: item('league-viscera', 'Viscera', "Lesser Justicar's Helm", 'Normal', {
      itemLevel: 41,
    }),
    expect: () => true,
  },

  // The four reported leaks, kept as permanent regression cases.
  {
    id: 'leak-normal-gloves',
    label: 'Superior Rawhide Gloves',
    category: 'leak',
    item: item('leak-normal-gloves', 'Gloves', 'Rawhide Gloves', 'Normal', {
      itemLevel: 14,
      quality: 17,
      sockets: 3,
      linkedSockets: 3,
    }),
  },
  {
    id: 'leak-magic-axe',
    label: 'Boarding Axe (magic)',
    category: 'leak',
    item: item('leak-magic-axe', 'One Hand Axes', 'Boarding Axe', 'Magic', {
      itemLevel: 15,
      sockets: 2,
      linkedSockets: 1,
      identified: false,
    }),
  },
  {
    id: 'leak-magic-vest',
    label: 'Oiled Vest (magic)',
    category: 'leak',
    item: item('leak-magic-vest', 'Body Armours', 'Oiled Vest', 'Magic', {
      itemLevel: 16,
      sockets: 2,
      linkedSockets: 2,
      identified: false,
    }),
  },
  {
    id: 'leak-magic-mitts',
    label: 'Wrapped Mitts (magic)',
    category: 'leak',
    item: item('leak-magic-mitts', 'Gloves', 'Wrapped Mitts', 'Magic', {
      itemLevel: 15,
      sockets: 1,
      linkedSockets: 1,
      identified: false,
    }),
  },
];

export const AUDIT_CATEGORIES: AuditCategory[] = [
  'currency',
  'fragment',
  'divination',
  'map',
  'gem',
  'unique',
  'flask',
  'jewel',
  'gear-normal',
  'gear-magic',
  'gear-rare',
  'quest',
  'league',
  'leak',
];
