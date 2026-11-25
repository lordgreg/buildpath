import type { CharacterClass } from '../archetypes/types.ts';
import type { FamilyId } from '../../meta/types.ts';

/** What a build seed compiles to on the site. */
export type BuildStatus = 'draft' | 'verified' | 'rejected';

/**
 * The list entry `builds.html` and the builder read. Everything here is small:
 * the detailed build lives in its own JSON file (see `Build`).
 */
export interface BuildIndexEntry {
  id: string;
  name: string;
  class: CharacterClass;
  ascendancyId: string;
  family: FamilyId;
  mainSkill: string;
  summary: string;
  status: BuildStatus;
  /** Hash of the seed it was compiled from; changes when the seed changes. */
  seedHash: string;
}

export interface LevelingBracket {
  /** Level bracket upper bound; the last bracket ends at 100. */
  until: number;
  skills: string[];
}

export interface AscendancyPoint {
  node: string;
  /** Labyrinth that grants it, 1-4. */
  lab: number;
}

export interface UniqueRef {
  /** Shown to the reader; may be a unique item name. */
  displayName: string;
  slot: string;
  /** The base the filter highlights. A unique name is never a valid BaseType. */
  baseType: string;
  ssfSource?: string;
}

export type BuildBandit = 'kill-all' | 'oak' | 'kraityn' | 'alira';

/** What the PoB oracle measured at one checkpoint. */
export interface CheckpointMetrics {
  dps: number;
  dpsSource: 'player' | 'minion';
  life: number;
  energyShield: number;
  ehp: number;
  physicalMaxHit: number;
  fireResist: number;
  coldResist: number;
  lightningResist: number;
  chaosResist: number;
  nodes: number;
  ascendancy: number;
}

/**
 * A hand-curated build seed, compiled to JSON. The pipeline proves it against
 * Path of Building and either publishes it or rejects it; it never invents one.
 */
/** What the PoB oracle measured at one checkpoint, as published. */
export interface GateResult {
  pass: boolean;
  level: number;
  budget: string;
  metrics: Omit<CheckpointMetrics, 'physicalMaxHit' | 'fireResist' | 'coldResist' | 'lightningResist'> & {
    maxHit: number;
    minionCount?: number;
    resists: number[];
  };
  tree?: TreeView;
  failures: string[];
}

export interface BuildPipelineInfo {
  pobRef: string;
  treeVersion: string;
  calibrated: boolean;
  checkedAt: string;
}

export interface SkillGroup {
  slot: string;
  gems: string[];
}

export interface FlaskChoice {
  slot: 'life' | 'utility';
  name: string;
  note?: string;
}

export interface TreePoint {
  id: number;
  x: number;
  y: number;
  notable: boolean;
  name: string;
}

export interface TreeView {
  nodes: TreePoint[];
  edges: [number, number][];
  notables: string[];
}

export interface Build extends BuildIndexEntry {
  schemaVersion: 1;
  skillGroups: SkillGroup[];
  minionCount?: number;
  gates?: Record<string, GateResult>;
  pipeline?: BuildPipelineInfo;
  leveling: { brackets: LevelingBracket[] };
  ascendancyOrder: AscendancyPoint[];
  bandit: BuildBandit;
  pantheon: { major: string; minor: string; note?: string };
  uniques: { core: UniqueRef[]; optional: UniqueRef[] };
  flasks?: { leveling?: FlaskChoice[]; maps?: FlaskChoice[]; endgame?: FlaskChoice[] };
}
