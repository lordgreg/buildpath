import { getArchetype } from '../archetypes/index.ts';
import type { Archetype } from '../archetypes/types.ts';
import { resolveBuild } from '../../meta/resolve.ts';
import type { BuildSelection } from '../../meta/types.ts';
import { baseTypeMeta } from '../data/base-types.ts';
import { emitFilter } from './emit.ts';
import { junkRules } from './junk.ts';
import {
  getPreset,
  STRICTNESS_LABELS_PUBLIC,
  type Phase,
  type Preset,
  type Strictness,
} from './presets.ts';
import { baseTypesFor, gearRules } from './rules/gear.ts';
import { currencyRules } from './rules/currency.ts';
import { gemRules } from './rules/gems.ts';
import { mapRules } from './rules/maps.ts';
import { uniqueRules } from './rules/uniques.ts';
import type { Rule } from './types.ts';
import { filterNameFor, validateFilter, type FilterIssue } from './validate.ts';
import { DEFAULT_FILTER_VERSION, FILTER_FORMAT_VERSION } from './version.ts';

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
  /** Legacy 12-build selector; kept for old links and goldens. */
  archetypeId?: string;
  /** New family -> skill -> ascendancy selection. Takes precedence. */
  selection?: BuildSelection;
  phase: Phase;
  strictness: Strictness;
  sections?: Sections;
  /** Build version embedded in the header and file name. */
  version?: string;
}

export interface CompiledFilter {
  archetype: Archetype;
  preset: Preset;
  sections: Sections;
  version: string;
  rules: Rule[];
  baseTypes: string[];
}

export interface GeneratedFilter extends CompiledFilter {
  text: string;
  fileName: string;
  ruleCount: number;
  baseTypeCount: number;
  warnings: FilterIssue[];
}

export function normalizeSections(sections?: Partial<Sections>): Sections {
  return { ...DEFAULT_SECTIONS, ...sections };
}

/**
 * Builds the rule list without serialising it. The preview matcher consumes
 * the same rules the filter is generated from, so they cannot drift.
 */
export function compileFilter(config: FilterConfig): CompiledFilter {
  const archetype = config.selection
    ? resolveBuild(config.selection)
    : getArchetype(config.archetypeId ?? '');
  if (!archetype) {
    throw new Error(
      config.archetypeId
        ? `Unknown archetype "${config.archetypeId}"`
        : 'Provide either a selection or an archetypeId',
    );
  }

  const preset = getPreset(config.phase, config.strictness);
  const sections = normalizeSections(config.sections);
  const version = config.version ?? DEFAULT_FILTER_VERSION;
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

  return {
    archetype,
    preset,
    sections,
    version,
    rules,
    baseTypes: [...baseTypes].sort(),
  };
}

export function generateFilter(config: FilterConfig): GeneratedFilter {
  const compiled = compileFilter(config);

  const header = [
    '========================================================================',
    `FilterPath ${compiled.version} - filter format ${FILTER_FORMAT_VERSION}`,
    'Build-specific loot filter',
    `Build: ${compiled.archetype.name}${
      compiled.archetype.class
        ? ` - ${compiled.archetype.class}${
            compiled.archetype.ascendancy
              ? ` / ${compiled.archetype.ascendancy}`
              : ''
          }`
        : ''
    }`,
    `Phase: ${config.phase === 'leveling' ? 'Leveling' : 'Endgame'} - ${STRICTNESS_LABELS_PUBLIC[config.strictness]}`,
    `League: ${compiled.archetype.verifiedFor}`,
    `Rules: ${compiled.rules.length} - Base types: ${compiled.baseTypes.length}`,
    `Base data: RePoE ${baseTypeMeta.ref} (${baseTypeMeta.sha256.slice(0, 8)})`,
    'Generated at https://lordgreg.github.io/filterpath/',
    'Not affiliated with or endorsed by Grinding Gear Games.',
    '========================================================================',
  ];

  const text = emitFilter(header, compiled.rules);
  const phase = config.phase === 'leveling' ? 'lev' : 'end';

  return {
    ...compiled,
    text,
    fileName: filterNameFor(
      `FilterPath-v${compiled.version}-${compiled.archetype.id}-${
        config.selection ? phase : config.phase
      }-${config.strictness}`,
    ),
    ruleCount: compiled.rules.length,
    baseTypeCount: compiled.baseTypes.length,
    warnings: validateFilter(text),
  };
}