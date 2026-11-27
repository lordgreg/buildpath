/**
 * Guide steps: three roots over authored, ordered sub-steps (D32–D37,
 * PLAN-BUILDS.md §9.3).
 *
 * A sub-step is written by hand, never generated from a trigger. Generating it
 * would mean that moving a gem swap renames the URL, the PoB paste key and the
 * calibration key, so the compiler validates the trigger instead: it proves the
 * declared step is one the game can actually be at.
 *
 * `level` is the level the step is read and measured at; it covers up to the
 * next sub-step's level minus one. That is what removes the empty 69–79 stretch
 * the old `until` brackets left behind.
 */
import type { ItemSlot } from '../archetypes/types.ts';
import type { FlaskChoice, SkillGroup } from './types.ts';

/** The three roots a guide is read in. */
export const STEP_ROOTS = ['leveling', 'maps', 'endgame'] as const;
export type StepRootId = (typeof STEP_ROOTS)[number];

/**
 * The six things that may start a sub-step. `level` is not one of them: every
 * step has a level, so it is the boundary, not the reason.
 */
export const STEP_TRIGGERS = ['skill', 'support', 'link', 'jewel', 'slot', 'budget'] as const;
export type StepTriggerKind = (typeof STEP_TRIGGERS)[number];

/** Item slots a `slot` trigger may name. Mirrors RePoE's equip slots. */
export const STEP_SLOTS: readonly ItemSlot[] = [
  'weapon',
  'offhand',
  'helmet',
  'body',
  'gloves',
  'boots',
  'belt',
  'amulet',
  'ring',
  'quiver',
  'jewel',
  'flask',
];

/**
 * Why a sub-step opens. `from` is the character level it starts at and must be
 * the previous sub-step's level; at most one trigger kind may be named.
 */
export interface StepTrigger {
  from: number;
  /** The main skill that takes over. */
  skill?: string;
  /** A support swap that changes the link. */
  support?: string;
  /** A socket count the step assumes, 3-6. */
  link?: number;
  /** A passive-tree jewel, by the label the tree view uses. */
  jewel?: string;
  /** A gear slot whose swap changes the build. */
  slot?: ItemSlot;
  /** A gear budget band, e.g. ssf-week1. */
  budget?: string;
}

/** Per-root checkpoint defaults, inherited by every sub-step in the root. */
export interface StepDefaults {
  budget?: string;
  gemLevelCap?: number;
  gemQuality?: number;
  labs?: number;
  points?: number;
  enemyLevel?: number;
}

/** One authored sub-step, as written in the seed. */
export interface SeedSubStep extends StepDefaults {
  id: string;
  /** The level the step is read and measured at. */
  level: number;
  /** The skill the step is built around; it must be usable at `level`. */
  main: string;
  /** Gem groups by equipment slot, the same shape the gate measures. */
  gems?: SkillGroup[];
  flasks?: FlaskChoice[];
  /** What changes here, in the guide's own words. Optional: a step that only
   * continues the same setup has nothing to add. */
  watch?: string;
  /** True when the step gets a PoB checkpoint and a gate report. */
  measure?: boolean;
  /** Why this step is editorial only. Required when `measure` is not true. */
  reason?: string;
  trigger?: StepTrigger;
  /** Pre-refactor step ids this one replaces, so old share links still land. */
  aliases?: string[];
}

/** One root's authored steps. */
export interface SeedStepRoot {
  default?: StepDefaults;
  sub: SeedSubStep[];
}

/** The `steps` block of a build seed. */
export type SeedSteps = Partial<Record<StepRootId, SeedStepRoot>>;

/** One sub-step as published: authored fields plus the resolved window. */
export interface BuildSubStep extends SeedSubStep {
  root: StepRootId;
  /** First level the step covers; 1 for the first leveling step. */
  from: number;
  measure: boolean;
  /**
   * The reviewed checkpoint band it inherits, when the compiler was given the
   * band table. The page and the tests read it instead of hard-coding ids.
   */
  band?: string;
}

/** One root as published, in STEP_ROOTS order. */
export interface BuildStepRoot {
  id: StepRootId;
  default?: StepDefaults;
  sub: BuildSubStep[];
}

export interface ResolveStepsOptions {
  /** Character level a gem becomes usable at, from gem-levels.json. */
  requiredLevel: (gem: string) => number | undefined;
  /** Budget ids the pipeline can gear from, from gear/budgets.yaml. */
  knownBudgets?: readonly string[];
  /** Checkpoint bands, so every step publishes the band it inherits. */
  bands?: readonly CheckpointBand[];
}

export interface ResolvedSteps {
  roots: BuildStepRoot[];
  /** Pre-refactor step id to the sub-step that replaced it. */
  aliases: Record<string, string>;
  errors: string[];
}

function gemLevel(name: string, options: ResolveStepsOptions): number | undefined {
  return options.requiredLevel(name);
}

/**
 * Validate and resolve a seed's `steps`. Returns every error at once rather
 * than throwing, so a seed author sees the whole list.
 */
export function resolveSteps(steps: SeedSteps, options: ResolveStepsOptions): ResolvedSteps {
  const errors: string[] = [];
  const roots: BuildStepRoot[] = [];
  const aliases: Record<string, string> = {};
  const ids = new Set<string>();
  const aliasSources = new Set<string>();
  let previousRootLevel: number | undefined;

  for (const rootId of STEP_ROOTS) {
    const root = steps[rootId];
    if (!root) continue;
    if (!Array.isArray(root.sub) || root.sub.length === 0) {
      errors.push(`steps.${rootId}: needs at least one sub-step`);
      continue;
    }

    let previousLevel: number | undefined;
    const sub: BuildSubStep[] = [];
    for (const [index, step] of root.sub.entries()) {
      const where = `steps.${rootId}.sub[${index}] (${step.id ?? 'no id'})`;

      if (!step.id) {
        errors.push(`${where}: needs an id`);
        continue;
      }
      if (ids.has(step.id)) errors.push(`${where}: duplicate id "${step.id}"`);
      ids.add(step.id);

      if (!Number.isInteger(step.level) || step.level < 2 || step.level > 100) {
        errors.push(`${where}: level must be an integer between 2 and 100`);
        continue;
      }

      // Only the first leveling step opens the character and takes no trigger;
      // every other step, including the first of Maps and Endgame, says what
      // made it start. A level-only boundary is allowed and carries `from`.
      const floor = previousLevel ?? previousRootLevel;
      if (floor !== undefined && step.level <= floor) {
        errors.push(`${where}: level ${step.level} must be after ${floor}`);
      }

      if (index === 0 && rootId === 'leveling') {
        if (step.trigger) {
          errors.push(`${where}: the first leveling step opens the character and takes no trigger`);
        }
      } else if (!step.trigger) {
        errors.push(`${where}: needs a trigger; only the first leveling step takes none`);
      } else if (step.trigger.from !== floor) {
        errors.push(
          `${where}: trigger.from must be the previous step's level (${floor}), not ${step.trigger.from}`,
        );
      } else {
        errors.push(...checkTrigger(step.trigger, step.level, where, options));
      }

      const required = gemLevel(step.main, options);
      if (required === undefined) {
        errors.push(`${where}: unknown main skill "${step.main}"`);
      } else if (required > step.level) {
        errors.push(
          `${where}: main skill ${step.main} needs level ${required}, but the step is read at ${step.level}`,
        );
      }

      for (const group of step.gems ?? []) {
        for (const gem of group.gems) {
          const name = typeof gem === 'string' ? gem : gem.name;
          const gemRequired = gemLevel(name, options);
          if (gemRequired === undefined) {
            errors.push(`${where}: unknown gem "${name}" in ${group.slot}`);
          } else if (gemRequired > step.level) {
            errors.push(
              `${where}: ${name} needs level ${gemRequired}, but the step is read at ${step.level}`,
            );
          }
        }
      }

      if (step.measure !== true && !step.reason?.trim()) {
        errors.push(
          `${where}: an unmeasured step needs a reason (set measure: true to give it a gate)`,
        );
      }

      if (step.budget && options.knownBudgets && !options.knownBudgets.includes(step.budget)) {
        errors.push(`${where}: unknown budget "${step.budget}"`);
      }

      for (const alias of step.aliases ?? []) {
        if (ids.has(alias) || aliasSources.has(alias)) {
          errors.push(`${where}: alias "${alias}" is already a step id or alias`);
        }
        aliasSources.add(alias);
        aliases[alias] = step.id;
      }

      sub.push({
        ...step,
        root: rootId,
        from: (previousLevel ?? previousRootLevel ?? 0) + 1,
        measure: step.measure === true,
        ...(options.bands ? { band: bandFor(step.level, options.bands).id } : {}),
      });
      previousLevel = step.level;
    }

    if (sub.length > 0) {
      if (rootId === 'leveling' && sub[0]!.from !== 1) {
        // The first leveling step always opens the character.
        sub[0] = { ...sub[0]!, from: 1 };
      }
      roots.push({
        id: rootId,
        ...(root.default ? { default: root.default } : {}),
        sub,
      });
      previousRootLevel = sub[sub.length - 1]!.level;
    }
  }

  if (roots.length === 0 && errors.length === 0) {
    errors.push('steps: at least one root is required');
  }

  // An alias may not shadow a real step id, whichever order the two appear in.
  for (const [alias, target] of Object.entries(aliases)) {
    if (ids.has(alias) && ids.has(target)) {
      errors.push(`steps: alias "${alias}" collides with a step id`);
    }
  }

  return { roots, aliases, errors };
}

function checkTrigger(
  trigger: StepTrigger,
  level: number,
  where: string,
  options: ResolveStepsOptions,
): string[] {
  const errors: string[] = [];
  const kinds = STEP_TRIGGERS.filter((kind) => trigger[kind] !== undefined);
  if (kinds.length > 1) {
    errors.push(
      `${where}: a trigger names at most one of ${STEP_TRIGGERS.join(', ')} (found ${kinds.length})`,
    );
    return errors;
  }
  // No kind named is a level boundary: the guide has something to say here and
  // nothing else fired. That is allowed; two kinds at once is not.
  if (kinds.length === 0) return errors;

  const kind = kinds[0]!;
  switch (kind) {
    case 'skill':
    case 'support': {
      const name = trigger[kind]!;
      const required = gemLevel(name, options);
      if (required === undefined) {
        errors.push(`${where}: unknown ${kind} "${name}"`);
      } else if (required > level) {
        errors.push(`${where}: ${name} needs level ${required}, but the step is read at ${level}`);
      }
      break;
    }
    case 'link': {
      const links = trigger.link!;
      if (!Number.isInteger(links) || links < 3 || links > 6) {
        errors.push(`${where}: link must be an integer between 3 and 6`);
      }
      break;
    }
    case 'slot': {
      if (!STEP_SLOTS.includes(trigger.slot!)) {
        errors.push(`${where}: unknown slot "${trigger.slot}"`);
      }
      break;
    }
    case 'jewel': {
      if (!trigger.jewel!.trim()) errors.push(`${where}: jewel needs a tree label`);
      break;
    }
    case 'budget': {
      const budget = trigger.budget!;
      if (!budget.trim()) errors.push(`${where}: budget needs a name`);
      else if (options.knownBudgets && !options.knownBudgets.includes(budget)) {
        errors.push(`${where}: unknown budget "${budget}"`);
      }
      break;
    }
  }
  return errors;
}

/** The measured sub-steps, in reading order. */
export function measuredSteps(roots: BuildStepRoot[]): BuildSubStep[] {
  return roots.flatMap((root) => root.sub.filter((step) => step.measure));
}

/**
 * A reviewed checkpoint band: what a level has to work with. `checkpoints.yaml`
 * is the source; this module only reads it so the band a step inherits is pure
 * and testable without the PoB oracle.
 */
export interface CheckpointBand {
  id: string;
  level: number;
  budget: string;
  points: number;
  labs: number;
  gemLevelCap?: number;
  gemQuality?: number;
  enemyLevel?: number;
}

/** A measured step with its band resolved: what the oracle is asked to measure. */
export interface ResolvedStep {
  id: string;
  /** The band whose defaults, and whose gate thresholds, apply. */
  band: string;
  level: number;
  budget: string;
  points: number;
  labs: number;
  gemLevelCap: number;
  gemQuality: number;
  enemyLevel: number;
  gems: SkillGroup[];
  flasks: FlaskChoice[];
}

/**
 * The band a level sits in: the highest reviewed checkpoint at or below it.
 *
 * A level-38 step therefore inherits the level-28 budget rather than an invented
 * one, and a level-85 step the level-80 one. That under-points rather than
 * over-points, which is the safe direction for a floor: the step is measured
 * with less than the player has, never more.
 */
export function bandFor(level: number, bands: readonly CheckpointBand[]): CheckpointBand {
  const sorted = [...bands].sort((a, b) => a.level - b.level);
  if (sorted.length === 0) throw new Error('bandFor: no checkpoint bands');
  let band = sorted[0]!;
  for (const entry of sorted) {
    if (entry.level <= level) band = entry;
  }
  return band;
}

/** Resolve one measured sub-step onto its band. */
export function resolveMeasuredStep(
  step: BuildSubStep,
  bands: readonly CheckpointBand[],
): ResolvedStep {
  const band = bandFor(step.level, bands);
  return {
    id: step.id,
    band: band.id,
    level: step.level,
    budget: step.budget ?? band.budget,
    points: step.points ?? band.points,
    labs: step.labs ?? band.labs,
    gemLevelCap: step.gemLevelCap ?? band.gemLevelCap ?? 20,
    gemQuality: step.gemQuality ?? band.gemQuality ?? 0,
    enemyLevel: step.enemyLevel ?? band.enemyLevel ?? 83,
    gems: step.gems ?? [],
    flasks: step.flasks ?? [],
  };
}

/**
 * Resolve a pre-refactor step id, e.g. `until-28`, to the sub-step that
 * replaced it. Unknown ids come back unchanged so the page can fall back.
 */
export function resolveStepAlias(
  aliases: Record<string, string> | undefined,
  stepId: string,
): string {
  return aliases?.[stepId] ?? stepId;
}
