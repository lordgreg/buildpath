import type { Archetype } from './types.ts';
import { necroMinions } from './data/necro-minions.ts';

export const archetypes: readonly Archetype[] = [necroMinions];

export function getArchetype(id: string): Archetype | undefined {
  return archetypes.find((archetype) => archetype.id === id);
}

export type { Archetype } from './types.ts';