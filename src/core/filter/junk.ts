import { EQUIPMENT_CLASSES } from './classes.ts';
import type { Phase, Preset } from './presets.ts';
import { usedFilterClasses } from './rules/gear.ts';
import type { Archetype } from '../archetypes/types.ts';
import type { Rule } from './types.ts';

export function junkRules(
  archetype: Archetype,
  preset: Preset,
  phase: Phase,
): Rule[] {
  const used = usedFilterClasses(archetype);
  const unused = EQUIPMENT_CLASSES.filter((name) => !used.has(name));
  const allEquipment = [...EQUIPMENT_CLASSES];
  const rules: Rule[] = [];

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

  if (phase === 'endgame' && preset.id.endsWith('very-strict')) {
    rules.push({
      action: 'Hide',
      comment: 'Rare gear - slots this build does not use',
      classNames: unused,
      rarity: 'Rare',
    });
  }

  return rules;
}