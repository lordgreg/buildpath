import { describe, expect, it } from 'vitest';
import { FILTER_CLASSES, knownClassMeta, knownClasses, toFilterClass } from './classes.ts';
import { EMIT_SAFE_BASE_TYPES, EMIT_SAFE_CLASSES } from './emit-safe.ts';

describe('class registry', () => {
  it('has a meta count that matches the names', () => {
    expect(knownClassMeta.count).toBe(knownClasses.length);
    expect(knownClasses.length).toBeGreaterThan(20);
  });

  it('is sorted and free of duplicates', () => {
    const names = [...knownClasses];
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(new Set(names).size).toBe(names.length);
  });

  it('contains every class the presets emit', () => {
    for (const name of [
      'Currency',
      'Divination Cards',
      'Maps',
      'Map Fragments',
      'Quest Items',
      'Skill Gems',
      'Support Gems',
      'Viscera',
    ]) {
      expect(knownClasses, name).toContain(name);
    }
  });

  it('maps raw RePoE item classes to the names filters use', () => {
    expect(toFilterClass('One Hand Axe')).toBe('One Hand Axes');
    expect(toFilterClass('LifeFlask')).toBe('Life Flasks');
    expect(toFilterClass('Life Flask')).toBe('Life Flasks');
    expect(toFilterClass('Active Skill Gem')).toBe('Skill Gems');
    expect(toFilterClass('DivinationCard')).toBe('Divination Cards');
    expect(toFilterClass('StackableCurrency')).toBe('Currency');
    expect(toFilterClass('Not a real class')).toBe('Not a real class');
  });

  it('maps every class-map target to a registered class', () => {
    for (const rawClass of Object.keys(FILTER_CLASSES)) {
      expect(knownClasses).toContain(FILTER_CLASSES[rawClass]);
    }
  });
});

describe('emit-safe names', () => {
  it('contains every class name', () => {
    for (const name of knownClasses) {
      expect(EMIT_SAFE_CLASSES.has(name), name).toBe(true);
    }
  });

  it('rejects base names a filter cannot quote exactly', () => {
    expect(EMIT_SAFE_BASE_TYPES.has('Chaos Orb')).toBe(true);
    expect(EMIT_SAFE_BASE_TYPES.has('"The Nameless Play"')).toBe(false);
    expect(EMIT_SAFE_BASE_TYPES.has('Maelström Staff')).toBe(false);
  });
});
