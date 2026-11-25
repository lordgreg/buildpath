import type { CheckpointMetrics } from './types.ts';

export interface GateThresholds {
  /** Overrides the global floor: capping your resistances at level 12 is not a thing. */
  resistanceFloor?: number;
  life?: number;
  ehp?: number;
  maxHit?: number;
  dps?: number;
}

export interface GateReport {
  pass: boolean;
  failures: string[];
}

/** Elemental resistances must reach this floor at every checkpoint. */
export const RESIST_FLOOR = 75;

/**
 * Evaluates one checkpoint. Pure and deterministic so a gate report is
 * reproducible from committed numbers: the same metrics always give the same
 * verdict, and a threshold change shows up as a diff rather than a surprise.
 */
export function evaluateGate(
  metrics: CheckpointMetrics,
  thresholds: GateThresholds,
  resistanceGap = 0,
): GateReport {
  const failures: string[] = [];
  const floor = thresholds.resistanceFloor ?? RESIST_FLOOR - resistanceGap;

  const resistances: [keyof CheckpointMetrics, string][] = [
    ['fireResist', 'fire resistance'],
    ['coldResist', 'cold resistance'],
    ['lightningResist', 'lightning resistance'],
  ];
  for (const [key, label] of resistances) {
    const value = Math.round(Number(metrics[key] ?? -100));
    if (value < floor) failures.push(`${label} ${value}% < ${floor}%`);
  }

  const floors: [keyof CheckpointMetrics, keyof GateThresholds, string][] = [
    ['life', 'life', 'life'],
    ['ehp', 'ehp', 'effective life pool'],
    ['physicalMaxHit', 'maxHit', 'physical max hit'],
    ['dps', 'dps', 'damage'],
  ];
  for (const [metric, threshold, label] of floors) {
    const limit = thresholds[threshold];
    if (limit === undefined) continue;
    const value = Math.round(Number(metrics[metric] ?? 0));
    if (value < limit) {
      failures.push(
        `${label} ${value.toLocaleString('en-US')} < ${limit.toLocaleString('en-US')}`,
      );
    }
  }

  return { pass: failures.length === 0, failures };
}
