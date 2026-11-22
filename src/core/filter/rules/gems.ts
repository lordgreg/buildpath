import type { Preset } from '../presets.ts';
import { SLOT_STYLES, type Rule, type Style } from '../types.ts';

const GEM_CLASSES = ['Skill Gems', 'Support Gems'];

/** The gem style; the alert is dropped while leveling, where gems are silent. */
function gemStyle(alert: boolean): Style {
  const style: Style = { ...SLOT_STYLES.gem };
  if (!alert) {
    delete style.alertSound;
    delete style.alertVolume;
  }
  return style;
}

export function gemRules(preset: Preset): Rule[] {
  const { minQuality, minItemLevel, alert } = preset.gems;
  const gem = {
    classNames: GEM_CLASSES,
    styleKind: 'gem' as const,
    style: gemStyle(alert),
  };

  // No gate: show every gem.
  if (minQuality === null && minItemLevel === null) {
    return [{ action: 'Show', comment: 'Gems', ...gem }];
  }

  // A block ANDs its conditions, so the quality and level gates become two Show
  // blocks (an OR) with one Hide fallback for gems that clear neither.
  const rules: Rule[] = [];
  if (minQuality !== null) {
    rules.push({
      action: 'Show',
      comment: `Gems - quality ${minQuality}+`,
      quality: { min: minQuality },
      ...gem,
    });
  }
  if (minItemLevel !== null) {
    rules.push({
      action: 'Show',
      comment: `Gems - item level ${minItemLevel}+`,
      itemLevel: { min: minItemLevel },
      ...gem,
    });
  }
  rules.push({
    action: 'Hide',
    comment: 'Gems - below quality or level cutoff',
    classNames: GEM_CLASSES,
  });

  return rules;
}
