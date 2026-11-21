import type { Preset } from '../presets.ts';
import { SLOT_STYLES, type Rule } from '../types.ts';

const GEM_CLASSES = ['Skill Gems', 'Support Gems'];

export function gemRules(preset: Preset): Rule[] {
  const rules: Rule[] = [
    {
      action: 'Show',
      comment:
        preset.gems.minQuality === null
          ? 'Gems'
          : `Gems - quality ${preset.gems.minQuality}+`,
      classNames: GEM_CLASSES,
      ...(preset.gems.minQuality !== null
        ? { quality: { min: preset.gems.minQuality } }
        : {}),
      style: SLOT_STYLES.gem,
    },
  ];

  if (preset.gems.minQuality !== null) {
    rules.push({
      action: 'Hide',
      comment: 'Gems - below quality cutoff',
      classNames: GEM_CLASSES,
    });
  }

  return rules;
}