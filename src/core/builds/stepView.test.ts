import { describe, expect, it } from 'vitest';
import {
  currentStep,
  measuredFallback,
  resolveStepId,
  stepRangeLabel,
  stepView,
  type StepViewSource,
} from './stepView.ts';
import type { BuildStepRoot } from './steps.ts';

const legacy: StepViewSource = {
  gates: {
    'until-12': { level: 12 },
    'until-28': { level: 28 },
    'until-68': { level: 68 },
    'maps-early': { level: 80 },
    'maps-red': { level: 90 },
    pinnacle: { level: 96 },
  },
};

const authored: BuildStepRoot[] = [
  {
    id: 'leveling',
    sub: [
      {
        root: 'leveling',
        id: 'leveling-1-12',
        from: 1,
        level: 12,
        main: 'Cleave',
        watch: 'Cleave carries the first acts.',
        measure: true,
      },
      {
        root: 'leveling',
        id: 'leveling-12-28',
        from: 13,
        level: 28,
        main: 'Sunder',
        watch: 'Sunder hits harder than Cleave.',
        trigger: { from: 12, skill: 'Sunder' },
        reason: 'No gear change; the swap is the only news.',
        measure: false,
      },
    ],
  },
  {
    id: 'maps',
    sub: [
      {
        root: 'maps',
        id: 'maps-white',
        from: 29,
        level: 80,
        main: 'Boneshatter',
        watch: 'White maps on the five-link.',
        measure: true,
        trigger: { from: 28 },
      },
    ],
  },
];

describe('step view of an unmigrated build', () => {
  it('projects the six checkpoints onto three roots, in reading order', () => {
    const roots = stepView(legacy);
    expect(roots.map((root) => [root.id, root.label])).toEqual([
      ['leveling', 'Leveling'],
      ['maps', 'Maps'],
      ['endgame', 'Endgame'],
    ]);
    expect(roots.map((root) => root.steps.map((step) => step.id))).toEqual([
      ['until-12', 'until-28', 'until-68'],
      ['maps-early', 'maps-red'],
      ['pinnacle'],
    ]);
  });

  it('keeps the gate key and the level window the checkpoint had', () => {
    const [leveling] = stepView(legacy);
    expect(leveling!.steps[1]).toMatchObject({
      id: 'until-28',
      level: 28,
      from: 13,
      measured: true,
      gateKey: 'until-28',
    });
  });

  it('has no roots when the build has not been verified', () => {
    expect(stepView({})).toEqual([]);
  });
});

describe('step view of a migrated build', () => {
  it('reads the authored roots and their watch lines', () => {
    const roots = stepView({ steps: authored });
    expect(roots.map((root) => root.id)).toEqual(['leveling', 'maps']);
    expect(roots[0]!.steps[0]).toMatchObject({
      id: 'leveling-1-12',
      from: 1,
      level: 12,
      measured: true,
      gateKey: 'leveling-1-12',
      watch: 'Cleave carries the first acts.',
    });
  });

  it('marks an editorial step and keeps its reason', () => {
    const step = stepView({ steps: authored })[0]!.steps[1]!;
    expect(step).toMatchObject({ id: 'leveling-12-28', measured: false });
    expect(step.gateKey).toBeUndefined();
    expect(step.reason).toBe('No gear change; the swap is the only news.');
  });
});

describe('choosing the step to open', () => {
  const roots = stepView({ steps: authored });

  it('opens the requested step when it exists', () => {
    expect(resolveStepId(roots, undefined, 'maps-white')).toBe('maps-white');
  });

  it('follows an alias from a pre-refactor link', () => {
    expect(resolveStepId(roots, { 'until-28': 'leveling-12-28' }, 'until-28')).toBe(
      'leveling-12-28',
    );
  });

  it('falls back to the first measured step for an unknown id', () => {
    expect(resolveStepId(roots, undefined, 'until-99')).toBe('leveling-1-12');
  });

  it('falls back to the first step when nothing is measured', () => {
    const editorial = stepView({
      steps: [{ id: 'leveling', sub: authored[0]!.sub.map((step) => ({ ...step, measure: false })) }],
    });
    expect(resolveStepId(editorial, undefined, null)).toBe('leveling-1-12');
  });

  it('resolves the current step from the roots', () => {
    expect(currentStep(roots, 'leveling-12-28')?.level).toBe(28);
    expect(currentStep(roots, 'nope')).toBeUndefined();
  });

  it('falls back to the nearest measured step at or before an editorial one', () => {
    expect(measuredFallback(roots, 'leveling-12-28')?.id).toBe('leveling-1-12');
    expect(measuredFallback(roots, 'maps-white')?.id).toBe('maps-white');
  });

  it('falls forward when nothing before the editorial step was measured', () => {
    const editorialHead = stepView({
      steps: [
        {
          id: 'leveling',
          sub: [
            { ...authored[0]!.sub[0]!, measure: false, reason: 'No measurement yet.' },
            { ...authored[0]!.sub[1]!, measure: true },
          ],
        },
      ],
    });
    expect(measuredFallback(editorialHead, 'leveling-1-12')?.id).toBe('leveling-12-28');
  });

  it('returns nothing when no step in the build is measured', () => {
    const none = stepView({
      steps: [{ id: 'leveling', sub: authored[0]!.sub.map((step) => ({ ...step, measure: false })) }],
    });
    expect(measuredFallback(none, 'leveling-1-12')).toBeUndefined();
  });
});

describe('step range label', () => {
  it('prints a window inside Leveling and a single level elsewhere', () => {
    const roots = stepView({ steps: authored });
    expect(stepRangeLabel(roots[0]!.steps[1]!)).toBe('Lv 13–28');
    expect(stepRangeLabel(roots[1]!.steps[0]!)).toBe('Lv 80');
  });

  it('prints a window for the last leveling checkpoint', () => {
    const roots = stepView(legacy);
    expect(stepRangeLabel(roots[0]!.steps[2]!)).toBe('Lv 29–68');
    expect(stepRangeLabel(roots[2]!.steps[0]!)).toBe('Lv 96');
  });
});
