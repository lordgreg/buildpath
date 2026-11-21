import { DEFAULT_SECTIONS, type Sections } from '../core/filter/generate.ts';
import type { Phase, Strictness } from '../core/filter/presets.ts';
import { isThemeId, type ThemeId } from '../core/filter/themes.ts';
import { getAscendancy } from '../meta/ascendancies.ts';
import { getSkill } from '../meta/index.ts';
import {
  coerceSelection,
  CURRENT_LEAGUE_ID,
  legacySelection,
} from '../meta/index.ts';
import type { BuildMode, BuildSelection, FamilyId } from '../meta/types.ts';

export interface WizardState {
  /** User-facing build name; empty means derive it from the selection. */
  name: string;
  mode: BuildMode;
  familyId: FamilyId;
  ascendancyId: string;
  leagueId: string;
  skillId: string;
  scratchStart: 'hide' | 'show';
  phase: Phase;
  strictness: Strictness;
  theme: ThemeId;
  sections: Sections;
}

const DEFAULT_FAMILY: FamilyId = 'minion';
const DEFAULT_ASCENDANCY = 'necromancer';
const DEFAULT_SKILL = 'summon-skeletons';

export const DEFAULT_STATE: WizardState = {
  name: '',
  mode: 'family',
  familyId: DEFAULT_FAMILY,
  ascendancyId: DEFAULT_ASCENDANCY,
  leagueId: CURRENT_LEAGUE_ID,
  skillId: DEFAULT_SKILL,
  scratchStart: 'hide',
  phase: 'leveling',
  strictness: 'normal',
  theme: 'classic',
  sections: DEFAULT_SECTIONS,
};

const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['normal', 'strict', 'very-strict'];

function fill(selection: BuildSelection): Pick<
  WizardState,
  'mode' | 'familyId' | 'ascendancyId' | 'leagueId' | 'skillId' | 'scratchStart'
> {
  const skill = getSkill(
    selection.leagueId ?? CURRENT_LEAGUE_ID,
    selection.skillId ?? DEFAULT_SKILL,
  );
  return {
    mode: selection.mode,
    familyId:
      selection.familyId ??
      (selection.ascendancyId
        ? getAscendancy(selection.ascendancyId).defaultFamily
        : skill?.family ?? DEFAULT_FAMILY),
    ascendancyId:
      selection.ascendancyId ??
      (selection.familyId === 'minion'
        ? 'necromancer'
        : DEFAULT_ASCENDANCY),
    leagueId: selection.leagueId ?? CURRENT_LEAGUE_ID,
    skillId: selection.skillId ?? skill?.id ?? DEFAULT_SKILL,
    scratchStart: selection.scratchStart === 'show' ? 'show' : 'hide',
  };
}

export function coerceWizardState(input: Partial<WizardState>): WizardState {
  const selection = coerceSelection({
    mode: input.mode,
    familyId: input.familyId,
    ascendancyId: input.ascendancyId,
    leagueId: input.leagueId,
    skillId: input.skillId,
    scratchStart: input.scratchStart,
  });
  const phase = input.phase === 'endgame' ? 'endgame' : 'leveling';
  const strictness =
    input.strictness && STRICTNESS.includes(input.strictness)
      ? input.strictness
      : 'normal';
  const theme = isThemeId(input.theme) ? input.theme : 'classic';
  const name =
    typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '';

  return {
    ...DEFAULT_STATE,
    ...selection,
    name,
    scratchStart: input.scratchStart === 'show' ? 'show' : 'hide',
    phase,
    strictness,
    theme,
    sections: DEFAULT_SECTIONS,
  };
}

export function parseWizardHash(hash: string): WizardState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  const phase = params.get('phase') as Phase | null;
  const strictness = params.get('strictness') as Strictness | null;
  const chosenStrictness =
    strictness && STRICTNESS.includes(strictness)
      ? strictness
      : DEFAULT_STATE.strictness;

  const themeParam = params.get('theme');
  const theme = isThemeId(themeParam) ? themeParam : DEFAULT_STATE.theme;

  const common = {
    name: (params.get('name') ?? '').trim().slice(0, 80),
    phase: phase && PHASES.includes(phase) ? phase : DEFAULT_STATE.phase,
    strictness: chosenStrictness,
    theme,
    sections: DEFAULT_SECTIONS,
  };

  const legacyId = params.get('archetype');
  if (legacyId) {
    const legacy = legacySelection(legacyId);
    if (legacy) return { ...fill(legacy), ...common };
  }

  const modeParam = params.get('mode') as BuildMode | null;
  const hasSkill = params.get('skill') !== null;
  const hasFamily = params.get('family') !== null;
  const hasAscendancy = params.get('ascendancy') !== null;

  const mode: BuildMode =
    modeParam === 'family' ||
    modeParam === 'ascendancy' ||
    modeParam === 'meta' ||
    modeParam === 'scratch'
      ? modeParam
      : hasSkill
        ? 'meta'
        : hasAscendancy && !hasFamily
          ? 'ascendancy'
          : 'family';

  const selection = coerceSelection({
    mode,
    familyId: (params.get('family') as FamilyId | null) ?? undefined,
    ascendancyId: params.get('ascendancy') ?? undefined,
    leagueId: params.get('league') ?? undefined,
    skillId: params.get('skill') ?? undefined,
    scratchStart:
      params.get('scratchStart') === 'show' ? 'show' : 'hide',
  });

  return { ...fill(selection), ...common };
}

export function wizardHash(state: WizardState): string {
  const params = new URLSearchParams();
  params.set('mode', state.mode);

  if (state.mode === 'scratch') {
    params.set('scratchStart', state.scratchStart);
  } else if (state.mode === 'family') {
    params.set('family', state.familyId);
  } else if (state.mode === 'ascendancy') {
    params.set('ascendancy', state.ascendancyId);
  } else {
    params.set('league', state.leagueId);
    params.set('family', state.familyId);
    params.set('skill', state.skillId);
    params.set('ascendancy', state.ascendancyId);
  }

  if (state.mode !== 'scratch') {
    params.set('phase', state.phase);
    params.set('strictness', state.strictness);
  }
  params.set('theme', state.theme);
  if (state.name.trim()) params.set('name', state.name.trim());
  return params.toString();
}