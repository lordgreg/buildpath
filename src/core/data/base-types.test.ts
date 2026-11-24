import { describe, expect, it } from 'vitest';
import { archetypes } from '../archetypes/index.ts';
import { FILTER_CLASSES } from './classes.ts';
import equipmentClasses from './equipment-classes.json';
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

  it('keeps placeholder classes out of the registry', () => {
    // The export labels internal placeholders with classes the filter language
    // does not know. Admitting their names would let a typo pass validation.
    const knownNames = new Set(known.names);
    for (const name of ['Hidden Item', 'Fleshgraft', 'Enshrouded Gloves']) {
      expect(knownNames.has(name), name).toBe(false);
    }
  });

  it('only holds equipment classes in the trimmed data', () => {
    const equipment = new Set<string>(equipmentClasses);
    for (const base of baseTypes) {
      expect(
        equipment.has(FILTER_CLASSES[base.itemClass] ?? base.itemClass),
        `${base.name} (${base.itemClass})`,
      ).toBe(true);
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