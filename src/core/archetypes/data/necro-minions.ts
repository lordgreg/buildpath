import type { Archetype } from '../types.ts';

/**
 * M0 sample. Kept deliberately small to prove the shape and the validator;
 * M1 fills the remaining eleven archetypes.
 */
export const necroMinions: Archetype = {
  id: 'necro-minions',
  name: 'Necromancer Minions',
  class: 'Witch',
  ascendancy: 'Necromancer',
  summary: 'Skeletons, zombies and spectres fight while you keep them alive.',
  leveling: true,
  verifiedFor: 'Covens',
  slots: {
    weapon: {
      itemClasses: ['Wand'],
      tags: ['weapon_can_roll_minion_modifiers'],
      note: 'Minion wands such as Convoking Wand.',
    },
    offhand: {
      itemClasses: ['Shield'],
      tags: ['focus_can_roll_minion_modifiers'],
      note: 'Minion spirit shields.',
    },
    helmet: {
      itemClasses: ['Helmet'],
      tags: ['int_armour'],
      defence: ['armour', 'energy-shield'],
    },
    body: {
      itemClasses: ['Body Armour'],
      tags: ['int_armour'],
      defence: ['armour', 'energy-shield'],
    },
    gloves: {
      itemClasses: ['Gloves'],
      tags: ['int_armour'],
      defence: ['armour', 'energy-shield'],
    },
    boots: {
      itemClasses: ['Boots'],
      tags: ['int_armour'],
      defence: ['armour', 'energy-shield'],
    },
    belt: { itemClasses: ['Belt'] },
    amulet: { itemClasses: ['Amulet'] },
    ring: { itemClasses: ['Ring'] },
    flask: { itemClasses: ['Life Flask', 'Utility Flask'] },
  },
  attributes: ['int'],
  keyMods: ['+1 to Level of all Minion Skill Gems', 'Minions deal increased Damage'],
  skills: ['Summon Skeletons', 'Raise Zombie', 'Summon Spectre'],
};