import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ItemSlot } from '../core/archetypes/types.ts';
import { resolveSlotBases } from '../core/data/resolve.ts';
import { BUILDS } from './builds.ts';
import { resolveSelection } from './resolve.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

interface GateGear {
  slot: string;
  base: string;
}

interface CompiledBuild {
  gates?: Record<string, { gear: GateGear[] }>;
}

const SLOT_KEYS: Record<string, ItemSlot> = {
  'Weapon 1': 'weapon',
  'Weapon 2': 'offhand',
  Helmet: 'helmet',
  'Body Armour': 'body',
  Gloves: 'gloves',
  Boots: 'boots',
  Belt: 'belt',
  Amulet: 'amulet',
  'Ring 1': 'ring',
  'Ring 2': 'ring',
};

function slotKey(slot: string): ItemSlot | undefined {
  if (slot.startsWith('Jewel ')) return 'jewel';
  return SLOT_KEYS[slot];
}

/**
 * The build page says the filter highlights the bases the gates measured. This
 * is the guard: every item a build wears, at every checkpoint, must resolve to
 * a base its own filter slot shows, and a two-hander must not leave an offhand
 * slot behind. `deriveGearFilter` in the compiler is what keeps this true.
 */
describe('build filters match the measured gear', () => {
  for (const entry of BUILDS) {
    it(`${entry.id} highlights every item it wears`, () => {
      const build = JSON.parse(
        readFileSync(resolve(root, `src/generated/builds/${entry.id}.json`), 'utf8'),
      ) as CompiledBuild;
      const archetype = resolveSelection({ mode: 'build', buildId: entry.id });

      for (const [checkpoint, gate] of Object.entries(build.gates ?? {})) {
        for (const item of gate.gear) {
          const key = slotKey(item.slot);
          if (!key) continue;
          const spec = archetype.slots[key];
          expect(spec, `${entry.id}/${checkpoint}: no filter slot for ${item.slot}`).toBeDefined();
          const bases = resolveSlotBases(spec!).map((base) => base.name);
          expect(
            bases,
            `${entry.id}/${checkpoint}: ${item.slot} ${item.base} is hidden by the filter`,
          ).toContain(item.base);
        }

        const offhand = gate.gear.find((item) => item.slot === 'Weapon 2');
        if (!offhand) {
          expect(
            archetype.slots.offhand,
            `${entry.id}/${checkpoint}: filter keeps an offhand the build cannot wear`,
          ).toBeUndefined();
        }
      }
    });
  }
});
