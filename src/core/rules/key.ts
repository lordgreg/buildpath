import type { BuildSelection } from '../../meta/types.ts';

/**
 * Key for a build's My rules. Rules follow the selected build, not the phase,
 * strictness or theme, so changing those never hides or discards them.
 * From-scratch rules are shared by both starting points.
 */
export function configKey(selection: BuildSelection): string {
  if (selection.mode === 'scratch') return 'scratch';

  if (selection.mode === 'family') {
    return `family:${selection.familyId ?? 'minion'}`;
  }

  if (selection.mode === 'ascendancy') {
    return `ascendancy:${selection.ascendancyId ?? 'necromancer'}`;
  }

  if (selection.mode === 'build') {
    return `build:${selection.buildId ?? ''}`;
  }

  return [
    'meta',
    selection.leagueId ?? '',
    selection.skillId ?? '',
    selection.ascendancyId ?? '',
  ].join(':');
}