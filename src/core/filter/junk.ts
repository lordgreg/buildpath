import { EQUIPMENT_CLASSES } from './classes.ts';
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

  if (preset.gear.magicMinItemLevel === null) {
    rules.push({
      action: 'Hide',
      comment: 'Magic gear',
      classNames: allEquipment,
      rarity: 'Magic',
    });
  } else {
    if (unused.length > 0) {
      rules.push({
        action: 'Hide',
        comment: 'Magic gear - slots this build does not use',
        classNames: unused,
        rarity: 'Magic',
      });
    }
    rules.push({
      action: 'Hide',
      comment: `Magic gear - below item level ${preset.gear.magicMinItemLevel}`,
      classNames: allEquipment,
      rarity: 'Magic',
      itemLevel: { max: preset.gear.magicMinItemLevel - 1 },
    });
  }

  rules.push({
    action: 'Hide',
    comment: 'Normal gear',
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