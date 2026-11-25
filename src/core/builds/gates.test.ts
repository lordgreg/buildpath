import { describe, expect, it } from 'vitest';
import { evaluateGate } from './gates.ts';
import type { CheckpointMetrics } from './types.ts';

const base: CheckpointMetrics = {
  dps: 2_500_000,
  dpsSource: 'minion',
  life: 4_200,
  energyShield: 1_100,
  ehp: 31_000,
  physicalMaxHit: 13_000,
  fireResist: 75,
  coldResist: 75,
  lightningResist: 75,
  chaosResist: -20,
  nodes: 104,
  ascendancy: 8,
};

const thresholds = { life: 4_000, ehp: 30_000, maxHit: 12_000, dps: 2_000_000 };

describe('gate evaluation', () => {
  it('passes a build that clears every floor', () => {
    expect(evaluateGate(base, thresholds)).toEqual({ pass: true, failures: [] });
  });

  it('names each failure instead of a single "failed"', () => {
    const report = evaluateGate(
      {
        ...base,
        dps: 1_250_000,
        fireResist: 60,
        coldResist: 74,
        life: 3_100,
      },
      thresholds,
    );
    expect(report.pass).toBe(false);
    expect(report.failures).toEqual([
      'fire resistance 60% < 75%',
      'cold resistance 74% < 75%',
      'life 3,100 < 4,000',
      'damage 1,250,000 < 2,000,000',
    ]);
  });

  it('ignores a threshold the checkpoint does not set', () => {
    // Act checkpoints gate life and damage but not the effective life pool.
    const report = evaluateGate({ ...base, ehp: 0 }, { life: 4_000, dps: 1 });
    expect(report.pass).toBe(true);
  });

  it('skips resistances where they cannot be capped yet', () => {
    const report = evaluateGate(
      { ...base, fireResist: -48, coldResist: -48, lightningResist: -48 },
      { resists: false, life: 250, dps: 300 },
    );
    expect(report.pass).toBe(true);
  });

  it('respects a resistance gap', () => {
    const report = evaluateGate(
      { ...base, coldResist: 60 },
      { life: 4_000 },
      15,
    );
    expect(report.pass).toBe(true);
  });
});
