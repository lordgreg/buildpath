import type { BuildSelection } from '../../meta/types.ts';
import type { Phase, Strictness } from './presets.ts';
import type { ThemeId } from './themes.ts';

export interface BuildHashInput {
  selection: BuildSelection;
  phase: Phase;
  strictness: Strictness;
  theme?: ThemeId;
  name?: string;
}

/**
 * The query string that identifies a build: selection, phase, strictness, theme
 * and name. One source of truth for the URL hash (shareable links and the loot
 * simulator) and the `Selection:` header line, so any generated filter can be
 * loaded back into the builder exactly.
 */
export function buildHashParams(input: BuildHashInput): string {
  const params = new URLSearchParams();
  const { selection } = input;
  params.set('mode', selection.mode);

  if (selection.mode === 'scratch') {
    params.set(
      'scratchStart',
      selection.scratchStart === 'show' ? 'show' : 'hide',
    );
  } else if (selection.mode === 'family') {
    params.set('family', selection.familyId ?? 'minion');
  } else if (selection.mode === 'ascendancy') {
    params.set('ascendancy', selection.ascendancyId ?? 'necromancer');
  } else {
    params.set('league', selection.leagueId ?? '');
    params.set('family', selection.familyId ?? '');
    params.set('skill', selection.skillId ?? '');
    params.set('ascendancy', selection.ascendancyId ?? '');
  }

  if (selection.mode !== 'scratch') {
    params.set('phase', input.phase);
    params.set('strictness', input.strictness);
  }
  if (input.theme) params.set('theme', input.theme);
  if (input.name?.trim()) params.set('name', input.name.trim());
  return params.toString();
}
