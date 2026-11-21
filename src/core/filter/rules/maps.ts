import type { Phase, Preset } from '../presets.ts';
import { SLOT_STYLES, type Rule } from '../types.ts';

export function mapRules(preset: Preset, phase: Phase): Rule[] {
  const rules: Rule[] = [];

  if (phase === 'endgame' && preset.mapMinTier !== null) {
    rules.push({
      action: 'Show',
      comment: `Maps - tier ${preset.mapMinTier}+`,
      classNames: ['Maps'],
      mapTier: { min: preset.mapMinTier },
      style: SLOT_STYLES.map,
    });

    if (preset.mapMinTier > 1) {
      rules.push({
        action: 'Hide',
        comment: 'Maps - below tier cutoff',
        classNames: ['Maps'],
      });
    }
  }

  rules.push({
    action: 'Show',
    comment: 'Map fragments',
    classNames: ['Map Fragments'],
    style: {
      textColor: SLOT_STYLES.map.textColor,
      borderColor: SLOT_STYLES.map.borderColor,
      fontSize: 36,
    },
  });

  return rules;
}