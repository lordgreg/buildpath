export { toFilterClass } from '../data/classes.ts';

import equipment from '../data/equipment-classes.json';

/** Every equipment class the junk rules may hide. */
export const EQUIPMENT_CLASSES: readonly string[] = equipment;

export const FLASK_CLASSES = equipment.filter((name) =>
  name.endsWith('Flasks'),
);