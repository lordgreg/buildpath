import {
  DEFAULT_SECTIONS,
  SECTION_KEYS,
  type Sections,
} from '../core/filter/generate.ts';
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
  mode: BuildMode;
  familyId: FamilyId;
  ascendancyId: string;
  leagueId: string;
  skillId: string;
  phase: Phase;
  strictness: Strictness;
  sectionStrictness: Record<keyof Sections, Strictness>;
  theme: ThemeId;
  sections: Sections;
}

const DEFAULT_FAMILY: FamilyId = 'minion';
const DEFAULT_ASCENDANCY = 'necromancer';
const DEFAULT_SKILL = 'summon-skeletons';

export const DEFAULT_STATE: WizardState = {
  mode: 'family',
  familyId: DEFAULT_FAMILY,
  ascendancyId: DEFAULT_ASCENDANCY,
  leagueId: CURRENT_LEAGUE_ID,
  skillId: DEFAULT_SKILL,
  phase: 'leveling',
  strictness: 'normal',
  sectionStrictness: Object.fromEntries(
    SECTION_KEYS.map((key) => [key, 'normal']),
  ) as Record<keyof Sections, Strictness>,
  theme: 'classic',
  sections: DEFAULT_SECTIONS,
};

const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['normal', 'strict', 'very-strict'];

function fill(selection: BuildSelection): Pick<
  WizardState,
  'mode' | 'familyId' | 'ascendancyId' | 'leagueId' | 'skillId'
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
  };
}

export function parseWizardHash(hash: string): WizardState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  const sections = { ...DEFAULT_SECTIONS };
  const sectionList = params.get('sections');
  if (sectionList !== null) {
    const wanted = new Set(sectionList.split(',').filter(Boolean));
    for (const key of SECTION_KEYS) {
      sections[key] = wanted.has(key);
    }
  }

  const phase = params.get('phase') as Phase | null;
  const strictness = params.get('strictness') as Strictness | null;
  const chosenStrictness =
    strictness && STRICTNESS.includes(strictness)
      ? strictness
      : DEFAULT_STATE.strictness;

  const sectionStrictness = Object.fromEntries(
    SECTION_KEYS.map((key) => [key, chosenStrictness]),
  ) as Record<keyof Sections, Strictness>;
  const sstrict = params.get('sstrict');
  if (sstrict) {
    for (const part of sstrict.split(',')) {
      const [key, value] = part.split(':') as [
        keyof Sections,
        Strictness,
      ];
      if (SECTION_KEYS.includes(key) && STRICTNESS.includes(value)) {
        sectionStrictness[key] = value;
      }
    }
  }

  const themeParam = params.get('theme');
  const theme = isThemeId(themeParam) ? themeParam : DEFAULT_STATE.theme;

  const common = {
    phase: phase && PHASES.includes(phase) ? phase : DEFAULT_STATE.phase,
    strictness: chosenStrictness,
    sectionStrictness,
    theme,
    sections,
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
    modeParam === 'meta'
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
  });

  return { ...fill(selection), ...common };
}

export function wizardHash(state: WizardState): string {
  const params = new URLSearchParams();
  params.set('mode', state.mode);

  if (state.mode === 'family') {
    params.set('family', state.familyId);
  } else if (state.mode === 'ascendancy') {
    params.set('ascendancy', state.ascendancyId);
  } else {
    params.set('league', state.leagueId);
    params.set('family', state.familyId);
    params.set('skill', state.skillId);
    params.set('ascendancy', state.ascendancyId);
  }

  params.set('phase', state.phase);
  params.set('strictness', state.strictness);
  params.set(
    'sstrict',
    SECTION_KEYS.map((key) => `${key}:${state.sectionStrictness[key]}`).join(
      ',',
    ),
  );
  params.set('theme', state.theme);
  params.set(
    'sections',
    SECTION_KEYS.filter((key) => state.sections[key]).join(','),
  );
  return params.toString();
}