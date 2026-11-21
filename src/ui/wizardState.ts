import { DEFAULT_SECTIONS, SECTION_KEYS, type Sections } from '../core/filter/generate.ts';
import type { Phase, Strictness } from '../core/filter/presets.ts';
import { getArchetype } from '../core/archetypes/index.ts';

export interface WizardState {
  archetypeId: string;
  phase: Phase;
  strictness: Strictness;
  sections: Sections;
}

export const DEFAULT_STATE: WizardState = {
  archetypeId: 'necro-minions',
  phase: 'leveling',
  strictness: 'normal',
  sections: DEFAULT_SECTIONS,
};

const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['normal', 'strict', 'very-strict'];

export function parseWizardHash(hash: string): WizardState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  const archetypeId = params.get('archetype') ?? '';
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
    archetypeId: getArchetype(archetypeId)
      ? archetypeId
      : DEFAULT_STATE.archetypeId,
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
  params.set('archetype', state.archetypeId);
  params.set('phase', state.phase);
  params.set('strictness', state.strictness);
  params.set(
    'sections',
    SECTION_KEYS.filter((key) => state.sections[key]).join(','),
  );
  return params.toString();
}