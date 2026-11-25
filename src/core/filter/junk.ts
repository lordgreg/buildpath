import { EQUIPMENT_CLASSES, FLASK_CLASSES } from './classes.ts';
import type { Preset } from './presets.ts';
import {
  baseTypesFor,
  filterClassesFor,
  usedFilterClasses,
} from './rules/gear.ts';
import type { Archetype } from '../archetypes/types.ts';
import type { Rule } from './types.ts';

export function junkRules(archetype: Archetype, preset: Preset): Rule[] {
  const used = usedFilterClasses(archetype);
  const unused = EQUIPMENT_CLASSES.filter((name) => !used.has(name));
  const allEquipment = [...EQUIPMENT_CLASSES];
  // Magic flasks are the everyday endgame consumable; the all-Magic hide keeps
  // them visible. Unused flask classes are still caught by the per-slot hide.
  const flaskClasses = new Set<string>(FLASK_CLASSES);
  const magicEquipment = allEquipment.filter((name) => !flaskClasses.has(name));
  const unusedFlasks = unused.filter((name) => flaskClasses.has(name));
  const rules: Rule[] = [];

  // Classes where the build allows only some bases, e.g. int helmets but not
  // str helmets. Anything in these classes that no Show rule matched is noise.
  const restricted = new Set<string>();
  const unrestricted = new Set<string>();
  for (const spec of Object.values(archetype.slots)) {
    if (!spec) continue;
    const classes = filterClassesFor(spec);
    if (baseTypesFor(spec).length === 0) {
      for (const name of classes) unrestricted.add(name);
    } else {
      for (const name of classes) restricted.add(name);
    }
  }
  for (const name of unrestricted) restricted.delete(name);

  // The gear rules run first and fully define what the preset keeps at the
  // item's area level. Anything they did not match is noise, whatever its
  // item level: the floors live in the stages now, not in this file.
  rules.push({
    action: 'Hide',
    comment: 'Magic gear - not kept by the preset',
    classNames: magicEquipment,
    rarity: 'Magic',
  });
  if (unusedFlasks.length > 0) {
    rules.push({
      action: 'Hide',
      comment: 'Magic gear - flask classes this build does not use',
      classNames: unusedFlasks,
      rarity: 'Magic',
    });
  }

  rules.push({
    action: 'Hide',
    comment: 'Normal gear - not kept by the preset',
    classNames: allEquipment,
    rarity: 'Normal',
  });

  if (preset.gear.rareMinItemLevel > 1) {
    rules.push({
      action: 'Hide',
      comment: `Rare gear - below item level ${preset.gear.rareMinItemLevel}`,
      classNames: [...used],
      rarity: 'Rare',
      itemLevel: { max: preset.gear.rareMinItemLevel - 1 },
    });
  }

  if (unused.length > 0) {
    rules.push({
      action: 'Hide',
      comment: 'Rare gear - slots this build does not use',
      classNames: unused,
      rarity: 'Rare',
    });
  }

  if (restricted.size > 0) {
    rules.push({
      action: 'Hide',
      comment: 'Gear - bases this build does not use',
      classNames: [...restricted].sort(),
    });
  }

  return rules;
}