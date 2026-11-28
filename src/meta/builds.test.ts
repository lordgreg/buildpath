import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { getGuidePath, validateProseDigits } from '../core/builds/guide.ts';
import { medalFor } from '../core/builds/ratings.ts';
import { generateFilter } from '../core/filter/generate.ts';
import { validateArchetype } from '../core/archetypes/validate.ts';
import { validateFilter } from '../core/filter/validate.ts';
import { STRICTNESS_ORDER } from '../core/filter/presets.ts';
import { WICKERMAN_SLOTS, WICKERMAN_STEPS } from '../core/builds/types.ts';
import { BUILDS, BUILD_VERSION, getBuildEntry, isBuildId } from './builds.ts';
import { coerceSelection, isValidSelection } from './index.ts';
import { resolveSelection } from './resolve.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const seedsDir = resolve(root, 'src/builds');

const PHASES = ['leveling', 'endgame'] as const;

type TestGem = string | { name: string; maxLevel?: number; note?: string };
interface TestBracket {
  until: number;
  skills?: string[];
  skillGroups?: { slot: string; gems: TestGem[] }[];
  flasks?: { slot: string; name: string; note?: string }[];
}
interface TestStep {
  id: string;
  level: number;
  main: string;
  measure: boolean;
  band?: string;
  gems?: { slot: string; gems: TestGem[] }[];
  flasks?: TestBracket['flasks'];
}

/** A build's steps, measured or not, from either shape. */
function stepsOf(build: unknown): TestStep[] {
  const steps = (build as { steps?: { sub: TestStep[] }[] }).steps;
  return (steps ?? []).flatMap((root) => root.sub ?? []);
}

/**
 * The leveling brackets of a build, from either shape (D32-D37). A measured
 * step is the bracket at its own level, so the "usable by this level" promise
 * is the same one the old brackets made.
 */
function bracketsOf(build: unknown): TestBracket[] {
  const source = build as {
    leveling?: { brackets: TestBracket[] };
    steps?: { sub: TestStep[] }[];
  };
  if (source.leveling) return source.leveling.brackets;
  return stepsOf(source)
    .filter((step) => step.measure)
    .map((step) => ({
      until: step.level,
      skills: [step.main],
      ...(step.gems ? { skillGroups: step.gems } : {}),
      ...(step.flasks ? { flasks: step.flasks } : {}),
    }));
}

describe('compiled build seeds', () => {
  it('compiles every YAML seed, and nothing else', () => {
    const seedIds = readdirSync(seedsDir)
      .filter((name) => name.endsWith('.yaml'))
      .map((name) => {
        const seed = parse(readFileSync(resolve(seedsDir, name), 'utf8')) as {
          id: string;
        };
        expect(`${seed.id}.yaml`, name).toBe(name);
        return seed.id;
      })
      .sort();
    expect(BUILDS.map((build) => build.id).sort()).toEqual(seedIds);
  });

  it('tags every guide with a season and keeps a changelog', () => {
    for (const entry of BUILDS) {
      expect(entry.season?.id, entry.id).toBeTruthy();
      expect(entry.season?.name, entry.id).toBeTruthy();
      expect(
        entry.chips?.some(
          (chip) => chip.kind === 'season' && chip.label === entry.season?.name,
        ),
        `${entry.id} season chip`,
      ).toBe(true);
      const full = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        changelog?: { season: string; seasonName?: string; date: string; notes: string[] }[];
        pros?: { text: string }[];
        cons?: { text: string }[];
      };
      const changelog = full.changelog ?? [];
      expect(changelog.length, `${entry.id} changelog`).toBeGreaterThan(0);
      for (const update of changelog) {
        expect(update.notes.length, `${entry.id} ${update.date}`).toBeGreaterThan(0);
        expect(Number.isNaN(Date.parse(`${update.date}T00:00:00Z`)), update.date).toBe(false);
        for (const note of update.notes) {
          expect(note, `${entry.id} ${update.date} note`).not.toContain('\n');
          expect(note.length, `${entry.id} ${update.date} note`).toBeLessThanOrEqual(180);
        }
      }
      for (const tradeoff of [...(full.pros ?? []), ...(full.cons ?? [])]) {
        expect(tradeoff.text.length, `${entry.id} tradeoff`).toBeLessThanOrEqual(60);
      }
      const newest = changelog.at(-1)!;
      expect(newest.season, `${entry.id} newest season`).toBe(entry.season?.id);
      expect(newest.seasonName, `${entry.id} newest season name`).toBe(entry.season?.name);
    }
  });

  it('gives every guide a Covens Wickerman section', () => {
    for (const entry of BUILDS) {
      const full = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        wickerman?: {
          profile: string;
          steps: Record<string, Record<string, {
            name: string;
            tier: string;
            effect: string;
            source: string;
            area: string;
          }>>;
        };
      };
      expect(full.wickerman, `${entry.id} wickerman`).toBeDefined();
      expect(full.wickerman?.profile, `${entry.id} profile`).toBeTruthy();
      for (const phase of WICKERMAN_STEPS) {
        for (const slot of WICKERMAN_SLOTS) {
          const pick = full.wickerman?.steps[phase]?.[slot];
          expect(pick, `${entry.id} ${phase}/${slot}`).toBeDefined();
          expect(pick?.name, `${entry.id} ${phase}/${slot} name`).toBeTruthy();
          expect(pick?.effect, `${entry.id} ${phase}/${slot} effect`).toBeTruthy();
          expect(pick?.source, `${entry.id} ${phase}/${slot} source`).toBeTruthy();
          expect(pick?.area, `${entry.id} ${phase}/${slot} area`).toBeTruthy();
          expect(
            ['low', 'med', 'high', 'queen', 'fixed', 'uber'],
            `${entry.id} ${phase}/${slot} tier`,
          ).toContain(pick?.tier);
        }
      }
    }
  });

  it('keeps every Viscera profile complete and slot-correct', () => {
    const viscera = parse(
      readFileSync(resolve(seedsDir, 'config/viscera.yaml'), 'utf8'),
    ) as {
      items: { name: string; slot: string; tiers: Record<string, string> }[];
      profiles: Record<string, Record<string, Record<string, { item: string; tier: string }>>>;
    };
    const items = new Map(viscera.items.map((item) => [item.name, item]));
    for (const [profile, steps] of Object.entries(viscera.profiles)) {
      for (const phase of WICKERMAN_STEPS) {
        for (const slot of WICKERMAN_SLOTS) {
          const pick = steps[phase]?.[slot];
          expect(pick, `${profile} ${phase}/${slot}`).toBeDefined();
          const item = items.get(pick.item);
          expect(item, `${profile} ${phase}/${slot} item`).toBeDefined();
          expect(item?.slot, `${profile} ${phase}/${slot} slot`).toBe(slot);
          expect(item?.tiers[pick.tier], `${profile} ${phase}/${slot} tier`).toBeTruthy();
        }
      }
    }
  });

  it('assumes gem quality and Vaal levels only from maps-red', () => {
    for (const entry of BUILDS) {
      const seed = parse(
        readFileSync(resolve(seedsDir, `${entry.id}.yaml`), 'utf8'),
      ) as { gemQualityFrom?: string };
      const full = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        steps?: { sub: TestStep[] }[];
        gates?: Record<string, { gems?: { gems: { name: string; quality?: number }[] }[] }>;
      };
      const bands = new Map(stepsOf(full).map((step) => [step.id, step.band]));
      for (const [checkpoint, gate] of Object.entries(full.gates ?? {})) {
        // The band decides, so a renamed step cannot quietly gain quality.
        const band = bands.get(checkpoint) ?? checkpoint;
        const endgame = band === 'maps-red' || band === 'pinnacle';
        const expected = endgame || seed.gemQualityFrom === 'leveling' ? 20 : 0;
        for (const group of gate.gems ?? []) {
          for (const gem of group.gems) {
            expect(gem.quality ?? 0, `${entry.id} ${checkpoint} ${gem.name}`).toBe(expected);
          }
        }
      }
    }
  });

  it('gives every guide goals, gear targets and crafting at every step', () => {
    const checkpoints = [
      'until-12',
      'until-28',
      'until-68',
      'maps-early',
      'maps-red',
      'pinnacle',
    ];
    for (const entry of BUILDS) {
      const full = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        steps?: { sub: { id: string }[] }[];
        stepPlans?: Record<string, {
          goals: string[];
          lookFor: { slot: string; mods: string[]; note?: string }[];
          crafting?: { slot: string; mods: string[]; note?: string }[];
        }>;
      };
      // A migrated seed gets one plan per sub-step; one that has not keeps the
      // six checkpoint keys the committed JSON has always had.
      const expected = full.steps
        ? full.steps.flatMap((root) => root.sub.map((step) => step.id))
        : checkpoints;
      expect(full.stepPlans, `${entry.id} stepPlans`).toBeDefined();
      expect(Object.keys(full.stepPlans ?? {}).sort(), `${entry.id} steps`).toEqual(
        [...expected].sort(),
      );
      for (const checkpoint of expected) {
        const plan = full.stepPlans?.[checkpoint];
        expect(plan, `${entry.id} ${checkpoint}`).toBeDefined();
        expect(plan?.goals.length, `${entry.id} ${checkpoint} goals`).toBeGreaterThan(0);
        expect(plan?.lookFor.length, `${entry.id} ${checkpoint} lookFor`).toBeGreaterThan(0);
        for (const item of [...(plan?.lookFor ?? []), ...(plan?.crafting ?? [])]) {
          expect(item.slot, `${entry.id} ${checkpoint} slot`).toBeTruthy();
          expect(item.mods.length, `${entry.id} ${checkpoint} mods`).toBeGreaterThan(0);
          for (const mod of item.mods) {
            expect(mod.trim().length, `${entry.id} ${checkpoint} mod`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('keeps every step-plan profile complete', () => {
    const config = parse(
      readFileSync(resolve(seedsDir, 'config/step-plans.yaml'), 'utf8'),
    ) as {
      profiles: Record<string, Record<string, {
        goals: string[];
        lookFor: { slot: string; mods: string[] }[];
        crafting?: { slot: string; mods: string[] }[];
      }>>;
    };
    for (const [profile, plan] of Object.entries(config.profiles)) {
      for (const checkpoint of [
        'until-12',
        'until-28',
        'until-68',
        'maps-early',
        'maps-red',
        'pinnacle',
      ]) {
        const step = plan[checkpoint];
        expect(step, `${profile} ${checkpoint}`).toBeDefined();
        expect(step.goals.length, `${profile} ${checkpoint} goals`).toBeGreaterThan(0);
        expect(step.lookFor.length, `${profile} ${checkpoint} lookFor`).toBeGreaterThan(0);
        for (const item of [...(step.lookFor ?? []), ...(step.crafting ?? [])]) {
          expect(item.slot, `${profile} ${checkpoint} slot`).toBeTruthy();
          expect(item.mods.length, `${profile} ${checkpoint} mods`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps the committed index in step with the seeds', () => {
    // The drift guard: a committed index that no longer matches the seeds means
    // someone edited YAML without running `npm run builds:build`.
    const committed = JSON.parse(
      readFileSync(resolve(root, 'src/generated/builds/index.json'), 'utf8'),
    ) as { version: string; builds: { id: string; seedHash: string }[] };
    expect(committed.version).toBe(BUILD_VERSION);
    expect(committed.builds.map((build) => build.id).sort()).toEqual(
      BUILDS.map((build) => build.id).sort(),
    );
    for (const build of BUILDS) {
      const seed = parse(
        readFileSync(resolve(seedsDir, `${build.id}.yaml`), 'utf8'),
      ) as Record<string, unknown>;
      const full = JSON.parse(
        readFileSync(
          resolve(root, `src/generated/builds/${build.id}.json`),
          'utf8',
        ),
      ) as Record<string, unknown>;
      expect(full.seedHash, build.id).toBe(build.seedHash);
      expect(full.id, build.id).toBe(seed.id);
    }
  });

  it('ships each checkpoint result in the index for the catalogue page', () => {
    // `builds.html` must not fetch three detail files to draw three cards.
    const committed = JSON.parse(
      readFileSync(resolve(root, 'src/generated/builds/index.json'), 'utf8'),
    ) as {
      builds: {
        id: string;
        gateSteps?: { id: string; pass: boolean; level: number; dps: number }[];
      }[];
    };
    for (const entry of committed.builds) {
      const full = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        steps?: { sub: TestStep[] }[];
        gates?: Record<string, { pass: boolean; level: number; metrics: { dps: number } }>;
      };
      if (!full.gates) {
        expect(entry.gateSteps, entry.id).toBeUndefined();
        continue;
      }
      // The band travels with the index step so the catalogue never matches on
      // a seed-chosen id.
      const bands = new Map(stepsOf(full).map((step) => [step.id, step.band]));
      expect(entry.gateSteps, entry.id).toEqual(
        Object.entries(full.gates).map(([id, gate]) => ({
          id,
          pass: gate.pass,
          level: gate.level,
          dps: gate.metrics.dps,
          ...(bands.get(id) ? { band: bands.get(id) } : {}),
        })),
      );
    }
  });

  it('gives every build a main skill the site knows', () => {
    for (const build of BUILDS) {
      expect(build.mainSkill.trim(), build.id).not.toBe('');
      expect(build.summary.length, build.id).toBeGreaterThanOrEqual(20);
    }
  });

  it('rejects a second seed for the same skill and ascendancy', () => {
    const pairs = BUILDS.map(
      (build) => `${build.mainSkill.toLowerCase()}|${build.ascendancyId}`,
    );
    expect(new Set(pairs).size).toBe(pairs.length);
  });
});

describe('published build data', () => {
  const compiled = BUILDS.map(
    (entry) =>
      JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        id: string;
        class: string;
        leveling: {
          swaps?: {
            gem: string;
            fromLevel: number;
            untilLevel?: number;
            replaces?: string;
            kind?: 'skill' | 'support';
            note?: string;
          }[];
          brackets: {
            until: number;
            skills: string[];
            skillGroups?: {
              slot: string;
              gems: (string | { name: string; maxLevel?: number; note?: string })[];
            }[];
            flasks?: { name: string; slot: string }[];
          }[];
        };
        gates?: Record<
          string,
          {
            pass: boolean;
            level: number;
            metrics: { dps: number; life: number; resists: number[] };
            failures: string[];
            tree?: { nodes: { id: number; x: number; y: number }[]; edges: [number, number][]; notables: string[] };
            gear?: { slot: string; base: string; mods: string[]; ilvl: number }[];
            gems?: {
              slot: string;
              gems: { name: string; level: number; maxLevel?: number }[];
            }[];
          }
        >;
        gemInfo?: Record<
          string,
          {
            requiredLevel?: number;
            source?: { kind: string; act: number | null; quest: string | null };
            color?: string | null;
            description?: string | null;
            effect?: string[];
            tags?: string[];
            qualityWorth?: string;
            qualityEffect?: string;
          }
        >;
        pros?: { text: string; weight: number }[];
        cons?: { text: string; weight: number }[];
        status: string;
      },
  );

  it('gives every build at least five weighted pros and cons', () => {
    for (const build of compiled) {
      expect(build.pros?.length ?? 0, 'pros').toBeGreaterThanOrEqual(5);
      expect(build.cons?.length ?? 0, 'cons').toBeGreaterThanOrEqual(5);
      for (const entry of [...(build.pros ?? []), ...(build.cons ?? [])]) {
        expect(entry.text.trim().length, entry.text).toBeGreaterThan(7);
        expect(entry.weight, entry.text).toBeGreaterThanOrEqual(1);
        expect(entry.weight, entry.text).toBeLessThanOrEqual(3);
      }
    }
  });

  it('gives every leveling bracket a gear slot and at least one gem', () => {
    for (const build of compiled) {
      expect(bracketsOf(build).length).toBeGreaterThan(0);
      for (const bracket of bracketsOf(build)) {
        const groups = bracket.skillGroups ?? [];
        expect(groups.length, `until ${bracket.until}`).toBeGreaterThan(0);
        for (const group of groups) {
          expect(group.slot.trim(), group.slot).not.toBe('');
          expect(group.gems.length, group.slot).toBeGreaterThan(0);
        }
        const slots = groups.map((group) => group.slot);
        expect(new Set(slots).size, 'one group per slot').toBe(slots.length);
      }
    }
  });

  it('lists realistic flasks for every leveling bracket', () => {
    for (const build of compiled) {
      for (const bracket of bracketsOf(build)) {
        const flasks = bracket.flasks ?? [];
        expect(flasks.length, `until ${bracket.until}`).toBeGreaterThan(0);
        // A build needs a life flask at every step; utility flasks are optional.
        expect(flasks.some((flask) => flask.slot === 'life'), `until ${bracket.until}`).toBe(true);
      }
    }
  });

  it('carries Eldritch implicits on the endgame armour', () => {
    for (const build of compiled) {
      for (const checkpoint of ['maps-red', 'pinnacle']) {
        const gate = build.gates?.[checkpoint];
        if (!gate?.gear) continue;
        for (const slot of ['Body Armour', 'Helmet', 'Gloves', 'Boots']) {
          const item = gate.gear.find((entry) => entry.slot === slot);
          expect(item, `${build.class}/${checkpoint}/${slot}`).toBeDefined();
          const implicits = (item as { implicits?: { currency: string; mod: string }[] })
            .implicits;
          expect(implicits?.length, `${build.class}/${checkpoint}/${slot}`).toBe(2);
          for (const implicit of implicits ?? []) {
            expect(['ember', 'ichor']).toContain(implicit.currency);
            expect(implicit.mod.trim().length).toBeGreaterThan(3);
          }
        }
      }
    }
  });

  it('gives every gem group the gear slot it references', () => {
    for (const build of compiled) {
      for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
        const slots = new Set((gate.gear ?? []).map((item) => item.slot));
        for (const group of gate.gems ?? []) {
          // PoB calls a shield or quiver Weapon 2; the guide's gem table keeps
          // the friendlier "Shield" label.
          const expected = group.slot === 'Shield' ? 'Weapon 2' : group.slot;
          expect(slots.has(expected), `${checkpoint}: ${group.slot} has no gear`).toBe(true);
        }
      }
    }
  });

  it('carries a tree view and named failures for every measured checkpoint', () => {
    for (const build of compiled) {
      if (!build.gates) continue;
      for (const [checkpoint, gate] of Object.entries(build.gates)) {
        expect(gate.pass, checkpoint).toBe(gate.failures.length === 0);
        // Level 12 has a dozen points; later steps have far more.
        expect(gate.tree?.nodes.length ?? 0, checkpoint).toBeGreaterThan(5);
        // The guide shows the gear and gems the gate was measured against.
        expect(gate.gear?.length ?? 0, checkpoint).toBeGreaterThan(5);
        for (const item of gate.gear ?? []) {
          expect(item.base.trim(), item.slot).not.toBe('');
          expect(item.mods.length, item.slot).toBeGreaterThan(0);
        }
        expect(gate.gems?.length ?? 0, checkpoint).toBeGreaterThan(0);
        for (const group of gate.gems ?? []) {
          expect(group.gems.length, group.slot).toBeGreaterThan(0);
          expect(group.gems[0]!.level, group.slot).toBeGreaterThan(0);
        }
        // Edges may only join nodes that are in the view.
        const ids = new Set((gate.tree?.nodes ?? []).map((node) => node.id));
        for (const [from, to] of gate.tree?.edges ?? []) {
          expect(ids.has(from) && ids.has(to), `${checkpoint} edge`).toBe(true);
        }
      }
    }
  });

  it('draws every gate tree as one connected constellation', () => {
    for (const build of compiled) {
      for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
        const nodes = gate.tree?.nodes ?? [];
        const edges = gate.tree?.edges ?? [];
        if (nodes.length < 2) continue;
        const parent = new Map(nodes.map((node) => [node.id, node.id]));
        const find = (id: number): number => {
          let root = id;
          while (parent.get(root) !== root) root = parent.get(root)!;
          while (parent.get(id) !== root) {
            const next = parent.get(id)!;
            parent.set(id, root);
            id = next;
          }
          return root;
        };
        for (const [from, to] of edges) {
          const a = find(from);
          const b = find(to);
          if (a !== b) parent.set(a, b);
        }
        const roots = new Set(nodes.map((node) => find(node.id)));
        expect(
          roots.size,
          `${checkpoint}: ${nodes.length} nodes, ${edges.length} edges`,
        ).toBe(1);
      }
    }
  });

  it('explains what every displayed gem does', () => {
    for (const build of compiled) {
      const info = build.gemInfo ?? {};
      for (const bracket of bracketsOf(build)) {
        for (const group of bracket.skillGroups ?? []) {
          for (const gem of group.gems) {
            const name = typeof gem === 'string' ? gem : gem.name;
            const entry = info[name];
            expect(entry, `${build.class}: ${name}`).toBeDefined();
            expect(
              Boolean(entry?.description) || (entry?.effect?.length ?? 0) > 0,
              `${build.class}: ${name} has no description or effect`,
            ).toBe(true);
            expect(['recommended', 'optional', 'none']).toContain(entry?.qualityWorth);
            if (entry?.qualityWorth !== 'none') {
              expect(entry?.qualityEffect?.trim().length, `${name} quality`).toBeGreaterThan(1);
            }
          }
        }
      }
    }
  });

  it('keeps leveling swaps legal and tied to the build', () => {
    const gemLevels = JSON.parse(
      readFileSync(resolve(root, 'src/generated/gem-levels.json'), 'utf8'),
    ).gems as Record<string, { levels: Record<string, number> }>;
    for (const build of compiled) {
      for (const swap of build.leveling?.swaps ?? []) {
        const entry = gemLevels[swap.gem];
        expect(entry, `${build.class}: unknown swap gem "${swap.gem}"`).toBeDefined();
        expect(
          swap.fromLevel,
          `${build.class}: ${swap.gem} needs level ${entry!.levels['1']}, swapped at ${swap.fromLevel}`,
        ).toBeGreaterThanOrEqual(entry!.levels['1']);
        expect(
          bracketsOf(build).some((bracket) => bracket.until >= swap.fromLevel),
          `${build.class}: ${swap.gem} starts after the last bracket`,
        ).toBe(true);
        if (swap.untilLevel !== undefined) {
          expect(swap.untilLevel, `${build.class}: ${swap.gem} swap order`).toBeGreaterThan(
            swap.fromLevel,
          );
          expect(swap.untilLevel).toBeLessThanOrEqual(100);
        }
        if (swap.replaces) {
          const listed = bracketsOf(build).some(
            (bracket) =>
              (bracket.skills ?? []).includes(swap.replaces!) ||
              (bracket.skillGroups ?? []).some((group) =>
                group.gems.some(
                  (gem) => (typeof gem === 'string' ? gem : gem.name) === swap.replaces,
                ),
              ),
          );
          expect(
            listed,
            `${build.class}: ${swap.gem} replaces "${swap.replaces}", which the build never lists`,
          ).toBe(true);
        }
      }
    }
  });

  it('tells Boneshatter players to stay on Sunder until Brutality is in the link', () => {
    const build = compiled.find((entry) => entry.id === 'boneshatter-juggernaut');
    expect(build, 'boneshatter-juggernaut').toBeDefined();
    const steps = stepsOf(build!);
    // Boneshatter unlocks at 28, but the swap waits for Brutality at 38: the
    // 28-38 step is the Sunder stretch, and the next step (read at 68) opens
    // with the Boneshatter swap at 39.
    const sunders = steps.filter((step) => step.main === 'Sunder');
    expect(sunders.map((step) => step.level), 'Sunder owns the 28 and 38 steps').toEqual([
      28, 38,
    ]);
    const next = steps[steps.indexOf(sunders.at(-1)!) + 1];
    expect(next?.main, 'the step after the Sunder stretch').toBe('Boneshatter');
    expect(next?.id).toBe('leveling-38-68');
  });

  it('tells Boneshatter players the 4-link support progression', () => {
    const build = compiled.find((entry) => entry.id === 'boneshatter-juggernaut');
    expect(build, 'boneshatter-juggernaut').toBeDefined();
    const steps = stepsOf(build!);
    const bodyOf = (id: string) =>
      (steps.find((step) => step.id === id)?.gems ?? [])
        .find((group) => group.slot === 'Body Armour')!
        .gems.map((gem) => (typeof gem === 'string' ? gem : gem.name));

    // The rough patch: stay on the Sunder four-link, no Brutality yet.
    // Mana Leech replaces Faster Attacks so the step does not need a flask.
    expect(bodyOf('leveling-28-38')).toEqual([
      'Sunder',
      'Melee Physical Damage',
      'Added Fire Damage',
      'Mana Leech',
    ]);
    // The payoff: Boneshatter with Brutality, then Pulverise as the fifth link.
    expect(bodyOf('leveling-38-68')).toEqual(
      expect.arrayContaining(['Boneshatter', 'Brutality', 'Pulverise']),
    );
  });

  it('names a colour for every gem the guide shows', () => {
    for (const build of compiled) {
      const info = build.gemInfo ?? {};
      for (const bracket of bracketsOf(build)) {
        for (const group of bracket.skillGroups ?? []) {
          for (const gem of group.gems) {
            const name = typeof gem === 'string' ? gem : gem.name;
            expect(info[name]?.color, `${build.class}: ${name} has no colour`).toBeTruthy();
          }
        }
      }
    }
  });

  it('describes and colours every gem named by a leveling swap', () => {
    for (const build of compiled) {
      for (const swap of build.leveling?.swaps ?? []) {
        for (const name of [swap.gem, swap.replaces].filter(
          (entry): entry is string => Boolean(entry),
        )) {
          const entry = build.gemInfo?.[name];
          expect(entry, `${build.class}: ${name}`).toBeDefined();
          expect(entry?.color, `${build.class}: ${name} has no colour`).toBeTruthy();
          expect(
            Boolean(entry?.description) || (entry?.effect?.length ?? 0) > 0,
            `${build.class}: ${name} has no description or effect`,
          ).toBe(true);
        }
      }
    }
  });

  it('caps gems the seed says must not be levelled', () => {
    for (const build of compiled) {
      for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
        for (const group of gate.gems ?? []) {
          for (const gem of group.gems) {
            if (gem.maxLevel === undefined) continue;
            expect(gem.level, `${checkpoint} ${gem.name}`).toBeLessThanOrEqual(gem.maxLevel);
          }
        }
      }
    }
  });

  it('publishes a build as verified only when it passes everything', () => {
    for (const build of compiled) {
      if (build.status !== 'verified') continue;
      for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
        expect(gate.pass, `${build.status} ${checkpoint}`).toBe(true);
      }
    }
  });
});

describe('leveling tree derivation', () => {
  const compiled = BUILDS.map(
    (entry) =>
      JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        id: string;
        tree?: { endgame: number[]; checkpoints: Record<string, number[]> };
        gates?: Record<
          string,
          {
            tree?: { nodes: { id: number }[]; edges: [number, number][]; start?: number };
          }
        >;
      },
  );

  it('makes every checkpoint a subset of the endgame tree', () => {
    for (const build of compiled) {
      expect(build.tree, `${build.id} has no derived tree`).toBeDefined();
      const endgame = new Set(build.tree!.endgame);
      for (const [checkpoint, nodes] of Object.entries(build.tree!.checkpoints)) {
        for (const id of nodes) {
          expect(endgame.has(id), `${build.id}/${checkpoint}: node ${id} is not in endgame`).toBe(
            true,
          );
        }
        const reported = (build.gates?.[checkpoint]?.tree?.nodes ?? []).map((node) => node.id);
        expect([...nodes].sort((a, b) => a - b), `${build.id}/${checkpoint}`).toEqual(
          reported.sort((a, b) => a - b),
        );
      }
    }
  });

  it('pins every required jewel to a socket in the checkpoint tree', () => {
    for (const build of compiled) {
      for (const [checkpoint, nodes] of Object.entries(build.tree!.checkpoints)) {
        const tree = (build.gates?.[checkpoint]?.tree ?? {}) as {
          nodes: { id: number }[];
          jewels?: { node: number; label: string; base: string }[];
        };
        const ids = new Set(tree.nodes.map((node) => node.id));
        for (const jewel of tree.jewels ?? []) {
          expect(ids.has(jewel.node), `${build.id}/${checkpoint}: ${jewel.label}`).toBe(true);
          expect(jewel.base.trim(), `${build.id}/${checkpoint}: ${jewel.label}`).not.toBe('');
        }
        const gearJewels = (build.gates?.[checkpoint] as { gear?: { slot: string }[] })?.gear ?? [];
        expect(tree.jewels?.length ?? 0).toBe(
          gearJewels.filter((item) => item.slot.startsWith('Jewel')).length,
        );
        expect(nodes.length).toBeGreaterThan(0);
      }
    }
  });

  it('draws every checkpoint as a valid order from the class start', () => {
    for (const build of compiled) {
      for (const [checkpoint, nodes] of Object.entries(build.tree!.checkpoints)) {
        const tree = build.gates?.[checkpoint]?.tree;
        expect(tree?.start, `${build.id}/${checkpoint} has no start node`).toBeDefined();
        const edges = new Map<number, number[]>();
        for (const [from, to] of tree!.edges) {
          edges.set(from, [...(edges.get(from) ?? []), to]);
          edges.set(to, [...(edges.get(to) ?? []), from]);
        }
        const seen = new Set<number>([tree!.start!]);
        const queue = [tree!.start!];
        while (queue.length > 0) {
          const id = queue.shift()!;
          for (const next of edges.get(id) ?? []) {
            if (!seen.has(next)) {
              seen.add(next);
              queue.push(next);
            }
          }
        }
        expect(seen.size, `${build.id}/${checkpoint}: ${seen.size} of ${nodes.length}`).toBe(
          nodes.length,
        );
      }
    }
  });
});

describe('pantheon and bandit registry', () => {
  const pantheon = JSON.parse(
    readFileSync(resolve(root, 'src/generated/pantheon.json'), 'utf8'),
  ) as {
    major: Record<string, { name: string; effect: string }>;
    minor: Record<string, { name: string; effect: string }>;
    bandits: Record<string, { name: string; effect: string }>;
  };
  const compiled = BUILDS.map(
    (entry) =>
      JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        id: string;
        pantheon: { major: string; minor: string; note?: string };
        bandit: string;
      },
  );

  it('resolves every build choice to a reviewed god and bandit', () => {
    for (const build of compiled) {
      expect(pantheon.major[build.pantheon.major], `${build.id} major`).toBeDefined();
      expect(pantheon.minor[build.pantheon.minor], `${build.id} minor`).toBeDefined();
      expect(pantheon.bandits[build.bandit], `${build.id} bandit`).toBeDefined();
    }
    for (const entry of [
      ...Object.values(pantheon.major),
      ...Object.values(pantheon.minor),
      ...Object.values(pantheon.bandits),
    ]) {
      expect(entry.name.trim().length).toBeGreaterThan(2);
      expect(entry.effect.trim().length).toBeGreaterThan(8);
    }
  });
});

describe('full ascendancy graph', () => {
  const table = JSON.parse(
    readFileSync(resolve(root, 'src/generated/ascendancies-full.json'), 'utf8'),
  ) as {
    ascendancies: Record<
      string,
      { name: string; class: string; nodes: { id: string; notable: boolean; effect: string[] }[] }
    >;
  };
  const compiled = BUILDS.map(
    (entry) =>
      JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        id: string;
        ascendancyId: string;
        class: string;
        ascendancyOrder: { node: string; lab: number }[];
      },
  );

  it('shows every node of the build ascendancy and lights a real choice', () => {
    for (const build of compiled) {
      const asc = table.ascendancies[build.ascendancyId];
      expect(asc, build.id).toBeDefined();
      expect(asc.class, build.id).toBe(build.class);
      expect(asc.nodes.length, build.id).toBeGreaterThanOrEqual(10);
      expect(asc.nodes.filter((node) => node.notable).length, build.id).toBeGreaterThanOrEqual(7);
      const ids = new Set(asc.nodes.map((node) => node.id));
      for (const point of build.ascendancyOrder) {
        expect(ids.has(point.node), `${build.id}: ${point.node}`).toBe(true);
      }
      for (const node of asc.nodes) {
        expect(node.effect.length, `${build.id}: ${node.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('labs and ascendancy points', () => {
  const compiled = BUILDS.map(
    (entry) =>
      JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        id: string;
        ascendancyOrder: { node: string; lab: number }[];
        gates?: Record<string, { level: number }>;
      },
  );
  const checkpointConfig = parse(
    readFileSync(resolve(root, 'src/builds/config/checkpoints.yaml'), 'utf8'),
  ) as { checkpoints: Record<string, { labs: number }> };

  it('gives every ascendancy node one lab and never assumes points early', () => {
    for (const build of compiled) {
      const nodes = build.ascendancyOrder.map((point) => point.node);
      expect(new Set(nodes).size, build.id).toBe(nodes.length);
      for (const point of build.ascendancyOrder) {
        expect(point.lab, `${build.id}/${point.node}`).toBeGreaterThanOrEqual(1);
        expect(point.lab, `${build.id}/${point.node}`).toBeLessThanOrEqual(4);
      }
      for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
        const labs = checkpointConfig.checkpoints[checkpoint]?.labs ?? 0;
        const assumed = build.ascendancyOrder.filter((point) => point.lab <= labs).length;
        expect(assumed, `${build.id}/${checkpoint} at level ${gate.level}`).toBeLessThanOrEqual(
          labs * 2,
        );
        // A level-28 character cannot have finished the level-33 normal lab.
        if (gate.level < 33) expect(labs, `${build.id}/${checkpoint}`).toBe(0);
      }
    }
  });
});

describe('bounded repair', () => {
  const compiled = BUILDS.map(
    (entry) =>
      JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        id: string;
        gates?: Record<
          string,
          {
            repair?: {
              added: number[];
              removed: number[];
              evals: number;
              nodeDelta: number;
              status: string;
            };
          }
        >;
      },
  );

  it('records a bounded, reproducible repair decision at every checkpoint', () => {
    for (const build of compiled) {
      for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
        expect(gate.repair, `${build.id}/${checkpoint}`).toBeDefined();
        expect(gate.repair!.evals, `${build.id}/${checkpoint}`).toBeGreaterThan(0);
        expect(gate.repair!.evals, `${build.id}/${checkpoint}`).toBeLessThanOrEqual(200);
        expect(gate.repair!.nodeDelta, `${build.id}/${checkpoint}`).toBeGreaterThanOrEqual(0);
        expect(gate.repair!.nodeDelta, `${build.id}/${checkpoint}`).toBeLessThanOrEqual(10);
        expect(gate.repair!.status, `${build.id}/${checkpoint}`).toBe('within-bound');
      }
    }
  });
});

describe('patch staleness', () => {
  const facts = JSON.parse(
    readFileSync(resolve(root, 'src/generated/patch-facts.json'), 'utf8'),
  ) as { patchHash: string; patch: string; pobRef: string };

  it('keeps every published build on the current patch fact set', () => {
    for (const entry of BUILDS) {
      const build = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        id: string;
        status: string;
        patch?: string;
        stale?: unknown;
        pipeline?: { patchHash?: string; pobRef?: string };
      };
      expect(build.pipeline?.patchHash, build.id).toBe(facts.patchHash);
      expect(build.pipeline?.pobRef, build.id).toBe(facts.pobRef);
      expect(build.patch, build.id).toBe(facts.patch);
      expect(build.status, build.id).toBe('verified');
      expect(build.stale, build.id).toBeUndefined();
    }
  });

  it('exposes the fact set the next PoB bump will be compared against', () => {
    expect(facts.patchHash.length).toBe(16);
    expect(facts.patch).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('guide prose', () => {
  const compiled = BUILDS.map(
    (entry) =>
      JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        id: string;
        guide?: Record<
          string,
          {
            text: string;
            status: string;
            facts: string[];
            factsHash: string;
            signed: { by: string; at: string } | null;
          }
        >;
      },
  );

  function factsHash(build: unknown, facts: string[]): string {
    const declared = [...facts].sort().map((path) => {
      const value = getGuidePath(build, path);
      return [path, value];
    });
    return createHash('sha256').update(JSON.stringify(declared)).digest('hex').slice(0, 16);
  }

  it('resolves, hashes and signs every published guide section', () => {
    for (const build of compiled) {
      expect(build.guide, `${build.id} has no guide`).toBeDefined();
      for (const id of ['summary', 'leveling', 'maps', 'bossing']) {
        const section = build.guide![id];
        expect(section, `${build.id}/${id}`).toBeDefined();
        expect(section.text, `${build.id}/${id} placeholder`).not.toContain('{{');
        expect(section.factsHash, `${build.id}/${id}`).toBe(factsHash(build, section.facts));
        expect(section.factsHash.length, `${build.id}/${id}`).toBe(16);
      }
      expect(['signed', 'auto-breadth']).toContain(build.guide!.summary.status);
      if (build.guide!.summary.status === 'signed') {
        expect(build.guide!.summary.signed?.by, build.id).toBeTruthy();
      }
    }
  });

  it('keeps raw prose free of numbers outside the closed token set', () => {
    for (const entry of BUILDS) {
      const seed = parse(
        readFileSync(resolve(root, `src/builds/${entry.id}.yaml`), 'utf8'),
      ) as { guide: Record<string, { text: string }> };
      for (const [id, section] of Object.entries(seed.guide)) {
        expect(validateProseDigits(section.text), `${entry.id}/${id}`).toEqual([]);
      }
    }
  });
});

describe('build ratings and medal', () => {
  it('carries four 1–10 ratings and a derived medal', () => {
    for (const entry of BUILDS) {
      expect(entry.ratings, entry.id).toBeDefined();
      for (const value of Object.values(entry.ratings!)) {
        expect(value, entry.id).toBeGreaterThanOrEqual(1);
        expect(value, entry.id).toBeLessThanOrEqual(10);
      }
      expect(entry.medal, entry.id).toBe(medalFor(entry.ratings!));
    }
  });
});

describe('catalogue chips', () => {
  for (const entry of BUILDS) {
    it(`${entry.id} chips describe the build, not the same ladder`, () => {
      expect(entry.chips?.length, entry.id).toBeGreaterThanOrEqual(2);
      expect(entry.chips?.some((chip) => chip.kind === 'ssf'), entry.id).toBe(true);
      expect(entry.chips?.some((chip) => chip.kind === 'playstyle'), entry.id).toBe(true);
      const labels = entry.chips?.map((chip) => chip.label) ?? [];
      expect(new Set(labels).size, entry.id).toBe(labels.length);

      const build = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        steps?: { sub: TestStep[] }[];
        gates?: Record<
          string,
          { pass: boolean; metrics: { maxHit: number; ehp: number; chaosResist: number } }
        >;
      };
      const gateForBand = (band: string) =>
        build.gates?.[band] ??
        build.gates?.[
          stepsOf(build).find((step) => step.measure && step.band === band)?.id ?? ''
        ];
      const red = gateForBand('maps-red');
      const pinnacle = gateForBand('pinnacle');
      const measuredHc =
        Boolean(red?.pass && pinnacle?.pass) &&
        red!.metrics.maxHit >= 10000 &&
        pinnacle!.metrics.maxHit >= 10000 &&
        red!.metrics.ehp >= 25000 &&
        pinnacle!.metrics.ehp >= 30000 &&
        pinnacle!.metrics.chaosResist >= 75;
      expect(labels.includes('Hardcore'), `${entry.id} Hardcore`).toBe(measuredHc);
      expect(labels.includes('Boss killer'), `${entry.id} Boss killer`).toBe(
        (entry.ratings?.singleTarget ?? 0) >= 9,
      );
      expect(labels.includes('Totems'), `${entry.id} Totems`).toBe(
        /\btotems?\b/i.test(`${entry.name} ${entry.mainSkill}`),
      );
    });
  }
});

describe('gear jewel affixes', () => {
  it('uses only jewel-scoped affixes on jewels', () => {
    const affixes = parse(
      readFileSync(resolve(seedsDir, 'gear/affixes.yaml'), 'utf8'),
    ) as Record<string, { mod: string }>;
    const profiles = parse(
      readFileSync(resolve(seedsDir, 'gear/profiles.yaml'), 'utf8'),
    ) as {
      profiles: Record<
        string,
        Record<string, { jewels?: { affixes?: string[] } }>
      >;
    };
    for (const [profile, budgets] of Object.entries(profiles.profiles)) {
      for (const [budget, def] of Object.entries(budgets)) {
        for (const key of def.jewels?.affixes ?? []) {
          expect(key.endsWith('-jewel'), `${profile}/${budget}: ${key}`).toBe(true);
          expect(affixes[key], `${profile}/${budget}: ${key}`).toBeDefined();
        }
      }
    }
  });
});

describe('gem level caps', () => {
  it('caps Awakened and exceptional supports at their game levels', () => {
    const files = readdirSync(seedsDir).filter((name) => name.endsWith('.yaml'));
    for (const file of files) {
      const seed = parse(readFileSync(resolve(seedsDir, file), 'utf8')) as {
        id: string;
        leveling?: {
          brackets: Array<{
            skillGroups?: Array<{
              gems: Array<string | { name: string; maxLevel?: number }>;
            }>;
          }>;
        };
      };
      // A seed that declares `steps` lists its gems there; the cap is checked
      // per bracket only while a seed still has brackets.
      for (const bracket of seed.leveling?.brackets ?? []) {
        for (const group of bracket.skillGroups ?? []) {
          for (const gem of group.gems) {
            const name = typeof gem === 'string' ? gem : gem.name;
            const awakened = name.startsWith('Awakened ');
            const exceptional =
              name === 'Empower' || name === 'Enhance' || name === 'Enlighten';
            if (!awakened && !exceptional) continue;
            const cap = awakened
              ? name === 'Awakened Empower' ||
                name === 'Awakened Enhance' ||
                name === 'Awakened Enlighten'
                ? 4
                : 5
              : 3;
            const maxLevel = typeof gem === 'string' ? undefined : gem.maxLevel;
            expect(maxLevel, `${seed.id}: ${name}`).toBeDefined();
            expect(maxLevel!, `${seed.id}: ${name}`).toBeLessThanOrEqual(cap);
          }
        }
      }
    }
  });
});

describe('gate calibration', () => {
  const calibration = JSON.parse(
    readFileSync(resolve(root, 'src/generated/builds/calibration.json'), 'utf8'),
  ) as {
    gatesHash: string;
    verified: boolean;
    mustPass: { id: string; pass: boolean }[];
    mustFail: {
      id: string;
      pass: boolean;
      expectedFailures: string[];
      causedByExpectedDefect: boolean;
    }[];
    uniqueProbe: { id: string; parsedMods: number; ablationDrop: number | null }[];
  };
  const gateConfig = parse(
    readFileSync(resolve(root, 'scripts/builds/gates.yaml'), 'utf8'),
  ) as {
    calibrated: boolean;
    resistanceFloor: number;
    checkpoints: Record<string, unknown>;
    profiles?: Record<string, unknown>;
  };
  const checkpointConfig = parse(
    readFileSync(resolve(root, 'src/builds/config/checkpoints.yaml'), 'utf8'),
  ) as Record<string, unknown>;

  it('publishes a green report for the current thresholds', () => {
    const hash = createHash('sha256')
      .update(
        JSON.stringify({
          resistanceFloor: gateConfig.resistanceFloor,
          checkpoints: gateConfig.checkpoints,
          profiles: gateConfig.profiles ?? {},
          checkpointConfig,
        }),
      )
      .digest('hex')
      .slice(0, 12);
    expect(calibration.gatesHash).toBe(hash);
    expect(calibration.verified).toBe(true);
    expect(gateConfig.calibrated).toBe(true);
  });

  it('proves the gates in both directions', () => {
    expect(calibration.mustPass.length).toBeGreaterThanOrEqual(10);
    expect(calibration.mustFail.length).toBeGreaterThanOrEqual(10);
    expect(calibration.mustPass.filter((entry) => !entry.pass)).toEqual([]);
    expect(calibration.mustFail.filter((entry) => entry.pass)).toEqual([]);
    for (const entry of calibration.mustFail) {
      expect(entry.causedByExpectedDefect, entry.id).toBe(true);
      expect(entry.expectedFailures.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('proves leave-one-out ablation resolves a real unique', () => {
    expect(calibration.uniqueProbe.length).toBeGreaterThanOrEqual(1);
    for (const entry of calibration.uniqueProbe) {
      expect(entry.parsedMods, entry.id).toBeGreaterThan(0);
      expect(entry.ablationDrop, entry.id).not.toBeNull();
    }
  });

  it('marks every published build calibrated from that report', () => {
    for (const entry of BUILDS) {
      const build = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as { pipeline?: { calibrated: boolean } };
      expect(build.pipeline?.calibrated, entry.id).toBe(true);
    }
  });
});

describe('build mode', () => {
  it('coerces to a known build and keeps its ascendancy and family', () => {
    const selection = coerceSelection({ mode: 'build' });
    expect(selection.mode).toBe('build');
    expect(isBuildId(selection.buildId)).toBe(true);
    const entry = getBuildEntry(selection.buildId!)!;
    expect(selection.ascendancyId).toBe(entry.ascendancyId);
    expect(selection.familyId).toBe(entry.family);
  });

  it('rejects an unknown build id', () => {
    expect(
      isValidSelection({ mode: 'build', buildId: 'not-a-build' }),
    ).toBe(false);
  });

  it('applies each seed filter slot over the ascendancy defaults (D15)', () => {
    for (const entry of BUILDS) {
      const full = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as { filter?: { slots: Record<string, { itemClasses: string[] } | null> } };
      if (!full.filter?.slots) continue;
      const archetype = resolveSelection({ mode: 'build', buildId: entry.id });
      for (const [slot, spec] of Object.entries(full.filter.slots)) {
        const key = slot as keyof typeof archetype.slots;
        if (spec === null) {
          // A two-handed build has no offhand to highlight.
          expect(archetype.slots[key], `${entry.id}/${slot}`).toBeUndefined();
        } else {
          expect(archetype.slots[key], `${entry.id}/${slot}`).toEqual(spec);
        }
      }
    }
  });

  it('resolves to a valid archetype and a build-named filter', () => {
    for (const entry of BUILDS) {
      const selection = { mode: 'build' as const, buildId: entry.id };
      expect(isValidSelection(selection), entry.id).toBe(true);
      const archetype = resolveSelection(selection);
      expect(validateArchetype(archetype), entry.id).toEqual([]);
      expect(archetype.id).toBe(entry.id);
      expect(archetype.skills).toEqual([entry.mainSkill]);

      for (const phase of PHASES) {
        for (const strictness of STRICTNESS_ORDER) {
          const filter = generateFilter({ selection, phase, strictness });
          const label = `${entry.id}/${phase}/${strictness}`;
          expect(filter.warnings, label).toEqual([]);
          expect(validateFilter(filter.text), label).toEqual([]);
          expect(filter.fileName, label).toBe(
            `buildpath-${entry.id}-${phase}-${strictness}.filter`,
          );
          expect(filter.text, label).not.toMatch(/[^\x09\x0a\x20-\x7e]/);
        }
      }
    }
  });
});

/**
 * The published code is the evidence for R3, and the cheap half of that check
 * runs here: the code must carry the XML the gate measured. Whether real PoB
 * loads it is `npm run builds:check`, run by validate-builds.yml with the
 * pinned checkout (it needs Lua, which `npm test` must not).
 */
describe('published PoB code', () => {
  const compiled = BUILDS.map(
    (entry) =>
      JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        id: string;
        class: string;
        status: string;
        pipeline?: { pobRef: string };
        pob?: {
          ref: string;
          checkpoint: string;
          code: string;
          steps?: string[];
        };
        gates?: Record<
          string,
          {
            level: number;
            tree: { nodes: { id: number }[] };
            gear: { slot: string }[];
            gems: { gems: { name: string }[] }[];
            flasks?: { slot: string; name: string }[];
            metrics: { ascendancy: number };
          }
        >;
      },
  );

  function decode(code: string): string {
    // PoB's import tab: url-safe base64 around zlib-deflated XML.
    const standard = code.replaceAll('-', '+').replaceAll('_', '/');
    return inflateSync(Buffer.from(standard, 'base64')).toString('utf8');
  }

  it('publishes one full journey code per build (D24)', () => {
    for (const build of compiled) {
      expect(build.pob, build.id).toBeDefined();
      expect(build.pob!.checkpoint, build.id).toBe('maps-red');
      expect(build.pob!.ref, build.id).toBe(build.pipeline?.pobRef);
      expect(build.pob!.code, build.id).toMatch(/^[A-Za-z0-9_-]+={0,2}$/);
      expect(build.pob!.steps?.length, build.id).toBeGreaterThan(0);
    }
  });

  it('publishes a plain .pob asset that matches the code', () => {
    for (const build of compiled) {
      const path = resolve(root, `public/builds/${build.id}.pob`);
      expect(existsSync(path), `${build.id} has no .pob asset`).toBe(true);
      expect(readFileSync(path, 'utf8').trim(), build.id).toBe(build.pob!.code);
    }
  });

  it('has one matching pobb.in link per build', () => {
    const links = JSON.parse(
      readFileSync(resolve(root, 'src/generated/builds/pob-links.json'), 'utf8'),
    ) as {
      links: Record<string, { id: string; url: string; codeHash: string }>;
    };
    for (const build of compiled) {
      const link = links.links[build.id];
      expect(link, `${build.id} has no pobb.in link`).toBeDefined();
      expect(link.url, build.id).toBe(`https://pobb.in/${link.id}`);
      const hash = createHash('sha256').update(build.pob!.code).digest('hex').slice(0, 16);
      expect(link.codeHash, `${build.id} paste is stale`).toBe(hash);
    }
  });

  it('has a header image for every published build', () => {
    for (const build of compiled) {
      expect(
        existsSync(resolve(root, `public/builds/${build.id}.webp`)),
        `${build.id} has no generated header image`,
      ).toBe(true);
    }
  });

  it('decodes the full code to every measured step and opens on maps-red', () => {
    for (const build of compiled) {
      const gate = build.gates?.[build.pob!.checkpoint];
      expect(gate, `${build.id} has no maps-red gate`).toBeDefined();
      const xml = decode(build.pob!.code);
      const label = build.id;
      expect(xml.startsWith('<?xml'), label).toBe(true);
      expect(xml, label).toContain('<PathOfBuilding>');
      expect(xml, label).toContain(`className="${build.class}"`);
      expect(xml, label).toContain(`<Build level="${gate!.level}"`);
      expect(xml, label).toContain('<URL>');
      expect(xml, label).toContain('<Notes>');

      const steps = build.pob!.steps ?? [];
      expect((xml.match(/<Spec /g) ?? []).length, label).toBe(steps.length);
      expect((xml.match(/<ItemSet /g) ?? []).length, label).toBe(steps.length);
      expect((xml.match(/<SkillSet /g) ?? []).length, label).toBe(steps.length);

      const tree = xml.match(/<Tree\b[^>]*activeSpec="(\d+)"[^>]*>([\s\S]*?)<\/Tree>/);
      expect(tree, label).toBeTruthy();
      const specs = [...tree![2].matchAll(/<Spec\b[^>]*\bnodes="([^"]*)"/g)];
      const activeNodes = specs[Number(tree![1]) - 1]?.[1] ?? '';
      expect(activeNodes.split(',').filter(Boolean).length, label).toBe(
        gate!.tree.nodes.length + gate!.metrics.ascendancy,
      );

      const items = xml.match(/<Items\b[^>]*activeItemSet="(\d+)"[^>]*>([\s\S]*?)<\/Items>/);
      expect(items, label).toBeTruthy();
      const itemSets = [
        ...items![2].matchAll(/<ItemSet\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/ItemSet>/g),
      ];
      const activeSet = itemSets.find((entry) => entry[1] === items![1])?.[2] ?? '';
      expect((activeSet.match(/<Slot /g) ?? []).length, label).toBe(
        gate!.gear.filter((item) => !item.slot.startsWith('Jewel')).length +
          (gate!.flasks?.length ?? 0),
      );

      const skills = xml.match(/<Skills\b[^>]*activeSkillSet="(\d+)"[^>]*>([\s\S]*?)<\/Skills>/);
      expect(skills, label).toBeTruthy();
      const skillSets = [
        ...skills![2].matchAll(/<SkillSet\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/SkillSet>/g),
      ];
      const activeSkills = skillSets.find((entry) => entry[1] === skills![1])?.[2] ?? '';
      expect((activeSkills.match(/<Gem /g) ?? []).length, label).toBe(
        gate!.gems.reduce((sum, group) => sum + group.gems.length, 0),
      );
    }
  });
});

/**
 * The promise a leveling bracket makes: "by this level you can have this".
 * These tests hold that promise to the game's own data, so a seed cannot list
 * a gem the character cannot use yet or a flask that has not started dropping.
 */
describe('leveling availability', () => {
  const gemLevels = JSON.parse(
    readFileSync(resolve(root, 'src/generated/gem-levels.json'), 'utf8'),
  ) as {
    gems: Record<
      string,
      {
        levels: Record<string, number>;
        quest?: { act: number; classes: string[] } | null;
        color?: 'r' | 'g' | 'b' | 'w' | null;
      }
    >;
  };
  const baseItems = new Map(
    (
      JSON.parse(readFileSync(resolve(root, 'src/core/data/base-types.json'), 'utf8')) as {
        items: { name: string; dropLevel?: number }[];
      }
    ).items.map((item) => [item.name, item]),
  );
  const compiled = BUILDS.map(
    (entry) =>
      JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        id: string;
        class: string;
        leveling: {
          swaps?: {
            gem: string;
            fromLevel: number;
            untilLevel?: number;
            replaces?: string;
            kind?: 'skill' | 'support';
            note?: string;
          }[];
          brackets: {
            until: number;
            skills?: string[];
            skillGroups?: {
              slot: string;
              gems: (string | { name: string; maxLevel?: number; note?: string })[];
            }[];
            flasks?: { name: string; slot: string }[];
          }[];
        };
        gemInfo?: Record<
          string,
          { requiredLevel?: number; source?: { kind: string; act: number | null; quest: string | null } }
        >;
      },
  );

  it('never lists a gem before the character can use it', () => {
    for (const build of compiled) {
      for (const bracket of bracketsOf(build)) {
        for (const group of bracket.skillGroups ?? []) {
          for (const gem of group.gems) {
            const name = typeof gem === 'string' ? gem : gem.name;
            const entry = gemLevels.gems[name];
            expect(entry, `${build.class}: unknown gem "${name}"`).toBeDefined();
            expect(
              entry!.levels['1'],
              `${build.class}: ${name} needs level ${entry!.levels['1']}, listed at until ${bracket.until}`,
            ).toBeLessThanOrEqual(bracket.until);
          }
        }
      }
    }
  });

  it('names where each leveling gem comes from for the build class', () => {
    for (const build of compiled) {
      const names = new Set<string>();
      for (const bracket of bracketsOf(build)) {
        for (const gem of bracket.skills ?? []) names.add(gem);
        for (const group of bracket.skillGroups ?? []) {
          for (const gem of group.gems) names.add(typeof gem === 'string' ? gem : gem.name);
        }
      }
      for (const swap of build.leveling?.swaps ?? []) {
        names.add(swap.gem);
        if (swap.replaces) names.add(swap.replaces);
      }
      for (const name of names) {
        const source = build.gemInfo?.[name]?.source;
        expect(source, `${build.class}: ${name} has no source`).toBeDefined();
        expect(
          ['reward', 'vendor', 'siosa', 'lilly', 'divine-font', 'level'],
          `${build.class}: ${name} has an unknown source`,
        ).toContain(source!.kind);
        if (source!.kind === 'reward' || source!.kind === 'vendor') {
          expect(
            source!.quest,
            `${build.class}: ${name} is a ${source!.kind} with no quest`,
          ).toBeTruthy();
        }
      }
    }
  });

  it('sends the Marauder to the right quest for Ground Slam, Ruthless and Boneshatter', () => {
    const build = compiled.find((entry) => entry.id === 'boneshatter-juggernaut');
    // Ground Slam is the Marauder's level-1 reward after Hillock.
    expect(build?.gemInfo?.['Ground Slam']?.source).toEqual({
      kind: 'reward',
      act: 1,
      quest: 'Enemy at the Gate',
    });
    // Ruthless is not a Marauder reward: the vendor sells it after the Tidal
    // Island quest, which is the earliest point the character can buy it.
    expect(build?.gemInfo?.Ruthless?.source).toEqual({
      kind: 'vendor',
      act: 1,
      quest: 'Mercy Mission',
    });
    // RePoE has no quest for Boneshatter at all; the reviewed supplement does.
    expect(build?.gemInfo?.Boneshatter?.source).toEqual({
      kind: 'reward',
      act: 3,
      quest: 'Sever the Right Hand',
    });
    expect(build?.gemInfo?.Sunder?.source).toEqual({
      kind: 'reward',
      act: 1,
      quest: "The Siren's Cadence",
    });
  });

  it('never sells a transfigured gem as a quest reward', () => {
    for (const id of [
      'smite-divine-judgement-inquisitor',
      'storm-burst-repulsion-hierophant',
      'poison-ranged-animate-weapon-necromancer',
    ]) {
      const build = compiled.find((entry) => entry.id === id);
      const main = build ? bracketsOf(build).at(-1)?.skills?.[0] : undefined;
      expect(build?.gemInfo?.[main!]?.source, `${id}: ${main}`).toEqual({
        kind: 'divine-font',
        act: null,
        quest: null,
      });
    }
  });

  it('never lists a flask before it starts dropping', () => {
    for (const build of compiled) {
      for (const bracket of bracketsOf(build)) {
        for (const flask of bracket.flasks ?? []) {
          const base = baseItems.get(flask.name);
          expect(base, `${build.class}: unknown flask "${flask.name}"`).toBeDefined();
          expect(
            base!.dropLevel ?? 1,
            `${build.class}: ${flask.name} drops from ${base!.dropLevel}, listed at until ${bracket.until}`,
          ).toBeLessThanOrEqual(bracket.until);
        }
      }
    }
  });

  it('keeps a life flask in every bracket', () => {
    for (const build of compiled) {
      for (const bracket of bracketsOf(build)) {
        expect(
          (bracket.flasks ?? []).some((flask) => flask.slot === 'life'),
          `${build.class}: until ${bracket.until} has no life flask`,
        ).toBe(true);
      }
    }
  });
});
