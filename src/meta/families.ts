import presets from '../generated/presets.json';
import type { Family, FamilyId } from './types.ts';

export const FAMILIES = presets.families as unknown as Family[];

export const FAMILY_BY_ID = new Map(FAMILIES.map((family) => [family.id, family]));

export function getFamily(id: FamilyId): Family {
  const family = FAMILY_BY_ID.get(id);
  if (!family) throw new Error(`Unknown family "${id}"`);
  return family;
}