import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
        skillGroups: { slot: string; gems: string[] }[];
        flasks?: Record<string, { name: string; slot: string }[]>;
        gates?: Record<
          string,
          {
            pass: boolean;
            level: number;
            metrics: { dps: number; life: number; resists: number[] };
            failures: string[];
            tree?: { nodes: { id: number; x: number; y: number }[]; edges: [number, number][]; notables: string[] };
            gear?: { slot: string; base: string; mods: string[]; ilvl: number }[];
            gems?: { slot: string; gems: { name: string; level: number }[] }[];
          }
        >;
        status: string;
      },
  );

  it('gives every skill group a gear slot and at least one gem', () => {
    for (const build of compiled) {
      expect(build.skillGroups.length).toBeGreaterThan(0);
      for (const group of build.skillGroups) {
        expect(group.slot.trim(), group.slot).not.toBe('');
        expect(group.gems.length, group.slot).toBeGreaterThan(0);
      }
      const slots = build.skillGroups.map((group) => group.slot);
      expect(new Set(slots).size, 'one group per slot').toBe(slots.length);
    }
  });

  it('lists flasks for every step it claims to cover', () => {
    for (const build of compiled) {
      if (!build.flasks) continue;
      for (const step of ['leveling', 'maps', 'endgame'] as const) {
        const flasks = build.flasks[step];
        if (!flasks) continue;
        expect(flasks.length, step).toBeGreaterThan(0);
        // A build needs a life flask at every step; utility flasks are optional.
        expect(flasks.some((flask) => flask.slot === 'life'), step).toBe(true);
      }
    }
  });

  it('carries a tree view and named failures for every measured checkpoint', () => {
    for (const build of compiled) {
      if (!build.gates) continue;
      for (const [checkpoint, gate] of Object.entries(build.gates)) {
        expect(gate.pass, checkpoint).toBe(gate.failures.length === 0);
        expect(gate.tree?.nodes.length ?? 0, checkpoint).toBeGreaterThan(10);
        expect(gate.tree?.notables.length ?? 0, checkpoint).toBeGreaterThan(0);
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

  it('publishes a build as verified only when it passes everything', () => {
    for (const build of compiled) {
      if (build.status !== 'verified') continue;
      for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
        expect(gate.pass, `${build.status} ${checkpoint}`).toBe(true);
      }
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
