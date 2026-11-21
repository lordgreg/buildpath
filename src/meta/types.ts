import type {
  Attribute,
  CharacterClass,
  SlotSpec,
} from '../core/archetypes/types.ts';

export type FamilyId = 'caster' | 'minion' | 'bow' | 'melee' | 'hybrid';

export interface Family {
  id: FamilyId;
  name: string;
  summary: string;
  attributes: Attribute[];
  weapon: SlotSpec;
  offhand: SlotSpec | null;
  armourTags: string[];
  jewelTag: string;
}

export interface SkillEntry {
  id: string;
  name: string;
  family: FamilyId;
  /** Classes that can realistically play this skill. */
  classes: CharacterClass[];
  /** Preferred ascendancies, in display order. Must belong to `classes`. */
  topAscendancies?: string[];
  /** Approximate share of the skill's builds, from the snapshot. */
  ascendancyShares?: Record<string, number>;
  /** Approximate share of the league's builds, for ordering. */
  playShare?: number;
  leveling: boolean;
  /** Skill-level overrides; the family supplies the defaults. */
  weapon?: SlotSpec;
  offhand?: SlotSpec | null;
  note?: string;
}

export interface LeagueSnapshot {
  schemaVersion: 1;
  league: { id: string; name: string };
  capturedAt: string;
  source: string;
  skills: SkillEntry[];
}

export interface Ascendancy {
  id: string;
  name: string;
  class: CharacterClass;
  defaultFamily: FamilyId;
  attributes: Attribute[];
  /** RePoE tags used for the four armour slots. */
  defenceTags: string[];
  /** RePoE tags intersected with the Shield class. */
  shieldTags: string[];
  jewelTag: string;
  /** Optional loadout override; otherwise the default family supplies it. */
  weapon?: SlotSpec;
  offhand?: SlotSpec | null;
}

export type BuildMode = 'family' | 'ascendancy' | 'meta' | 'scratch';

export interface BuildSelection {
  mode: BuildMode;
  familyId?: FamilyId;
  ascendancyId?: string;
  leagueId?: string;
  skillId?: string;
  /** From-scratch base: hide everything or show everything. */
  scratchStart?: 'hide' | 'show';
}