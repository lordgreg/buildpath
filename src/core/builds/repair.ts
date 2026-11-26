import type { GateThresholds } from './gates.ts';

/**
 * The pure half of bounded repair (PLAN-BUILDS.md §7.5). The PoB oracle still
 * measures each candidate; these functions only decide which candidate order is
 * tried and whether a change is inside the published bound. Keeping them
 * framework-free makes the determinism testable without Lua (R5).
 */

/** A repair may touch at most ten nodes and eight percent of the tree. */
export function repairBound(nodeCount: number): number {
  return Math.min(10, Math.floor(Math.max(1, nodeCount) * 0.08));
}

export interface RepairMetrics {
  fireResist: number;
  coldResist: number;
  lightningResist: number;
  chaosResist?: number;
  life: number;
  ehp: number;
  physicalMaxHit: number;
  dps: number;
}

/**
 * Lower is better. A gate failure dominates everything; between two passing or
 * equally failing trees, the one with the largest worst margin wins. That is a
 * hill-climb with a named objective, not a random walk.
 */
export function repairScore(
  failures: string[],
  metrics: RepairMetrics,
  thresholds: GateThresholds,
): number {
  const checks: number[] = [];
  if (thresholds.resists !== false) {
    const floor = thresholds.resistanceFloor ?? 75;
    checks.push(metrics.fireResist / floor, metrics.coldResist / floor, metrics.lightningResist / floor);
    if (thresholds.chaosResist) {
      checks.push((metrics.chaosResist ?? -100) / thresholds.chaosResist);
    }
  }
  if (thresholds.life) checks.push(metrics.life / thresholds.life);
  if (thresholds.ehp) checks.push(metrics.ehp / thresholds.ehp);
  if (thresholds.maxHit) checks.push(metrics.physicalMaxHit / thresholds.maxHit);
  if (thresholds.dps) checks.push(metrics.dps / thresholds.dps);
  const margin = checks.length > 0 ? Math.min(...checks) : 0;
  return failures.length * 1000 - margin;
}

/** FNV-1a over the seed identity: the repair order is random but reproducible. */
export function hashString(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic candidate order: same seed and round, same batch. */
export function seededShuffle<T>(values: readonly T[], seed: number, round: number): T[] {
  const copy = [...values];
  const random = mulberry32(hashString(String(seed)) + round * 0x9e3779b9);
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}
