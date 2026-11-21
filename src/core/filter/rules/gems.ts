import type { Preset } from '../presets.ts';
import { SLOT_STYLES, type Rule } from '../types.ts';

const GEM_CLASSES = ['Skill Gems', 'Support Gems'];

export function gemRules(preset: Preset): Rule[] {
  const rules: Rule[] = [
    {
      action: 'Show',
      comment:
        preset.gemMinQuality === null
          ? 'Gems'
          : `Gems - quality ${preset.gemMinQuality}+`,
      classNames: GEM_CLASSES,
      ...(preset.gemMinQuality !== null
        ? { quality: { min: preset.gemMinQuality } }
        : {}),
      style: SLOT_STYLES.gem,
    },
  ];

  if (preset.gemMinQuality !== null) {
    rules.push({
      action: 'Hide',
      comment: 'Gems - below quality cutoff',
      classNames: GEM_CLASSES,
    });
  }

  return rules;
}