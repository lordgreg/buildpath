import presets from '../generated/presets.json';
import type { Ascendancy } from './types.ts';

export const ASCENDANCIES = presets.ascendancies as unknown as Ascendancy[];

export const ASCENDANCY_BY_ID = new Map(
  ASCENDANCIES.map((ascendancy) => [ascendancy.id, ascendancy]),
);

export function getAscendancy(id: string): Ascendancy {
  const ascendancy = ASCENDANCY_BY_ID.get(id);
  if (!ascendancy) throw new Error(`Unknown ascendancy "${id}"`);
  return ascendancy;
}