export type CharacterClass =
  | 'Scion'
  | 'Marauder'
  | 'Ranger'
  | 'Duelist'
  | 'Witch'
  | 'Templar'
  | 'Shadow';

export type Attribute = 'str' | 'dex' | 'int';

export type DefenceType = 'armour' | 'evasion' | 'energy-shield' | 'ward';

export type ItemSlot =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'body'
  | 'gloves'
  | 'boots'
  | 'belt'
  | 'amulet'
  | 'ring'
  | 'quiver'
  | 'jewel'
  | 'flask';

/**
 * Describes what to highlight for one equipment slot.
 *
 * `itemClasses` mirror RePoE's `item_class` values ("Wand", "Body Armour", ...).
 * `tags` are RePoE base-type tags, which is how we find whole families of bases
 * without hand-typing every name (e.g. "weapon_can_roll_minion_modifiers").
 * `bases` is the escape hatch for specific bases the tags cannot express.
 */
export interface SlotSpec {
  itemClasses: string[];
  tags?: string[];
  bases?: string[];
  defence?: DefenceType[];
  note?: string;
}

export interface Archetype {
  /** Stable slug used in share links. */
  id: string;
  name: string;
  class?: CharacterClass;
  ascendancy?: string;
  /** One line shown in the picker. */
  summary: string;
  /** Bases this build never wants, e.g. a belt implicit the build cannot use. */
  excludedBases?: string[];
  /** Bases hidden at normal and magic rarity, but kept rare (e.g. a caster ring). */
  excludedMagicBases?: string[];
  /** Whether the archetype is playable from act 1 without twink gear. */
  leveling: boolean;
  /** League the gear mapping was last checked against, e.g. "Covens". */
  verifiedFor: string;
  /** Build family, when the selection has one; drives abyss-jewel coverage. */
  familyId?: string;
  slots: Partial<Record<ItemSlot, SlotSpec>>;
  attributes: Attribute[];
  /**
   * Human-readable mods the build cares about, shown in the UI and used to
   * document why a base is highlighted. Not emitted as HasExplicitMod rules:
   * that condition needs exact internal mod names and breaks between patches.
   */
  keyMods: string[];
  skills: string[];
}