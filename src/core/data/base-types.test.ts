import { describe, expect, it } from 'vitest';
import { archetypes } from '../archetypes/index.ts';
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