import type { CharacterClass } from '../core/archetypes/types.ts';

/**
 * Reviewed source of truth for the ascendancy ladder. The game has no RePoE
 * dataset for ascendancies, so `ascendancies.yaml` is hand-maintained; this
 * list pins the expected id, name and class. A registry test fails the build
 * when the YAML drifts, so a new or removed league ascendancy is a deliberate
 * review instead of a silent change.
 */
export interface ExpectedAscendancy {
  id: string;
  name: string;
  class: CharacterClass;
}

export const EXPECTED_ASCENDANCIES: ExpectedAscendancy[] = [
  { id: 'ascendant', name: 'Ascendant', class: 'Scion' },
  { id: 'luminary', name: 'Luminary', class: 'Scion' },
  { id: 'reliquarian', name: 'Reliquarian', class: 'Scion' },
  { id: 'juggernaut', name: 'Juggernaut', class: 'Marauder' },
  { id: 'berserker', name: 'Berserker', class: 'Marauder' },
  { id: 'chieftain', name: 'Chieftain', class: 'Marauder' },
  { id: 'deadeye', name: 'Deadeye', class: 'Ranger' },
  { id: 'warden', name: 'Warden', class: 'Ranger' },
  { id: 'pathfinder', name: 'Pathfinder', class: 'Ranger' },
  { id: 'slayer', name: 'Slayer', class: 'Duelist' },
  { id: 'gladiator', name: 'Gladiator', class: 'Duelist' },
  { id: 'champion', name: 'Champion', class: 'Duelist' },
  { id: 'necromancer', name: 'Necromancer', class: 'Witch' },
  { id: 'elementalist', name: 'Elementalist', class: 'Witch' },
  { id: 'occultist', name: 'Occultist', class: 'Witch' },
  { id: 'inquisitor', name: 'Inquisitor', class: 'Templar' },
  { id: 'hierophant', name: 'Hierophant', class: 'Templar' },
  { id: 'guardian', name: 'Guardian', class: 'Templar' },
  { id: 'assassin', name: 'Assassin', class: 'Shadow' },
  { id: 'trickster', name: 'Trickster', class: 'Shadow' },
  { id: 'saboteur', name: 'Saboteur', class: 'Shadow' },
];
