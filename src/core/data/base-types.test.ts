import { describe, expect, it } from 'vitest';
import { archetypes } from '../archetypes/index.ts';
import removed from './base-types-removed.json';
import known from './known-base-types.json';
import { baseTypeMeta, baseTypes, basesWithTag } from './base-types.ts';
import { resolveSlotBases } from './resolve.ts';

describe('base type data', () => {
  it('has a meta count that matches the items', () => {
    expect(baseTypeMeta.count).toBe(baseTypes.length);
    expect(baseTypes.length).toBeGreaterThan(500);
  });

  it('has unique name + class pairs', () => {
    const keys = baseTypes.map((base) => `${base.name}\u0000${base.itemClass}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('resolves the minion weapon tag to real bases', () => {
    const names = basesWithTag('weapon_can_roll_minion_modifiers').map(
      (base) => base.name,
    );
    expect(names).toContain('Convoking Wand');
  });

  it('resolves the minion shield tag to real bases', () => {
    const names = basesWithTag('focus_can_roll_minion_modifiers').map(
      (base) => base.name,
    );
    expect(names).toContain('Bone Spirit Shield');
  });

  it('drops bases the live game no longer has', () => {
    // RePoE still reports these as released, but the game has dropped or
    // renamed them. A single unknown name makes the client refuse the whole
    // filter, so they must be absent from both the data and the registry.
    const baseNames = new Set(baseTypes.map((base) => base.name));
    const knownNames = new Set(known.names);
    expect(removed.length).toBeGreaterThan(0);
    for (const name of removed) {
      expect(baseNames.has(name), `data: ${name}`).toBe(false);
      expect(knownNames.has(name), `registry: ${name}`).toBe(false);
    }
  });
});

describe('archetype slots', () => {
  it('resolve to at least one real base', () => {
    for (const archetype of archetypes) {
      for (const [slot, spec] of Object.entries(archetype.slots)) {
        const label = `${archetype.id}.${slot}`;
        const bases = resolveSlotBases(spec);
        expect(bases.length, label).toBeGreaterThan(0);
        for (const base of bases) {
          expect(spec.itemClasses, `${label}: ${base.name}`).toContain(
            base.itemClass,
          );
        }
      }
    }
  });

  it('does not contain unknown tags', () => {
    const allTags = new Set(baseTypes.flatMap((base) => base.tags));
    for (const archetype of archetypes) {
      for (const [slot, spec] of Object.entries(archetype.slots)) {
        for (const tag of spec.tags ?? []) {
          expect(allTags.has(tag), `${archetype.id}.${slot}: ${tag}`).toBe(true);
        }
      }
    }
  });
});