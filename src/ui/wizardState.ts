import { DEFAULT_SECTIONS, type Sections } from '../core/filter/generate.ts';
import { buildHashParams } from '../core/filter/hash.ts';
import {
  coerceStrictness,
  type Phase,
  type Strictness,
} from '../core/filter/presets.ts';
import { coerceThemeId, type ThemeId } from '../core/filter/themes.ts';
import { configKey } from '../core/rules/key.ts';
import { getAscendancy } from '../meta/ascendancies.ts';
import { getSkill } from '../meta/index.ts';
import {
  coerceSelection,
  CURRENT_LEAGUE_ID,
  legacySelection,
} from '../meta/index.ts';
import type { BuildMode, BuildSelection, FamilyId } from '../meta/types.ts';

/** The build modes plus `start`, the empty builder with nothing selected. */
export type WizardMode = BuildMode | 'start';

/** A wizard state with a real mode; the empty `start` state is excluded. */
export type SelectedState = WizardState & { mode: BuildMode };

/** Narrows a state known to have a mode. Callers guard `mode !== 'start'`. */
export function asSelected(state: WizardState): SelectedState {
  return state as SelectedState;
}

export interface WizardState {
  /** User-facing build name; empty means derive it from the selection. */
  name: string;
  mode: WizardMode;
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
  mode: 'start',
  familyId: DEFAULT_FAMILY,
  ascendancyId: DEFAULT_ASCENDANCY,
  leagueId: CURRENT_LEAGUE_ID,
  skillId: DEFAULT_SKILL,
  scratchStart: 'hide',
  phase: 'leveling',
  strictness: 'soft',
  theme: 'rarity',
  sections: DEFAULT_SECTIONS,
};

const PHASES: Phase[] = ['leveling', 'endgame'];

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
  const phase = input.phase === 'endgame' ? 'endgame' : 'leveling';
  const strictness = coerceStrictness(input.strictness);
  const theme = coerceThemeId(input.theme);
  const name =
    typeof input.name === 'string' ? input.name.trim().slice(0, 80) : '';

  const mode = input.mode;
  // Missing or `start`: a brand-new, empty filter with nothing selected.
  if (
    mode !== 'family' &&
    mode !== 'ascendancy' &&
    mode !== 'meta' &&
    mode !== 'scratch'
  ) {
    return { ...DEFAULT_STATE, name, phase, strictness, theme };
  }

  const selection = coerceSelection({
    mode,
    familyId: input.familyId,
    ascendancyId: input.ascendancyId,
    leagueId: input.leagueId,
    skillId: input.skillId,
    scratchStart: input.scratchStart,
  });

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
  const chosenStrictness = coerceStrictness(params.get('strictness'));

  const themeParam = params.get('theme');
  const theme = coerceThemeId(themeParam);

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

  const modeParam = params.get('mode') as WizardMode | null;
  if (modeParam === 'start') return { ...DEFAULT_STATE, ...common };

  const hasSkill = params.get('skill') !== null;
  const hasFamily = params.get('family') !== null;
  const hasAscendancy = params.get('ascendancy') !== null;

  // An empty hash opens the empty builder, not the old family default.
  if (modeParam === null && !hasSkill && !hasFamily && !hasAscendancy) {
    return { ...DEFAULT_STATE, ...common };
  }

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
  if (state.mode === 'start') return 'mode=start';
  return buildHashParams({
    selection: asSelected(state),
    phase: state.phase,
    strictness: state.strictness,
    theme: state.theme,
    name: state.name,
  });
}

/** Key for a build's My rules. `start` keeps no rules of its own. */
export function ruleKey(state: WizardState): string {
  return state.mode === 'start' ? 'start' : configKey(asSelected(state));
}