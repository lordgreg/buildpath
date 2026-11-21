import {
  DEFAULT_SECTIONS,
  SECTION_KEYS,
  type Sections,
} from '../core/filter/generate.ts';
import type { Phase, Strictness } from '../core/filter/presets.ts';
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
  sections: DEFAULT_SECTIONS,
};

const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['normal', 'strict', 'very-strict'];

function fill(selection: BuildSelection): Omit<WizardState, 'phase' | 'strictness' | 'sections'> {
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
  const common = {
    phase: phase && PHASES.includes(phase) ? phase : DEFAULT_STATE.phase,
    strictness:
      strictness && STRICTNESS.includes(strictness)
        ? strictness
        : DEFAULT_STATE.strictness,
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
    'sections',
    SECTION_KEYS.filter((key) => state.sections[key]).join(','),
  );
  return params.toString();
}