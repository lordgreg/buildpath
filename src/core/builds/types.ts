import type { CharacterClass, ItemSlot, SlotSpec } from '../archetypes/types.ts';
import type { BuildGuide } from './guide.ts';
import type { BuildMedal, BuildRatings } from './ratings.ts';
import type { Staleness } from './staleness.ts';
import type { FamilyId } from '../../meta/types.ts';

/** What a build seed compiles to on the site. */
export type BuildStatus = 'draft' | 'verified' | 'rejected' | 'stale';

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

/** A short catalogue badge, e.g. SSF, Minion, HC-ready. */
export interface BuildChip {
  label: string;
  kind: 'ssf' | 'defence' | 'playstyle' | 'note' | 'season';
  title?: string;
}

/** The league a guide was created for, or last updated for. */
export interface BuildSeason {
  id: string;
  name: string;
}

/** One guide update, shown at the bottom of the build page. */
export interface BuildChangelogEntry {
  /** League id the update landed in, e.g. covens. */
  season: string;
  /** Display name resolved at compile time, e.g. Covens. */
  seasonName?: string;
  /** ISO date of the update. */
  date: string;
  /** What changed, in short lines. */
  notes: string[];
}

/** The four Viscera slots on the Covens Wickerman. */
export const WICKERMAN_SLOTS = ['head', 'torso', 'upperLimb', 'lowerLimb'] as const;
export type WickermanSlot = (typeof WICKERMAN_SLOTS)[number];

/** Guide phases the Wickerman recommendations are authored for. */
export const WICKERMAN_STEPS = ['leveling', 'maps', 'bossing'] as const;
export type WickermanStepId = (typeof WICKERMAN_STEPS)[number];

/** Viscera upgrade tiers; fixed/uber items have no low/med/high band. */
export type VisceraTier = 'low' | 'med' | 'high' | 'queen' | 'fixed' | 'uber';

/** One resolved Viscera recommendation for a slot and phase. */
export interface WickermanPick {
  name: string;
  tier: VisceraTier;
  effect: string;
  source: string;
  area: string;
  note?: string;
}

export type WickermanSlots = Record<WickermanSlot, WickermanPick>;

/** The resolved Covens Wickerman section on a build page. */
export interface BuildWickerman {
  profile: string;
  steps: Record<WickermanStepId, WickermanSlots>;
}

/** A slot and the modifiers to look for at one checkpoint. */
export interface StepPlanLookFor {
  slot: string;
  mods: string[];
  note?: string;
}

/** A crafting recipe worth using at one checkpoint. */
export interface StepPlanCrafting {
  slot: string;
  mods: string[];
  note?: string;
}

/** One checkpoint's goals, gear targets and crafting advice. */
export interface StepPlan {
  goals: string[];
  lookFor: StepPlanLookFor[];
  crafting?: StepPlanCrafting[];
}

export type BuildStepPlans = Record<string, StepPlan>;

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
  /** Differentiators for the catalogue: SSF, playstyle, measured defence. */
  chips?: BuildChip[];
  /** Editorial 1–10 ratings and the derived medal. */
  ratings?: BuildRatings;
  medal?: BuildMedal;
  /** The league this guide was created for, or last updated for. */
  season?: BuildSeason;
  /** True when the committed calibration report covers the current gates. */
  calibrated?: boolean;
  /**
   * When Path of Building last verified this build. The catalogue's "newest"
   * sort uses it: a build is new to the reader when its numbers were re-proven,
   * not when its slug was added to an alphabetical file listing.
   */
  verifiedAt?: string;
  /** Staleness / waiting state, when the build is delisted (R10). */
  stale?: Staleness;
  /**
   * Filter slots for the build. The compiler derives the equipment slots from
   * the gear profile the gates measured; a seed may override any slot (D15),
   * and a null slot removes the default, e.g. a two-handed build has no
   * offhand.
   */
  filter?: { slots: Partial<Record<ItemSlot, SlotSpec | null>> };
}

/**
 * A mid-bracket gem change, e.g. Sunder from 12 until Boneshatter at 28. It is
 * editorial advice, not a measured checkpoint, so it stays out of `seedHash`.
 */
export interface LevelingSwap {
  /** The gem to use from `fromLevel`. */
  gem: string;
  /** Character level at which the swap becomes available. */
  fromLevel: number;
  /** Exclusive end: the level where the next skill takes over. */
  untilLevel?: number;
  /** The gem this one replaces while it is used. */
  replaces?: string;
  note?: string;
}

export interface LevelingBracket {
  /** Level bracket upper bound; the last bracket ends at 100. */
  until: number;
  skills: string[];
  /** Gems and their slots while leveling; the guide renders this per step. */
  skillGroups?: SkillGroup[];
  flasks?: FlaskChoice[];
}

/**
 * Where a gem comes from for this build's class. `reward` is a free quest
 * reward, `vendor` is the town vendor pool that the quest opens, `siosa` is the
 * Act 3 Library vendor who stocks every gem the completed quests unlock,
 * `lilly` is the Act 6 vendor who sells the gems Siosa is too early for,
 * `divine-font` is a transfigured gem and `level` means the data names no
 * quest, so the only honest advice is the level gate.
 */
export interface GemSource {
  kind: 'reward' | 'vendor' | 'siosa' | 'lilly' | 'divine-font' | 'level';
  /** Act the quest or vendor is in; null when no quest is named. */
  act: number | null;
  /** Quest that grants the gem or opens the vendor stock. */
  quest: string | null;
}

/** Where a gem comes from for this build's class. */
export interface GemAvailability {
  /** Character level needed to use the gem at all. */
  requiredLevel: number;
  /** How this class obtains the gem, and the quest that gates it. */
  source: GemSource;
  /** Gem colour from RePoE: r=strength, g=dexterity, b=intelligence, w=universal. */
  color?: 'r' | 'g' | 'b' | 'w' | null;
  /** True for a support gem; the tooltip labels its effect differently. */
  support?: boolean;
  /** Prose description from RePoE, when the gem has one. */
  description?: string | null;
  /** Display lines for what the gem does at the guide's level band. */
  effect?: string[];
  /** Mechanical tags, e.g. attack, projectile, minion, aura. */
  tags?: string[];
  /** What 20% quality buys, with RePoE's placeholders stripped. */
  qualityEffect?: string;
  qualityWorth?: 'recommended' | 'optional' | 'none';
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

/** A weighted reason to play or avoid a build. 3 is the defining reason. */
export interface BuildTradeoff {
  text: string;
  weight: 1 | 2 | 3;
}

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
  /** Mana left after reservations; 0 means the character cannot pay a mana cost. */
  manaUnreserved?: number;
  manaCost?: number;
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
  /** The gate profile used, e.g. standard or dad. */
  gateProfile?: string;
  /** The thresholds this checkpoint was evaluated against. */
  thresholds?: Record<string, number | boolean>;
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
  /** Content hash of the patch facts this build was verified against. */
  patchHash?: string;
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
  pob?: {
    ref: string;
    checkpoint: string;
    code: string;
    /** One code per guide step, so pobb.in can show the tree at that step. */
    byStep?: Record<string, string>;
  };
  pros: BuildTradeoff[];
  cons: BuildTradeoff[];
  leveling: { swaps?: LevelingSwap[]; brackets: LevelingBracket[] };
  ascendancyOrder: AscendancyPoint[];
  bandit: BuildBandit;
  pantheon: { major: string; minor: string; note?: string };
  uniques: { core: UniqueRef[]; optional: UniqueRef[] };
  flasks?: { leveling?: FlaskChoice[]; maps?: FlaskChoice[]; endgame?: FlaskChoice[] };
  /** The game patch the build was verified against. */
  patch?: string;
  /**
   * A build whose guide is about a Vaal gem from the start may show and measure
   * 20% quality before maps-red. Defaults to endgame-only quality.
   */
  gemQualityFrom?: 'leveling';
  /** Every guide update, newest first when rendered. */
  changelog?: BuildChangelogEntry[];
  /** Staleness / waiting state, when the build is delisted (R10). */
  stale?: Staleness;
  /** A flagship requires a signed summary; breadth pages may auto-publish. */
  flagship?: boolean;
  /** The gate profile this seed is judged against. Defaults to standard. */
  gateProfile?: 'standard' | 'dad';
  /** Tanky, low-APM, forgiving build; tagged Dad in the catalogue. */
  dad?: boolean;
  /** PoB spectre metadata ids, for a Raise Spectre build. */
  spectres?: string[];
  /** Extra PoB config inputs, e.g. frenzy charges. */
  config?: { name: string; value: string }[];
  /** Resolved, checked prose. The seed YAML is the authoring home. */
  guide?: BuildGuide;
  /** Covens league Wickerman recommendations, resolved from the seed profile. */
  wickerman?: BuildWickerman;
  /** Per-checkpoint goals, gear targets and crafting, resolved from the seed profile. */
  stepPlans?: BuildStepPlans;
}
