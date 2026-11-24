import { describe, expect, it } from 'vitest';
import economy from '../../generated/economy.json';
import known from '../data/known-base-types.json';
import { generateFilter } from './generate.ts';

const knownNames = new Set(known.names);

describe('economy snapshot', () => {
  it('has the expected shape and league', () => {
    expect(economy.schemaVersion).toBe(1);
    expect(economy.league.name).toBe('Covens');
    expect(economy.divineChaos).toBeGreaterThan(0);
    expect(Object.keys(economy.tiers.currency).length).toBeGreaterThan(5);
    expect(Object.keys(economy.tiers.divination).length).toBeGreaterThan(10);
    expect(Object.keys(economy.tiers.uniqueBase).length).toBeGreaterThan(10);
  });

  it('names only base types the registry knows', () => {
    // Every tier list is emitted as BaseType conditions, so a name the game does
    // not accept would make it refuse the whole filter.
    const missing: string[] = [];
    for (const [group, tiers] of Object.entries(economy.tiers)) {
      for (const name of Object.keys(tiers as Record<string, number>)) {
        if (!knownNames.has(name)) missing.push(`${group}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('drives currency and divination lists', () => {
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'endgame',
      strictness: 'strict',
    });

    expect(filter.text).toContain('"Mirror of Kalandra"');
    expect(filter.text).toContain('"The Doctor"');
    expect(filter.text).toContain('"Divine Orb"');
  });

  it('adds a high-value unique base rule', () => {
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'endgame',
      strictness: 'soft',
    });
    expect(filter.text).toContain('# Uniques - high-value bases');
    expect(filter.text).toContain('Rarity Unique');
  });
});