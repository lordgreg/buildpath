import { describe, expect, it } from 'vitest';
import economy from '../../generated/economy.json';
import { generateFilter } from './generate.ts';

describe('economy snapshot', () => {
  it('has the expected shape and league', () => {
    expect(economy.schemaVersion).toBe(1);
    expect(economy.league.name).toBe('Covens');
    expect(economy.divineChaos).toBeGreaterThan(0);
    expect(Object.keys(economy.tiers.currency).length).toBeGreaterThan(5);
    expect(Object.keys(economy.tiers.divination).length).toBeGreaterThan(10);
    expect(Object.keys(economy.tiers.uniqueBase).length).toBeGreaterThan(10);
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