import { describe, expect, it } from 'vitest';
import { measuredSteps, resolveStepAlias, resolveSteps } from './steps.ts';
import type { SeedSteps } from './steps.ts';

const gemLevels: Record<string, number> = {
  Cleave: 1,
  Sunder: 12,
  Boneshatter: 28,
  Brutality: 1,
  Pulverise: 31,
  'Added Fire Damage': 1,
};

const requiredLevel = (gem: string) => gemLevels[gem];

const leveling = (overrides: Partial<SeedSteps['leveling']> = {}): SeedSteps => ({
  leveling: {
    default: { budget: 'early', gemQuality: 0 },
    sub: [
      { id: 'leveling-1-12', level: 12, main: 'Cleave', watch: 'Cleave carries the first acts.', measure: true },
      {
        id: 'leveling-12-28',
        level: 28,
        main: 'Sunder',
        watch: 'Sunder hits harder than Cleave.',
        trigger: { from: 12, skill: 'Sunder' },
        measure: true,
      },
    ],
    ...overrides,
  },
});

const resolve = (steps: SeedSteps) => resolveSteps(steps, { requiredLevel });

describe('step roots', () => {
  it('publishes roots in reading order with a contiguous window', () => {
    const { roots, errors } = resolve({
      ...leveling(),
      maps: {
        sub: [
          {
            id: 'maps-white',
            level: 80,
            main: 'Boneshatter',
            watch: 'White maps.',
            trigger: { from: 28 },
            measure: true,
          },
        ],
      },
    });
    expect(errors).toEqual([]);
    expect(roots.map((root) => root.id)).toEqual(['leveling', 'maps']);
    expect(roots[0]!.sub.map((step) => [step.from, step.level])).toEqual([
      [1, 12],
      [13, 28],
    ]);
    expect(roots[1]!.sub[0]).toMatchObject({ root: 'maps', from: 29, level: 80 });
  });

  it('opens the first step at level 1 even when it is authored later', () => {
    const { roots } = resolve({
      leveling: {
        sub: [{ id: 'leveling-1-20', level: 20, main: 'Cleave', watch: 'Early acts.', measure: true }],
      },
    });
    expect(roots[0]!.sub[0]!.from).toBe(1);
  });

  it('rejects a root with no sub-steps', () => {
    const { errors } = resolve({ leveling: { sub: [] } });
    expect(errors).toContain('steps.leveling: needs at least one sub-step');
  });

  it('rejects a level that does not ascend', () => {
    const { errors } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 28, main: 'Boneshatter', watch: 'Late.', measure: true },
          { id: 'b', level: 28, main: 'Boneshatter', watch: 'Same level.', trigger: { from: 28 }, measure: true },
        ],
      }),
    );
    expect(errors).toContain('steps.leveling.sub[1] (b): level 28 must be after 28');
  });
});

describe('step triggers', () => {
  it('requires a trigger after the first step of a root', () => {
    const { errors } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 12, main: 'Cleave', watch: 'Early.', measure: true },
          { id: 'b', level: 28, main: 'Sunder', watch: 'Later.', measure: true },
        ],
      }),
    );
    expect(errors).toContain(
      'steps.leveling.sub[1] (b): needs a trigger; only the first leveling step takes none',
    );
  });

  it('refuses a trigger on the first leveling step', () => {
    const { errors } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 12, main: 'Cleave', watch: 'Early.', trigger: { from: 1, skill: 'Cleave' }, measure: true },
        ],
      }),
    );
    expect(errors).toContain(
      'steps.leveling.sub[0] (a): the first leveling step opens the character and takes no trigger',
    );
  });

  it('rejects a gap between the previous level and the trigger', () => {
    const { errors } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 12, main: 'Cleave', watch: 'Early.', measure: true },
          { id: 'b', level: 30, main: 'Sunder', watch: 'Later.', trigger: { from: 20 }, measure: true },
        ],
      }),
    );
    expect(errors).toContain(
      "steps.leveling.sub[1] (b): trigger.from must be the previous step's level (12), not 20",
    );
  });

  it('names at most one trigger kind, and allows a level-only boundary', () => {
    const { errors } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 12, main: 'Cleave', watch: 'Early.', measure: true },
          {
            id: 'b',
            level: 28,
            main: 'Sunder',
            watch: 'Later.',
            trigger: { from: 12, skill: 'Sunder', link: 4 },
            measure: true,
          },
        ],
      }),
    );
    expect(errors).toContain(
      'steps.leveling.sub[1] (b): a trigger names at most one of skill, support, link, jewel, slot, budget (found 2)',
    );
  });

  it('accepts a level-only boundary with no trigger kind', () => {
    const { errors } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 12, main: 'Cleave', watch: 'Early.', measure: true },
          { id: 'b', level: 28, main: 'Sunder', watch: 'Later.', trigger: { from: 12 }, measure: true },
        ],
      }),
    );
    expect(errors).toEqual([]);
  });

  it('refuses a trigger gem the character cannot hold yet', () => {
    const { errors } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 12, main: 'Cleave', watch: 'Early.', measure: true },
          { id: 'b', level: 20, main: 'Sunder', watch: 'Later.', trigger: { from: 12, skill: 'Boneshatter' }, measure: true },
        ],
      }),
    );
    expect(errors).toContain(
      'steps.leveling.sub[1] (b): Boneshatter needs level 28, but the step is read at 20',
    );
  });

  it('rejects an unknown slot or budget', () => {
    const { errors } = resolve({
      ...leveling(),
      maps: {
        sub: [
          {
            id: 'maps-white',
            level: 80,
            main: 'Boneshatter',
            watch: 'White maps.',
            trigger: { from: 28, slot: 'weapon' },
            measure: true,
          },
        ],
      },
    });
    expect(errors).toEqual([]);

    const bad = resolveSteps(
      {
        maps: {
          sub: [
            { id: 'm', level: 80, main: 'Boneshatter', watch: 'White maps.', budget: 'nope', measure: true },
          ],
        },
      },
      { requiredLevel, knownBudgets: ['starting', 'early'] },
    );
    expect(bad.errors).toContain('steps.maps.sub[0] (m): unknown budget "nope"');
  });
});

describe('measurement', () => {
  it('requires a reason when a step is not measured', () => {
    const { errors } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 12, main: 'Cleave', watch: 'Early.' },
        ],
      }),
    );
    expect(errors).toContain(
      'steps.leveling.sub[0] (a): an unmeasured step needs a reason (set measure: true to give it a gate)',
    );
  });

  it('accepts an editorial step that says why it is not measured', () => {
    const { roots, errors } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 12, main: 'Cleave', watch: 'Early.', measure: true },
          { id: 'b', level: 28, main: 'Sunder', watch: 'Later.', trigger: { from: 12 }, reason: 'Same gear as the last step.' },
        ],
      }),
    );
    expect(errors).toEqual([]);
    expect(roots[0]!.sub.map((step) => step.measure)).toEqual([true, false]);
    expect(measuredSteps(roots).map((step) => step.id)).toEqual(['a']);
  });

  it('rejects a main skill the step cannot hold', () => {
    const { errors } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 20, main: 'Boneshatter', watch: 'Too early for Boneshatter.', measure: true },
        ],
      }),
    );
    expect(errors).toContain(
      'steps.leveling.sub[0] (a): main skill Boneshatter needs level 28, but the step is read at 20',
    );
  });

  it('returns only the measured steps', () => {
    const { roots } = resolve(
      leveling({
        sub: [
          { id: 'a', level: 12, main: 'Cleave', watch: 'Early.', measure: true },
          { id: 'b', level: 28, main: 'Sunder', watch: 'Later.', trigger: { from: 12 }, reason: 'No gear changes.' },
          {
            id: 'c',
            level: 38,
            main: 'Sunder',
            watch: 'Brutality.',
            trigger: { from: 28, support: 'Brutality' },
            measure: true,
          },
        ],
      }),
    );
    expect(measuredSteps(roots).map((step) => step.id)).toEqual(['a', 'c']);
  });
});

describe('step aliases', () => {
  it('maps a pre-refactor step id onto the step that replaced it', () => {
    const { aliases, errors } = resolve(
      leveling({
        sub: [
          {
            id: 'leveling-1-12',
            level: 12,
            main: 'Cleave',
            watch: 'Early.',
            measure: true,
            aliases: ['until-12'],
          },
          {
            id: 'leveling-12-28',
            level: 28,
            main: 'Sunder',
            watch: 'Later.',
            trigger: { from: 12 },
            measure: true,
            aliases: ['until-28'],
          },
        ],
      }),
    );
    expect(errors).toEqual([]);
    expect(aliases).toEqual({ 'until-12': 'leveling-1-12', 'until-28': 'leveling-12-28' });
    expect(resolveStepAlias(aliases, 'until-28')).toBe('leveling-12-28');
    expect(resolveStepAlias(aliases, 'maps-red')).toBe('maps-red');
  });

  it('rejects an alias that shadows a step id', () => {
    const { errors } = resolve(
      leveling({
        sub: [
          { id: 'leveling-1-12', level: 12, main: 'Cleave', watch: 'Early.', measure: true },
          {
            id: 'leveling-12-28',
            level: 28,
            main: 'Sunder',
            watch: 'Later.',
            trigger: { from: 12 },
            measure: true,
            aliases: ['leveling-1-12'],
          },
        ],
      }),
    );
    expect(errors).toContain(
      'steps.leveling.sub[1] (leveling-12-28): alias "leveling-1-12" is already a step id or alias',
    );
  });
});
