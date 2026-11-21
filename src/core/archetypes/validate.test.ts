import { describe, expect, it } from 'vitest';
import { archetypes, getArchetype } from './index.ts';
import { validateArchetype } from './validate.ts';
import type { Archetype } from './types.ts';

describe('archetype registry', () => {
  it('has unique ids', () => {
    const ids = archetypes.map((archetype) => archetype.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('validates every archetype', () => {
    for (const archetype of archetypes) {
      expect(validateArchetype(archetype), archetype.id).toEqual([]);
    }
  });

  it('resolves by id', () => {
    expect(getArchetype('necro-minions')?.class).toBe('Witch');
    expect(getArchetype('nope')).toBeUndefined();
  });
});

describe('validateArchetype', () => {
  const valid: Archetype = {
    id: 'test-build',
    name: 'Test Build',
    class: 'Witch',
    ascendancy: 'Necromancer',
    summary: 'A build used by tests.',
    leveling: true,
    verifiedFor: 'Covens',
    slots: { weapon: { itemClasses: ['Wand'] } },
    attributes: ['int'],
    keyMods: [],
    skills: ['Summon Skeletons'],
  };

  it('accepts a minimal valid archetype', () => {
    expect(validateArchetype(valid)).toEqual([]);
  });

  it('reports each broken field with its path', () => {
    const broken: Archetype = {
      ...valid,
      id: 'Not A Slug',
      class: 'Wizard' as Archetype['class'],
      ascendancy: '',
      verifiedFor: '',
      attributes: [],
      slots: {},
      skills: [],
    };

    const paths = validateArchetype(broken).map((issue) => issue.path);
    expect(paths).toContain('id');
    expect(paths).toContain('class');
    expect(paths).toContain('ascendancy');
    expect(paths).toContain('verifiedFor');
    expect(paths).toContain('attributes');
    expect(paths).toContain('slots');
  });

  it('rejects unknown attributes and empty item classes', () => {
    const broken: Archetype = {
      ...valid,
      attributes: ['wis' as Archetype['attributes'][number]],
      slots: { weapon: { itemClasses: [] } },
    };

    expect(validateArchetype(broken).map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['attributes', 'slots.weapon.itemClasses']),
    );
  });
});