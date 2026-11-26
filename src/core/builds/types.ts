import type { CharacterClass, ItemSlot, SlotSpec } from '../archetypes/types.ts';
import type { FamilyId } from '../../meta/types.ts';

/** What a build seed compiles to on the site. */
export type BuildStatus = 'draft' | 'verified' | 'rejected';

/**
 * The list entry `builds.html` and the builder read. Everything here is small:
 * the detailed build lives in its own JSON file (see `Build`).
 */
/** One checkpoint's result, small enough to ship in the catalogue index. */
export interface BuildStepSummary {
  id: string;
  pass: boolean;
  level: number;
  dps: number;
}

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
  /** Gate results per checkpoint, so `builds.html` needs only the index. */
  steps?: BuildStepSummary[];
  /** True when the committed calibration report covers the current gates. */
  calibrated?: boolean;
  /**
   * Filter slots that override the family/ascendancy defaults (D15). A null
   * slot removes the default, e.g. a two-handed build has no offhand.
   */
  filter?: { slots: Partial<Record<ItemSlot, SlotSpec | null>> };
}

export interface LevelingBracket {
  /** Level bracket upper bound; the last bracket ends at 100. */
  until: number;
  skills: string[];
  /** Gems and their slots while leveling; the guide renders this per step. */
  skillGroups?: SkillGroup[];
  flasks?: FlaskChoice[];
}

/** Where a gem comes from for this build's class. */
export interface GemAvailability {
  /** Character level needed to use the gem at all. */
  requiredLevel: number;
  /** The quest that grants it, when it is a quest gem. */
  quest: { act: number | null; quest: string | null; classes: string[] } | null;
  /** True when this class gets it as a free quest reward. */
  free: boolean;
  /** Gem colour from RePoE: r=strength, g=dexterity, b=intelligence, w=universal. */
  color?: 'r' | 'g' | 'b' | 'w' | null;
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
export interface GearImplicit {
  /** Which Eldritch currency applies the implicit. */
  currency: 'ember' | 'ichor';
  mod: string;
}

export interface GearItem {
  slot: string;
  base: string;
  mods: string[];
  /** Eldritch implicits, when the budget is endgame gear. */
  implicits?: GearImplicit[];
  budget: string;
  ilvl: number;
  rarity?: 'NORMAL' | 'MAGIC' | 'RARE' | 'UNIQUE';
}

export interface GemLink {
  name: string;
  level: number;
  quality?: number;
  /** A cap the seed imposes; the UI warns when the gem should not be levelled. */
  maxLevel?: number;
  note?: string;
}

export interface GemGroup {
  slot: string;
  gems: GemLink[];
}

/**
 * What bounded repair changed at one checkpoint (PLAN-BUILDS.md §7.5, R12).
 * `seedTree` is the tree before repair, so the page can show both.
 */
export interface GateRepair {
  added: number[];
  removed: number[];
  evals: number;
  nodeDelta: number;
  status: 'within-bound' | 'exceeded';
  seedTree?: TreeView;
}

export interface GateResult {
  pass: boolean;
  level: number;
  budget: string;
  gear?: GearItem[];
  gems?: GemGroup[];
  flasks?: FlaskChoice[];
  metrics: Omit<CheckpointMetrics, 'physicalMaxHit' | 'fireResist' | 'coldResist' | 'lightningResist'> & {
    maxHit: number;
    minionCount?: number;
    resists: number[];
    sockets?: number;
  };
  tree?: TreeView;
  repair?: GateRepair;
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
  gems: (string | { name: string; maxLevel?: number; note?: string })[];
}

export interface FlaskChoice {
  slot: 'life' | 'mana' | 'utility';
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

export interface TreeJewel {
  /** The jewel socket node in the tree view. */
  node: number;
  /** Guide label, e.g. "Jewel 1". */
  label: string;
  /** Base type, e.g. "Viridian Jewel". */
  base: string;
}

export interface TreeView {
  nodes: TreePoint[];
  edges: [number, number][];
  notables: string[];
  /** The class start node, so a test can prove a valid allocation order. */
  start?: number;
  /** Jewels this step requires, pinned to the socket that holds each one. */
  jewels?: TreeJewel[];
}

/**
 * One endgame plan, with every checkpoint as a pruned subset. A checkpoint tree
 * is therefore always a legal prefix of the tree the build ends on.
 */
export interface BuildTree {
  endgame: number[];
  checkpoints: Record<string, number[]>;
  /** Initial tree before bounded repair, when repair touched a checkpoint. */
  seed?: Record<string, number[]>;
}

export interface Build extends BuildIndexEntry {
  schemaVersion: 1;
  skillGroups: SkillGroup[];
  minionCount?: number;
  /** Per-gem quest/level provenance, compiled from RePoE's gem data. */
  gemInfo?: Record<string, GemAvailability>;
  gates?: Record<string, GateResult>;
  tree?: BuildTree;
  pipeline?: BuildPipelineInfo;
  /**
   * The published Path of Building code (D19). It is the `checkpoint` gear set
   * serialised by the same writer the oracle measured, so importing it shows
   * what the gate saw. Generated by `npm run builds:verify`, never in the app.
   */
  pob?: { ref: string; checkpoint: string; code: string };
  leveling: { brackets: LevelingBracket[] };
  ascendancyOrder: AscendancyPoint[];
  bandit: BuildBandit;
  pantheon: { major: string; minor: string; note?: string };
  uniques: { core: UniqueRef[]; optional: UniqueRef[] };
  flasks?: { leveling?: FlaskChoice[]; maps?: FlaskChoice[]; endgame?: FlaskChoice[] };
}
