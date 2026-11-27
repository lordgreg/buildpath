import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { PlanScope } from '../core/builds/tree-targets.ts';
import {
  lineAppliesToBuild,
  weaponTraitsFor,
} from '../core/builds/tree-targets.ts';
import type { BaseType } from '../core/data/base-types.ts';
import { BUILDS } from './builds.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

interface GeometryNode {
  id: number;
  name: string;
  notable: boolean;
  stats?: string[];
}

interface GateTree {
  nodes: { id: number; name: string; notable: boolean }[];
  notables: string[];
}

interface Gate {
  gear: { slot: string; base: string }[];
  tree: GateTree;
}

interface CompiledBuild {
  gates?: Record<string, Gate>;
}

interface SeedTree {
  targets?: string[];
  keystones?: string[];
}

interface Seed {
  tree?: SeedTree;
}

const geometry = JSON.parse(
  readFileSync(resolve(root, 'src/generated/tree-geometry.json'), 'utf8'),
) as { nodes: GeometryNode[] };
const geometryById = new Map(geometry.nodes.map((node) => [node.id, node]));
const baseTypes = (
  JSON.parse(readFileSync(resolve(root, 'src/core/data/base-types.json'), 'utf8')) as {
    items: BaseType[];
  }
).items;
const baseByName = new Map(baseTypes.map((base) => [base.name, base]));

function scopeFor(seed: Seed, gate: Gate): PlanScope | undefined {
  const weapon = baseByName.get(
    gate.gear.find((item) => item.slot === 'Weapon 1')?.base ?? '',
  );
  if (!weapon) return undefined;
  const offhand = baseByName.get(
    gate.gear.find((item) => item.slot === 'Weapon 2')?.base ?? '',
  );
  return {
    traits: weaponTraitsFor(weapon, offhand),
    resoluteTechnique: (seed.tree?.keystones ?? []).some(
      (name) => name.trim().toLowerCase() === 'resolute technique',
    ),
    minions: (seed.tree?.targets ?? []).some((target) =>
      target.toLowerCase().includes('minion'),
    ),
  };
}

function readBuild(id: string): CompiledBuild {
  return JSON.parse(
    readFileSync(resolve(root, `src/generated/builds/${id}.json`), 'utf8'),
  ) as CompiledBuild;
}

function readSeed(id: string): Seed {
  return parse(
    readFileSync(resolve(root, `src/builds/${id}.yaml`), 'utf8'),
  ) as Seed;
}

describe('weapon-compatible tree notables', () => {
  for (const entry of BUILDS) {
    it(`${entry.id} allocates no notable its build cannot use`, () => {
      const build = readBuild(entry.id);
      const seed = readSeed(entry.id);
      for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
        const scope = scopeFor(seed, gate);
        if (!scope) continue;
        for (const node of gate.tree.nodes) {
          if (!node.notable) continue;
          const stats = geometryById.get(node.id)?.stats ?? [];
          if (stats.length === 0) continue;
          const usable = stats.some((line) => lineAppliesToBuild(line, scope));
          expect(usable, `${entry.id}/${checkpoint}: ${node.name}`).toBe(true);
        }
      }
    });
  }

  it('keeps Boneshatter off one-hand and mace notables', () => {
    const build = readBuild('boneshatter-juggernaut');
    for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
      expect(gate.tree.notables, checkpoint).not.toContain('Strong Arm');
      expect(gate.tree.notables, checkpoint).not.toContain('Spinecruncher');
    }
  });

  it('never puts an offhand next to a two-handed weapon', () => {
    for (const entry of BUILDS) {
      const build = readBuild(entry.id);
      for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
        const weapon = baseByName.get(
          gate.gear.find((item) => item.slot === 'Weapon 1')?.base ?? '',
        );
        if (!weapon?.tags.includes('two_hand_weapon')) continue;
        const offhandItem = gate.gear.find((item) => item.slot === 'Weapon 2');
        if (!offhandItem) continue;
        const label = `${entry.id}/${checkpoint}: ${offhandItem.base}`;
        if (weapon.tags.includes('bow')) {
          // A bow is two-handed but may carry a quiver.
          const offhand = baseByName.get(offhandItem.base);
          expect(offhand?.tags.includes('quiver'), label).toBe(true);
        } else {
          expect(offhandItem, label).toBeUndefined();
        }
      }
    }
  });
});
