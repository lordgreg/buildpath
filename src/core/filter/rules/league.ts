import { COLORS, type Rule } from '../types.ts';

/**
 * Covens league drops. The Wickerman turns viscera into attachments, so these
 * are worth a distinct backdrop even when the preset does not force-show them.
 */
export const LEAGUE_CLASSES = ['Viscera'];

export function leagueRules(): Rule[] {
  if (LEAGUE_CLASSES.length === 0) return [];

  return [
    {
      action: 'Show',
      comment: 'League drops - Viscera',
      classNames: [...LEAGUE_CLASSES],
      styleKind: 'league',
      style: {
        textColor: COLORS.orange,
        borderColor: COLORS.orange,
        fontSize: 38,
      },
    },
  ];
}
