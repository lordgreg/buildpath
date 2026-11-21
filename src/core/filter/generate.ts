import { getArchetype } from '../archetypes/index.ts';
import { baseTypeMeta } from '../data/base-types.ts';
import { emitFilter } from './emit.ts';
import { junkRules } from './junk.ts';
import { getPreset, STRICTNESS_LABELS_PUBLIC, type Phase, type Strictness } from './presets.ts';
import { baseTypesFor, gearRules } from './rules/gear.ts';
import { currencyRules } from './rules/currency.ts';
import { gemRules } from './rules/gems.ts';
import { mapRules } from './rules/maps.ts';
import { uniqueRules } from './rules/uniques.ts';
import type { Rule } from './types.ts';
import { filterNameFor, validateFilter, type FilterIssue } from './validate.ts';

export interface Sections {
  gear: boolean;
  gems: boolean;
  currency: boolean;
  maps: boolean;
  uniques: boolean;
}

export const DEFAULT_SECTIONS: Sections = {
  gear: true,
  gems: true,
  currency: true,
  maps: true,
  uniques: true,
};

export const SECTION_KEYS = Object.keys(DEFAULT_SECTIONS) as (keyof Sections)[];

export interface FilterConfig {
  archetypeId: string;
  phase: Phase;
  strictness: Strictness;
  sections?: Sections;
}

export interface GeneratedFilter {
  text: string;
  fileName: string;
  ruleCount: number;
  baseTypeCount: number;
  sections: Sections;
  warnings: FilterIssue[];
}

export function normalizeSections(sections?: Partial<Sections>): Sections {
  return { ...DEFAULT_SECTIONS, ...sections };
}

export function generateFilter(config: FilterConfig): GeneratedFilter {
  const archetype = getArchetype(config.archetypeId);
  if (!archetype) {
    throw new Error(`Unknown archetype "${config.archetypeId}"`);
  }

  const preset = getPreset(config.phase, config.strictness);
  const sections = normalizeSections(config.sections);
  const rules: Rule[] = [];
  const baseTypes = new Set<string>();

  for (const spec of Object.values(archetype.slots)) {
    if (!spec) continue;
    for (const base of baseTypesFor(spec)) baseTypes.add(base);
  }

  if (sections.gear) rules.push(...gearRules(archetype, preset));
  if (sections.gems) rules.push(...gemRules(preset));
  if (sections.currency) rules.push(...currencyRules(preset));
  if (sections.maps) rules.push(...mapRules(preset, config.phase));
  if (sections.uniques) rules.push(...uniqueRules());

  rules.push(...junkRules(archetype, preset, config.phase));

  const header = [
    '========================================================================',
    'FilterPath - build-specific loot filter',
    `Build: ${archetype.name} - ${archetype.class} / ${archetype.ascendancy}`,
    `Phase: ${config.phase === 'leveling' ? 'Leveling' : 'Endgame'} - ${STRICTNESS_LABELS_PUBLIC[config.strictness]}`,
    `League: ${archetype.verifiedFor}`,
    `Rules: ${rules.length} - Base types: ${baseTypes.size}`,
    `Base data: RePoE ${baseTypeMeta.ref} (${baseTypeMeta.sha256.slice(0, 8)})`,
    'Generated at https://lordgreg.github.io/filterpath/',
    'Not affiliated with or endorsed by Grinding Gear Games.',
    '========================================================================',
  ];

  const text = emitFilter(header, rules);

  return {
    text,
    fileName: filterNameFor(
      `FilterPath-${archetype.id}-${config.phase}-${config.strictness}`,
    ),
    ruleCount: rules.length,
    baseTypeCount: baseTypes.size,
    sections,
    warnings: validateFilter(text),
  };
}