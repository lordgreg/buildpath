import {
  DEFAULT_SECTIONS,
  SECTION_KEYS,
  type Sections,
} from '../core/filter/generate.ts';
import type { Phase, Strictness } from '../core/filter/presets.ts';
import {
  coerceSelection,
  legacySelection,
} from '../meta/index.ts';
import type { BuildSelection, FamilyId } from '../meta/types.ts';

export interface WizardState extends BuildSelection {
  phase: Phase;
  strictness: Strictness;
  sections: Sections;
}

export const DEFAULT_STATE: WizardState = {
  ...coerceSelection(),
  phase: 'leveling',
  strictness: 'normal',
  sections: DEFAULT_SECTIONS,
};

const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['normal', 'strict', 'very-strict'];

export function parseWizardHash(hash: string): WizardState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  const legacyId = params.get('archetype');
  const legacy = legacyId ? legacySelection(legacyId) : null;

  const selection =
    legacy ??
    coerceSelection({
      leagueId: params.get('league') ?? undefined,
      familyId: (params.get('family') as FamilyId | null) ?? undefined,
      skillId: params.get('skill') ?? undefined,
      ascendancyId: params.get('ascendancy') ?? undefined,
    });

  const phase = params.get('phase') as Phase | null;
  const strictness = params.get('strictness') as Strictness | null;

  const sections = { ...DEFAULT_SECTIONS };
  const sectionList = params.get('sections');
  if (sectionList !== null) {
    const wanted = new Set(sectionList.split(',').filter(Boolean));
    for (const key of SECTION_KEYS) {
      sections[key] = wanted.has(key);
    }
  }

  return {
    ...selection,
    phase: phase && PHASES.includes(phase) ? phase : DEFAULT_STATE.phase,
    strictness:
      strictness && STRICTNESS.includes(strictness)
        ? strictness
        : DEFAULT_STATE.strictness,
    sections,
  };
}

export function wizardHash(state: WizardState): string {
  const params = new URLSearchParams();
  params.set('league', state.leagueId);
  params.set('family', state.familyId);
  params.set('skill', state.skillId);
  params.set('ascendancy', state.ascendancyId);
  params.set('phase', state.phase);
  params.set('strictness', state.strictness);
  params.set(
    'sections',
    SECTION_KEYS.filter((key) => state.sections[key]).join(','),
  );
  return params.toString();
}