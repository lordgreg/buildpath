/**
 * The page's view of a build's steps (PLAN-BUILDS.md §9.3).
 *
 * A seed that declares `steps` is read as authored. A seed that has not migrated
 * is *projected*: its six checkpoints become three roots, so the page can name
 * Leveling, Maps and Endgame for every guide today, and migrating a seed in PR 4
 * swaps the source of this view without moving anything on screen.
 *
 * Pure, so the grouping and the old-link resolution can be tested without a DOM.
 */
import { STEP_ROOTS } from './steps.ts';
import type { BuildStepRoot, StepGrade, StepRootId } from './steps.ts';

export const STEP_ROOT_LABELS: Record<StepRootId, string> = {
  leveling: 'Leveling',
  maps: 'Maps',
  endgame: 'Endgame',
};

/**
 * Which root each pre-`steps` checkpoint belongs to. The order of the gate
 * report is the reading order, so the projection keeps it.
 */
const LEGACY_ROOTS: Record<string, StepRootId> = {
  'until-12': 'leveling',
  'until-28': 'leveling',
  'until-68': 'leveling',
  'maps-early': 'maps',
  'maps-red': 'maps',
  pinnacle: 'endgame',
};

export interface StepViewStep {
  id: string;
  root: StepRootId;
  /** Level the step is read and measured at. */
  level: number;
  /** First level it covers; equals `level` outside Leveling. */
  from: number;
  /** False for an editorial step: no gate report, no numbers of its own. */
  measured: boolean;
  /** Key into the build's gates, when measured. */
  gateKey?: string;
  /** What changes at this step. Authored on a migrated seed. */
  watch?: string;
  /** How the step plays, S best to D harshest. Authored, never generated. */
  grade?: StepGrade;
  /** Why an editorial step is unmeasured. */
  reason?: string;
}

export interface StepViewRoot {
  id: StepRootId;
  label: string;
  steps: StepViewStep[];
}

/** The minimum a build needs to expose for the page to group its steps. */
export interface StepViewSource {
  steps?: BuildStepRoot[];
  stepAliases?: Record<string, string>;
  gates?: Record<string, { level: number }>;
}

/** Group a build's steps by root, in Leveling, Maps, Endgame order. */
export function stepView(build: StepViewSource): StepViewRoot[] {
  if (build.steps && build.steps.length > 0) {
    return build.steps.map((root) => ({
      id: root.id,
      label: STEP_ROOT_LABELS[root.id],
      steps: root.sub.map((step) => ({
        id: step.id,
        root: root.id,
        level: step.level,
        from: step.from,
        measured: step.measure,
        ...(step.measure ? { gateKey: step.id } : {}),
        ...(step.watch ? { watch: step.watch } : {}),
        ...(step.grade ? { grade: step.grade } : {}),
        ...(step.reason ? { reason: step.reason } : {}),
      })),
    }));
  }

  // A seed that has not migrated: its gate report is its step list.
  const byRoot = new Map<StepRootId, StepViewStep[]>();
  let previous: number | undefined;
  for (const [id, gate] of Object.entries(build.gates ?? {})) {
    const root = LEGACY_ROOTS[id] ?? 'endgame';
    const entry: StepViewStep = {
      id,
      root,
      level: gate.level,
      from: (previous ?? 0) + 1,
      measured: true,
      gateKey: id,
    };
    byRoot.set(root, [...(byRoot.get(root) ?? []), entry]);
    previous = gate.level;
  }
  return STEP_ROOTS.filter((id) => byRoot.has(id)).map((id) => ({
    id,
    label: STEP_ROOT_LABELS[id],
    steps: byRoot.get(id)!,
  }));
}

/**
 * Which step to open. A migrated seed's own id wins, then a pre-refactor id
 * through the alias table, then the first measured step - so a stale share link
 * still lands on a step that has numbers.
 */
export function resolveStepId(
  roots: StepViewRoot[],
  aliases: Record<string, string> | undefined,
  requested: string | null | undefined,
): string {
  const steps = roots.flatMap((root) => root.steps);
  const ids = new Set(steps.map((step) => step.id));
  if (requested && ids.has(requested)) return requested;
  const aliased = requested ? aliases?.[requested] : undefined;
  if (aliased && ids.has(aliased)) return aliased;
  return steps.find((step) => step.measured)?.id ?? steps[0]?.id ?? '';
}

/** The step being read, or undefined when the build has none. */
export function currentStep(roots: StepViewRoot[], id: string): StepViewStep | undefined {
  return roots.flatMap((root) => root.steps).find((step) => step.id === id);
}

/**
 * The nearest measured step, for an editorial one that has no report of its own.
 * Earlier is preferred: the reader is between two measured steps, and the one
 * behind them is the set they are still wearing. Falls forward only when nothing
 * earlier was measured.
 */
export function measuredFallback(
  roots: StepViewRoot[],
  id: string,
): StepViewStep | undefined {
  const steps = roots.flatMap((root) => root.steps);
  const index = steps.findIndex((step) => step.id === id);
  if (index === -1) return undefined;
  for (let i = index; i >= 0; i -= 1) {
    if (steps[i]!.measured) return steps[i];
  }
  return steps.slice(index + 1).find((step) => step.measured);
}

/**
 * "Lv 13–28" for a leveling step, "Lv 90" elsewhere: a Maps step is read at a
 * level, not over a range, even though it technically covers up to the next one.
 */
export function stepRangeLabel(step: StepViewStep): string {
  return step.root === 'leveling' && step.from < step.level
    ? `Lv ${step.from}–${step.level}`
    : `Lv ${step.level}`;
}
