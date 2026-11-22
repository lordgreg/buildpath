import { describe, expect, it } from 'vitest';
import { baseTypes, basesRequiring } from '../data/base-types.ts';
import known from '../data/known-base-types.json';
import { toFilterClass } from '../filter/classes.ts';
import {
  CHIPS,
  chipBaseTypes,
  unionChipBases,
  type ChipId,
} from './chips.ts';

const knownNames = new Set(known.names);
const ids = CHIPS.map((chip) => chip.id);

describe('rule chips', () => {
  it('resolves every chip to real base types', () => {
    for (const id of ids) {
      const bases = chipBaseTypes(id);
      expect(bases.length, id).toBeGreaterThan(0);
      for (const name of bases) {
        expect(knownNames.has(name), `${id}: ${name}`).toBe(true);
      }
    }
  });

  it('uses requirements for attribute chips', () => {
    for (const attribute of ['str', 'dex', 'int'] as const) {
      const bases = chipBaseTypes(`attr:${attribute}` as ChipId);
      expect(bases.length).toBe(basesRequiring(attribute).length);
      const sample = basesRequiring(attribute)[0]!;
      expect(bases).toContain(sample.name);
    }
  });

  it('Head resolves to helmets', () => {
    const bases = chipBaseTypes('slot:head');
    for (const name of bases) {
      const base = baseTypes.find((entry) => entry.name === name)!;
      expect(base.itemClass).toBe('Helmet');
    }
  });

  it('2H resolves only to two-hand melee classes', () => {
    const allowed = new Set([
      'Two Hand Axes',
      'Two Hand Swords',
      'Two Hand Maces',
      'Staves',
      'Warstaves',
    ]);
    for (const name of chipBaseTypes('weapon:2h')) {
      const entries = baseTypes.filter((entry) => entry.name === name);
      expect(
        entries.some((entry) => allowed.has(toFilterClass(entry.itemClass))),
        name,
      ).toBe(true);
    }
  });

  it('Ranged includes bows', () => {
    const bases = chipBaseTypes('weapon:ranged');
    expect(bases.some((name) => /Bow/.test(name))).toBe(true);
  });

  it('resolves slot chips to their item class', () => {
    const slots: [ChipId, string][] = [
      ['slot:head', 'Helmet'],
      ['slot:body', 'Body Armour'],
      ['slot:gloves', 'Gloves'],
      ['slot:boots', 'Boots'],
      ['slot:shield', 'Shield'],
      ['slot:quiver', 'Quiver'],
      ['slot:belt', 'Belt'],
      ['slot:amulet', 'Amulet'],
      ['slot:ring', 'Ring'],
    ];
    for (const [id, itemClass] of slots) {
      const bases = chipBaseTypes(id);
      expect(bases.length, id).toBeGreaterThan(0);
      for (const name of bases) {
        const base = baseTypes.find((entry) => entry.name === name)!;
        expect(base.itemClass, `${id}: ${name}`).toBe(itemClass);
      }
    }
  });

  it('1H never resolves to a two-hand class', () => {
    const twoHand = new Set([
      'Two Hand Axes',
      'Two Hand Swords',
      'Two Hand Maces',
      'Staves',
      'Warstaves',
    ]);
    const bases = chipBaseTypes('weapon:1h');
    expect(bases.length).toBeGreaterThan(0);
    for (const name of bases) {
      const base = baseTypes.find((entry) => entry.name === name)!;
      expect(twoHand.has(toFilterClass(base.itemClass)), name).toBe(false);
    }
  });

  it('unions and sorts without duplicates', () => {
    const union = unionChipBases(['slot:head', 'weapon:2h', 'slot:head']);
    expect(union).toEqual([...new Set(union)]);
    expect(union).toEqual([...union].sort());
    expect(union.length).toBeGreaterThan(chipBaseTypes('slot:head').length);
  });
});