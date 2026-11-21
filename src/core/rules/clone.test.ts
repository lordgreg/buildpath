import { describe, expect, it } from 'vitest';
import type { Sections } from '../filter/generate.ts';
import type { Rule } from '../filter/types.ts';
import { cloneKey, createClone, parseClone } from './clone.ts';

const sections: Sections = {
  gear: true,
  gems: false,
  currency: true,
  maps: true,
  uniques: false,
};

const rules: Rule[] = [
  {
    id: 'custom-0',
    section: 'custom',
    action: 'Hide',
    comment: 'DEX head',
    baseTypes: ['Hubris Circlet', 'Iron Hat'],
    chips: ['attr:dex', 'slot:head'],
    disabled: false,
  },
  {
    id: 'custom-1',
    section: 'custom',
    action: 'Show',
    baseTypes: ['Divine Orb'],
  },
];

describe('rule clones', () => {
  it('round-trips through parseClone', () => {
    const clone = createClone({
      key: 'key',
      label: 'Minion',
      presetVersion: 'abc123',
      rules,
    });
    expect(parseClone(JSON.parse(JSON.stringify(clone)))).toEqual(clone);
  });

  it('rejects malformed clones', () => {
    expect(parseClone(null)).toBeNull();
    expect(parseClone({ schemaVersion: 22 })).toBeNull();
    expect(
      parseClone({
        schemaVersion: 1,
        key: 'k',
        label: 'l',
        presetVersion: 'v',
        rules: [{ action: 'Delete' }],
      }),
    ).toBeNull();
  });

  it('keys by selection, phase, strictness and sections', () => {
    const base = {
      mode: 'family' as const,
      familyId: 'minion' as const,
    };
    const key = cloneKey(base, 'leveling', 'normal', sections);
    expect(cloneKey(base, 'leveling', 'normal', { ...sections })).toBe(key);
    expect(cloneKey(base, 'endgame', 'normal', sections)).not.toBe(key);
    expect(
      cloneKey(base, 'leveling', 'normal', { ...sections, gems: true }),
    ).not.toBe(key);
  });

  it('keeps disabled rules in the clone', () => {
    const clone = createClone({
      key: 'key',
      label: 'Minion',
      presetVersion: 'abc123',
      rules: [{ action: 'Hide', disabled: true }],
    });
    expect(clone.rules[0]?.disabled).toBe(true);
  });
});