import { describe, expect, it } from 'vitest';
import { hashString, repairBound, repairScore, seededShuffle } from './repair.ts';

const metrics = {
  fireResist: 75,
  coldResist: 75,
  lightningResist: 75,
  chaosResist: 75,
  life: 5000,
  ehp: 30000,
  physicalMaxHit: 9000,
  dps: 150000,
};

const thresholds = {
  resistanceFloor: 75,
  chaosResist: 75,
  life: 4500,
  ehp: 20000,
  maxHit: 6000,
  dps: 100000,
};

describe('bounded repair', () => {
  it('caps changes at ten nodes and eight percent', () => {
    // 8% of 100 is 8; 8% of 200 would be 16 but the absolute cap is 10.
    expect(repairBound(100)).toBe(8);
    expect(repairBound(200)).toBe(10);
    // A tiny leveling tree cannot afford a two-node swap at 8%.
    expect(repairBound(10)).toBe(0);
    expect(repairBound(25)).toBe(2);
  });

  it('prefers fewer failures, then a better worst margin', () => {
    // Resistances at the floor are already the worst margin, so compare the
    // non-resistance thresholds to see the margin term move.
    const noResists = { ...thresholds, resists: false };
    const passing = repairScore([], metrics, noResists);
    const failing = repairScore(['damage 1000 < 100000'], metrics, noResists);
    expect(failing).toBeGreaterThan(passing);
    const closer = repairScore([], { ...metrics, life: 4600 }, noResists);
    expect(closer).toBeGreaterThan(passing);
  });

  it('orders candidates deterministically from the seed and round', () => {
    const values = [1, 2, 3, 4, 5, 6];
    const first = seededShuffle(values, hashString('lightning-arrow-deadeye|maps-red'), 0);
    const again = seededShuffle(values, hashString('lightning-arrow-deadeye|maps-red'), 0);
    const nextRound = seededShuffle(values, hashString('lightning-arrow-deadeye|maps-red'), 1);
    expect(again).toEqual(first);
    expect([...first].sort()).toEqual(values);
    expect(nextRound).not.toEqual(first);
  });
});
