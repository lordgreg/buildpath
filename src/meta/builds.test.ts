import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { generateFilter } from '../core/filter/generate.ts';
import { validateArchetype } from '../core/archetypes/validate.ts';
import { validateFilter } from '../core/filter/validate.ts';
import { STRICTNESS_ORDER } from '../core/filter/presets.ts';
import { BUILDS, BUILD_VERSION, getBuildEntry, isBuildId } from './builds.ts';
import { coerceSelection, isValidSelection } from './index.ts';
import { resolveSelection } from './resolve.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const seedsDir = resolve(root, 'src/builds');

const PHASES = ['leveling', 'endgame'] as const;

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
        steps?: { id: string; pass: boolean; level: number; dps: number }[];
      }[];
    };
    for (const entry of committed.builds) {
      const full = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as {
        gates?: Record<string, { pass: boolean; level: number; metrics: { dps: number } }>;
      };
      if (!full.gates) {
        expect(entry.steps, entry.id).toBeUndefined();
        continue;
      }
      expect(entry.steps, entry.id).toEqual(
        Object.entries(full.gates).map(([id, gate]) => ({
          id,
          pass: gate.pass,
          level: gate.level,
          dps: gate.metrics.dps,
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
        class: string;
        leveling: {
          brackets: {
            until: number;
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
          { color?: string | null; description?: string | null; effect?: string[]; tags?: string[] }
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
      expect(build.leveling.brackets.length).toBeGreaterThan(0);
      for (const bracket of build.leveling.brackets) {
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
      for (const bracket of build.leveling.brackets) {
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
      for (const bracket of build.leveling.brackets) {
        for (const group of bracket.skillGroups ?? []) {
          for (const gem of group.gems) {
            const name = typeof gem === 'string' ? gem : gem.name;
            const entry = info[name];
            expect(entry, `${build.class}: ${name}`).toBeDefined();
            expect(
              Boolean(entry?.description) || (entry?.effect?.length ?? 0) > 0,
              `${build.class}: ${name} has no description or effect`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it('names a colour for every gem the guide shows', () => {
    for (const build of compiled) {
      const info = build.gemInfo ?? {};
      for (const bracket of build.leveling.brackets) {
        for (const group of bracket.skillGroups ?? []) {
          for (const gem of group.gems) {
            const name = typeof gem === 'string' ? gem : gem.name;
            expect(info[name]?.color, `${build.class}: ${name} has no colour`).toBeTruthy();
          }
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
  };

  it('publishes a green report for the current thresholds', () => {
    const hash = createHash('sha256')
      .update(
        JSON.stringify({
          resistanceFloor: gateConfig.resistanceFloor,
          checkpoints: gateConfig.checkpoints,
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
        pob?: { ref: string; checkpoint: string; code: string };
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

  it('publishes one maps-red code per build (D24)', () => {
    for (const build of compiled) {
      expect(build.pob, build.id).toBeDefined();
      expect(build.pob!.checkpoint, build.id).toBe('maps-red');
      expect(build.pob!.ref, build.id).toBe(build.pipeline?.pobRef);
      expect(build.pob!.code, build.id).toMatch(/^[A-Za-z0-9_-]+={0,2}$/);
    }
  });

  it('publishes a plain .pob asset that matches the code', () => {
    for (const build of compiled) {
      const path = resolve(root, `public/builds/${build.id}.pob`);
      expect(existsSync(path), `${build.id} has no .pob asset`).toBe(true);
      expect(readFileSync(path, 'utf8').trim(), build.id).toBe(build.pob!.code);
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

  it('decodes to the tree, items and gems the gate report measured', () => {
    for (const build of compiled) {
      const gate = build.gates?.['maps-red'];
      expect(gate, `${build.id} has no maps-red gate report`).toBeDefined();
      const xml = decode(build.pob!.code);
      expect(xml.startsWith('<?xml'), build.id).toBe(true);
      expect(xml, build.id).toContain('<PathOfBuilding>');
      expect(xml, build.id).toContain(`className="${build.class}"`);
      expect(xml, build.id).toContain(`<Build level="${gate!.level}"`);

      const specNodes = xml.match(/<Spec\b[^>]*\bnodes="([^"]*)"/)?.[1] ?? '';
      expect(specNodes.split(',').filter(Boolean).length, build.id).toBe(
        gate!.tree.nodes.length + gate!.metrics.ascendancy,
      );
      // Flasks are items in their own slots, shown in their own section.
      const flaskSlots = (xml.match(/<Slot name="Flask /g) ?? []).length;
      expect((xml.match(/<Item id=/g) ?? []).length - flaskSlots, build.id).toBe(
        gate!.gear.length,
      );
      expect(flaskSlots, build.id).toBe(gate!.flasks?.length ?? 0);
      expect((xml.match(/<Gem /g) ?? []).length, build.id).toBe(
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
        class: string;
        leveling: {
          brackets: {
            until: number;
            skillGroups?: {
              slot: string;
              gems: (string | { name: string; maxLevel?: number; note?: string })[];
            }[];
            flasks?: { name: string; slot: string }[];
          }[];
        };
      },
  );

  it('never lists a gem before the character can use it', () => {
    for (const build of compiled) {
      for (const bracket of build.leveling.brackets) {
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

  it('names where each gem comes from for the build class', () => {
    for (const build of compiled) {
      for (const bracket of build.leveling.brackets) {
        for (const group of bracket.skillGroups ?? []) {
          for (const gem of group.gems) {
            const name = typeof gem === 'string' ? gem : gem.name;
            const entry = gemLevels.gems[name]!;
            expect(entry, `${build.class}: unknown gem "${name}"`).toBeDefined();
            if (entry.quest) {
              // A quest reward only exists for the classes that quest rewards;
              // every other class buys it from the same act's vendor.
              expect(
                Array.isArray(entry.quest.classes),
                `${build.class}: ${name} quest has no class list`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it('never lists a flask before it starts dropping', () => {
    for (const build of compiled) {
      for (const bracket of build.leveling.brackets) {
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
      for (const bracket of build.leveling.brackets) {
        expect(
          (bracket.flasks ?? []).some((flask) => flask.slot === 'life'),
          `${build.class}: until ${bracket.until} has no life flask`,
        ).toBe(true);
      }
    }
  });
});
