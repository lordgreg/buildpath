/**
 * Editorial ratings and the catalogue medal (P7).
 *
 * All four axes use 1–10 where 10 is best. `cost` is the inverse of currency:
 * 10 means cheap to self-fund. The medal is derived, not hand-set, so a build
 * cannot claim S while publishing a 4 somewhere.
 */
export interface BuildRatings {
  tankiness: number;
  singleTarget: number;
  clear: number;
  /** 10 = cheapest to self-fund. */
  cost: number;
}

export type BuildMedal = 'C' | 'B' | 'A' | 'S' | 'S+';

export const RATING_AXES = [
  { key: 'tankiness', label: 'Tankiness' },
  { key: 'singleTarget', label: 'Single target' },
  { key: 'clear', label: 'Map clear' },
  { key: 'cost', label: 'Cost (10 = cheap)' },
] as const;

export function medalFor(ratings: BuildRatings): BuildMedal {
  const values = [ratings.tankiness, ratings.singleTarget, ratings.clear, ratings.cost];
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const minimum = Math.min(...values);
  if (minimum >= 9 && average >= 9.5) return 'S+';
  if (average >= 8 && minimum >= 6) return 'S';
  if (average >= 6.5 && minimum >= 5) return 'A';
  if (average > 5.5) return 'B';
  return 'C';
}
