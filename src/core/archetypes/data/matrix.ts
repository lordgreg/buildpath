import type {
  Archetype,
  ItemSlot,
  SlotSpec,
} from '../types.ts';

type Slots = Partial<Record<ItemSlot, SlotSpec>>;

function armour(tags: string[]): Slots {
  return {
    helmet: { itemClasses: ['Helmet'], tags },
    body: { itemClasses: ['Body Armour'], tags },
    gloves: { itemClasses: ['Gloves'], tags },
    boots: { itemClasses: ['Boots'], tags },
  };
}

function jewellery(jewelTag: string): Slots {
  return {
    belt: { itemClasses: ['Belt'] },
    amulet: { itemClasses: ['Amulet'] },
    ring: { itemClasses: ['Ring'] },
    jewel: { itemClasses: ['Jewel'], tags: [jewelTag] },
    flask: { itemClasses: ['Life Flask', 'Utility Flask'] },
  };
}

function weapon(itemClass: string, tags?: string[]): SlotSpec {
  return { itemClasses: [itemClass], ...(tags ? { tags } : {}) };
}

function shield(tags: string[]): SlotSpec {
  return { itemClasses: ['Shield'], tags };
}

export const archetypes: readonly Archetype[] = [
  {
    id: 'necro-minions',
    name: 'Necromancer Minions',
    class: 'Witch',
    ascendancy: 'Necromancer',
    summary: 'Skeletons, zombies and spectres fight while you keep them alive.',
    excludedBases: [
      'Cloth Belt',
      'Coral Amulet',
      'Marble Amulet',
      'Blue Pearl Amulet',
    ],
    leveling: true,
    verifiedFor: 'Covens',
    slots: {
      ...armour(['int_armour', 'str_int_armour']),
      ...jewellery('intjewel'),
      weapon: weapon('Wand', ['weapon_can_roll_minion_modifiers']),
      offhand: shield(['focus_can_roll_minion_modifiers']),
    },
    attributes: ['int'],
    keyMods: [
      '+1 to Level of all Minion Skill Gems',
      'Minions deal increased Damage',
    ],
    skills: ['Summon Skeletons', 'Raise Zombie', 'Summon Spectre'],
  },
  {
    id: 'occultist-cold-dot',
    name: 'Cold DoT Occultist',
    class: 'Witch',
    ascendancy: 'Occultist',
    summary: 'Vortex and Cold Snap chill everything while you walk through it.',
    leveling: true,
    verifiedFor: 'Covens',
    excludedBases: ['Bone Ring'],
    slots: {
      ...armour(['int_armour', 'dex_int_armour']),
      ...jewellery('intjewel'),
      weapon: weapon('Wand'),
      offhand: shield(['int_armour']),
    },
    attributes: ['int'],
    keyMods: ['+1 to Level of all Cold Spell Skill Gems', 'Cold Damage over Time'],
    skills: ['Vortex', 'Cold Snap', 'Frostbolt'],
  },
  {
    id: 'inquisitor-rf',
    name: 'Righteous Fire Inquisitor',
    class: 'Templar',
    ascendancy: 'Inquisitor',
    summary: 'Burn yourself, regenerate faster, and let the fire clear the map.',
    leveling: true,
    verifiedFor: 'Covens',
    excludedBases: ['Bone Ring'],
    slots: {
      ...armour(['str_int_armour', 'str_armour']),
      ...jewellery('intjewel'),
      weapon: weapon('Sceptre'),
      offhand: shield(['str_int_shield']),
    },
    attributes: ['str', 'int'],
    keyMods: ['+1 to Level of all Fire Skill Gems', 'Fire Damage', 'Life Regeneration'],
    skills: ['Righteous Fire', 'Fire Trap', 'Flammability'],
  },
  {
    id: 'hierophant-totems',
    name: 'Totem Hierophant',
    class: 'Templar',
    ascendancy: 'Hierophant',
    summary: 'Freezing or arcane totems do the damage from a safe distance.',
    leveling: true,
    verifiedFor: 'Covens',
    excludedBases: ['Bone Ring'],
    slots: {
      ...armour(['str_int_armour', 'int_armour']),
      ...jewellery('intjewel'),
      weapon: weapon('Sceptre'),
      offhand: shield(['str_int_shield']),
    },
    attributes: ['str', 'int'],
    keyMods: ['+1 to Level of all Spell Skill Gems', 'Totem Damage'],
    skills: ['Freezing Pulse Totem', 'Arc Totem', 'Divine Ire Totem'],
  },
  {
    id: 'jugg-boneshatter',
    name: 'Boneshatter Juggernaut',
    class: 'Marauder',
    ascendancy: 'Juggernaut',
    summary: 'Two-handed mace trauma stacking with enough armour to ignore it.',
    leveling: true,
    verifiedFor: 'Covens',
    excludedBases: ['Chain Belt', 'Bone Ring'],
    excludedMagicBases: ['Paua Ring'],
    slots: {
      ...armour(['str_armour']),
      ...jewellery('strjewel'),
      weapon: weapon('Two Hand Axe'),
    },
    attributes: ['str'],
    keyMods: ['+1 to Level of all Melee Skill Gems', 'Physical Damage', 'Attack Speed'],
    skills: ['Boneshatter', 'Ancestral Cry', 'Leap Slam'],
  },
  {
    id: 'slayer-cyclone',
    name: 'Cyclone Slayer',
    class: 'Duelist',
    ascendancy: 'Slayer',
    summary: 'Spin through packs with a big two-hander and leech it all back.',
    leveling: true,
    verifiedFor: 'Covens',
    excludedBases: ['Bone Ring'],
    slots: {
      ...armour(['str_armour']),
      ...jewellery('strjewel'),
      weapon: weapon('Two Hand Sword'),
    },
    attributes: ['str', 'dex'],
    keyMods: ['+1 to Level of all Melee Skill Gems', 'Physical Damage', 'Critical Strike Chance'],
    skills: ['Cyclone', 'Vaal Cyclone', 'Pride'],
  },
  {
    id: 'champion-steel',
    name: 'Splitting Steel Champion',
    class: 'Duelist',
    ascendancy: 'Champion',
    summary: 'Impale projectiles with a one-hander and a sturdy shield.',
    leveling: true,
    verifiedFor: 'Covens',
    excludedBases: ['Bone Ring'],
    slots: {
      ...armour(['str_dex_armour', 'str_armour']),
      ...jewellery('strjewel'),
      weapon: weapon('One Hand Sword'),
      offhand: shield(['str_dex_shield']),
    },
    attributes: ['str', 'dex'],
    keyMods: ['+1 to Level of all Melee Skill Gems', 'Impale Effect', 'Projectile Damage'],
    skills: ['Splitting Steel', 'Call of Steel', 'Pride'],
  },
  {
    id: 'deadeye-lightning-arrow',
    name: 'Lightning Arrow Deadeye',
    class: 'Ranger',
    ascendancy: 'Deadeye',
    summary: 'Bow lightning arrows off-screen before anything can reach you.',
    leveling: true,
    verifiedFor: 'Covens',
    excludedBases: ['Bone Ring'],
    slots: {
      ...armour(['dex_armour']),
      ...jewellery('dexjewel'),
      weapon: weapon('Bow'),
      offhand: { itemClasses: ['Quiver'] },
    },
    attributes: ['dex'],
    keyMods: ['+1 to Level of all Bow Skill Gems', 'Added Lightning Damage', 'Attack Speed'],
    skills: ['Lightning Arrow', 'Lightning Arrow of Electrocution', 'Sniper\'s Mark'],
  },
  {
    id: 'pathfinder-toxic-rain',
    name: 'Toxic Rain Pathfinder',
    class: 'Ranger',
    ascendancy: 'Pathfinder',
    summary: 'Stack chaos damage over time with pods and never stop moving.',
    leveling: true,
    verifiedFor: 'Covens',
    excludedBases: ['Bone Ring'],
    slots: {
      ...armour(['dex_int_armour', 'dex_armour']),
      ...jewellery('dexjewel'),
      weapon: weapon('Bow'),
      offhand: { itemClasses: ['Quiver'] },
    },
    attributes: ['dex', 'int'],
    keyMods: ['+1 to Level of all Bow Skill Gems', 'Chaos Damage over Time Multiplier'],
    skills: ['Toxic Rain', 'Despair', 'Withering Step'],
  },
  {
    id: 'trickster-frost-blades',
    name: 'Frost Blades Trickster',
    class: 'Shadow',
    ascendancy: 'Trickster',
    summary: 'Cold claws, high evasion, and a shield for the hits you do take.',
    leveling: true,
    verifiedFor: 'Covens',
    excludedBases: ['Bone Ring'],
    slots: {
      ...armour(['dex_int_armour']),
      ...jewellery('dexjewel'),
      weapon: weapon('Claw'),
      offhand: shield(['dex_int_shield']),
    },
    attributes: ['dex', 'int'],
    keyMods: ['+1 to Level of all Melee Skill Gems', 'Added Cold Damage', 'Attack Speed'],
    skills: ['Frost Blades', 'Nightblade', 'Herald of Ice'],
  },
  {
    id: 'saboteur-hexblast-mines',
    name: 'Hexblast Mines Saboteur',
    class: 'Shadow',
    ascendancy: 'Saboteur',
    summary: 'Detonate chaos mines from range and let the screen disappear.',
    leveling: true,
    verifiedFor: 'Covens',
    excludedBases: ['Bone Ring'],
    slots: {
      ...armour(['dex_int_armour']),
      ...jewellery('dexjewel'),
      weapon: weapon('Wand'),
      offhand: shield(['dex_int_shield']),
    },
    attributes: ['dex', 'int'],
    keyMods: ['+1 to Level of all Chaos Spell Skill Gems', 'Mine Throwing Speed', 'Chaos Damage'],
    skills: ['Hexblast', 'Stormblast Mine', 'Despair'],
  },
  {
    id: 'ascendant-aurabot',
    name: 'Aurabot Ascendant',
    class: 'Scion',
    ascendancy: 'Ascendant',
    summary: 'Stack auras and reservations; the party does the damage.',
    leveling: false,
    verifiedFor: 'Covens',
    excludedBases: ['Bone Ring'],
    slots: {
      ...armour(['str_int_armour', 'int_armour']),
      ...jewellery('intjewel'),
      weapon: weapon('Sceptre'),
      offhand: shield(['str_int_shield']),
    },
    attributes: ['str', 'int'],
    keyMods: ['Aura Effect', 'Reduced Mana Reservation', 'Life Regeneration'],
    skills: ['Determination', 'Grace', 'Purity of Elements'],
  },
];

export function getArchetype(id: string): Archetype | undefined {
  return archetypes.find((archetype) => archetype.id === id);
}