import { describe, expect, it } from 'vitest';
import { levelingPlan, levelingStep } from './leveling.ts';
import type { LevelingSwap } from './types.ts';

const sunder: LevelingSwap = {
  gem: 'Sunder',
  fromLevel: 12,
  untilLevel: 28,
  replaces: 'Cleave',
};

/** The levels the compiled Boneshatter guide actually uses. */
const levels: Record<string, number> = {
  Cleave: 1,
  Sunder: 12,
  'Enduring Cry': 10,
  Boneshatter: 28,
};
const required = (gem: string) => levels[gem];

const boneshatter = {
  swaps: [sunder],
  brackets: [
    { until: 12, skills: ['Cleave'] },
    { until: 28, skills: ['Boneshatter', 'Enduring Cry'] },
    { until: 68, skills: ['Boneshatter', 'Enduring Cry'] },
    { until: 100, skills: ['Boneshatter', 'Enduring Cry'] },
  ],
};

describe('levelingStep', () => {
  it('opens the first step on the gem you can already use and ends it on the swap', () => {
    expect(levelingStep(boneshatter, 0, required, { level: 12 })).toEqual({
      from: 1,
      until: 12,
      startSkills: ['Cleave'],
      upgrades: [{ ...sunder, atBoundary: true }],
    });
  });

  it('opens the next step on the swapped-in gem, not the one it replaced', () => {
    const step = levelingStep(boneshatter, 1, required, { level: 28 });
    expect(step?.from).toBe(13);
    expect(step?.startSkills).toEqual(['Sunder', 'Enduring Cry']);
    expect(step?.upgrades).toEqual([
      { gem: 'Boneshatter', fromLevel: 28, replaces: 'Sunder', atBoundary: true },
    ]);
  });

  it('derives the upgrade a seed never wrote down', () => {
    // Cyclone has no swap entry: the guide only says "until 28" lists it.
    const step = levelingStep(
      {
        brackets: [
          { until: 12, skills: ['Cleave'] },
          { until: 28, skills: ['Cyclone'] },
          { until: 100, skills: ['Cyclone'] },
        ],
      },
      1,
      (gem) => ({ Cleave: 1, Cyclone: 28 })[gem],
      { level: 28 },
    );
    expect(step?.startSkills).toEqual(['Cleave']);
    expect(step?.upgrades).toEqual([
      { gem: 'Cyclone', fromLevel: 28, replaces: 'Cleave', atBoundary: true },
    ]);
  });

  it('clamps a bracket that overshoots the checkpoint', () => {
    // Penance Brand has no level-12 bracket; its first bracket ends at 28.
    const step = levelingStep(
      {
        brackets: [
          { until: 28, skills: ['Rolling Magma', 'Flame Wall'] },
          { until: 100, skills: ['Penance Brand', 'Flame Wall'] },
        ],
      },
      0,
      (gem) => ({ "Rolling Magma": 1, "Flame Wall": 4, "Penance Brand": 28 })[gem],
      { level: 12 },
    );
    expect(step?.until).toBe(12);
    expect(step?.startSkills).toEqual(['Rolling Magma']);
    expect(step?.upgrades.map((upgrade) => upgrade.gem)).toEqual(['Flame Wall']);
  });

  it('opens a bracket late when the guide has no earlier bracket', () => {
    // The same guide at the level-28 checkpoint: the step opens at 13 because
    // the level-12 checkpoint already covered 1-12.
    const step = levelingStep(
      {
        brackets: [
          { until: 28, skills: ['Rolling Magma', 'Flame Wall'] },
          { until: 100, skills: ['Penance Brand', 'Flame Wall'] },
        ],
      },
      0,
      (gem) => ({ 'Rolling Magma': 1, 'Flame Wall': 4, 'Penance Brand': 28 })[gem],
      { level: 28, from: 13 },
    );
    expect(step?.from).toBe(13);
    expect(step?.until).toBe(28);
    expect(step?.startSkills).toEqual(['Rolling Magma', 'Flame Wall']);
    // The next bracket's main skill becomes usable inside this step, so the
    // hand-off is named even though the seed never wrote a swap for it.
    expect(step?.upgrades).toEqual([
      { gem: 'Penance Brand', fromLevel: 28, replaces: 'Rolling Magma', atBoundary: true },
    ]);
  });

  it('keeps a mid-bracket upgrade at its own level', () => {
    const step = levelingStep(
      {
        brackets: [
          { until: 12, skills: ['Summon Skeletons'] },
          { until: 68, skills: ['Summon Stone Golem'] },
          { until: 100, skills: ['Summon Stone Golem'] },
        ],
      },
      1,
      (gem) => ({ "Summon Skeletons": 10, "Summon Stone Golem": 34 })[gem],
      { level: 68 },
    );
    expect(step?.from).toBe(13);
    expect(step?.startSkills).toEqual(['Summon Skeletons']);
    expect(step?.upgrades).toEqual([
      { gem: 'Summon Stone Golem', fromLevel: 34, replaces: 'Summon Skeletons', atBoundary: false },
    ]);
  });

  it('reports nothing to start with when the first bracket needs a later gem', () => {
    const step = levelingStep(
      { brackets: [{ until: 12, skills: ['Essence Drain'] }] },
      0,
      (gem) => ({ "Essence Drain": 12 })[gem],
      { level: 12 },
    );
    expect(step?.startSkills).toEqual([]);
    expect(step?.upgrades).toEqual([
      { gem: 'Essence Drain', fromLevel: 12, atBoundary: true },
    ]);
  });

  it('returns null for a bracket that does not exist', () => {
    expect(levelingStep(boneshatter, 9, required, { level: 100 })).toBeNull();
  });

  it('keeps a swap with no end in every later step', () => {
    const openEnded = { gem: 'Sunder', fromLevel: 12 };
    const leveling = {
      swaps: [openEnded],
      brackets: [
        { until: 12, skills: ['Cleave'] },
        { until: 28, skills: ['Boneshatter'] },
        { until: 68, skills: ['Boneshatter'] },
      ],
    };
    expect(levelingStep(leveling, 1, required, { level: 28 })?.startSkills).toContain('Sunder');
    expect(levelingStep(leveling, 2, required, { level: 68 })?.startSkills).toContain('Sunder');
  });
});

describe('levelingPlan', () => {
  const checkpoints = [
    { id: 'until-12', level: 12 },
    { id: 'until-28', level: 28 },
    { id: 'until-68', level: 68 },
  ];
  const plan = levelingPlan(boneshatter, checkpoints, required);

  it('marks a gem as new only in the step that introduces it', () => {
    expect(plan[0]?.newSkills).toEqual(['Cleave']);
    // Sunder is introduced by the level-12 swap card, Enduring Cry is new here.
    expect(plan[1]?.newSkills).toEqual(['Enduring Cry']);
    // Boneshatter was introduced by the level-28 swap card.
    expect(plan[2]?.newSkills).toEqual([]);
  });

  it('marks a step with nothing new as redundant so the page can hide it', () => {
    expect(plan[0]?.redundant).toBe(false);
    expect(plan[1]?.redundant).toBe(false);
    expect(plan[2]?.redundant).toBe(true);
  });

  it('keeps the checkpoint id on every step', () => {
    expect(plan.map((step) => step.id)).toEqual(['until-12', 'until-28', 'until-68']);
  });

  it('handles a guide whose first bracket ends after the first checkpoint', () => {
    const steps = levelingPlan(
      { brackets: [{ until: 28, skills: ['Rolling Magma', 'Flame Wall'] }, { until: 100, skills: ['Penance Brand'] }] },
      [{ id: 'until-12', level: 12 }, { id: 'until-28', level: 28 }, { id: 'until-68', level: 68 }],
      (gem) => ({ 'Rolling Magma': 1, 'Flame Wall': 4, 'Penance Brand': 28 })[gem],
    );
    expect(steps[0]?.newSkills).toEqual(['Rolling Magma']);
    expect(steps[0]?.upgrades.map((upgrade) => upgrade.gem)).toEqual(['Flame Wall']);
    expect(steps[1]?.newSkills).toEqual([]);
    // Penance Brand was introduced by the level-28 swap, so the last step has
    // nothing left to say.
    expect(steps[2]?.redundant).toBe(true);
  });
});
