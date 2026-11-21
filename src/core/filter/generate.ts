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
import type { Rule, RuleSection } from './types.ts';
import { applyTheme, type ThemeId } from './themes.ts';
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
  /** New family/ascendancy/meta selection. Takes precedence. */
  selection?: BuildSelection;
  phase: Phase;
  strictness: Strictness;
  sections?: Sections;
  /** Per-section override of the global strictness. */
  sectionStrictness?: Partial<Record<keyof Sections, Strictness>>;
  /** Visual theme applied after rule generation. */
  theme?: ThemeId;
  /** Cloned rule set; replaces the generated rules for this config. */
  rulesOverride?: Rule[];
  /** Build version embedded in the header and file name. */
  version?: string;
}

export interface CompiledFilter {
  archetype: Archetype;
  preset: Preset;
  sections: Sections;
  version: string;
  theme: ThemeId;
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
  const theme = config.theme ?? 'classic';
  const strictnessFor = (key: keyof Sections): Strictness =>
    config.sectionStrictness?.[key] ?? config.strictness;

  if (config.rulesOverride) {
    const rules = config.rulesOverride
      .filter((rule) => !rule.disabled)
      .map((rule, index) => ({
        ...rule,
        id: rule.id ?? `custom-${index}`,
        section: rule.section ?? ('custom' as RuleSection),
      }));
    const bases = new Set(rules.flatMap((rule) => rule.baseTypes ?? []));
    return {
      archetype,
      preset,
      sections,
      version,
      theme,
      rules: applyTheme(rules, theme),
      baseTypes: [...bases].sort(),
    };
  }

  const rules: Rule[] = [];
  const baseTypes = new Set<string>();

  for (const spec of Object.values(archetype.slots)) {
    if (!spec) continue;
    for (const base of baseTypesFor(spec)) baseTypes.add(base);
  }

  const add = (section: RuleSection, generated: Rule[]) => {
    for (const rule of generated) {
      rules.push({
        ...rule,
        id: `${section}-${rules.length}`,
        section,
      });
    }
  };

  if (sections.gear) {
    add('gear', gearRules(archetype, getPreset(config.phase, strictnessFor('gear'))));
  }
  if (sections.gems) {
    add('gems', gemRules(getPreset(config.phase, strictnessFor('gems'))));
  }
  if (sections.currency) {
    add(
      'currency',
      currencyRules(getPreset(config.phase, strictnessFor('currency'))),
    );
  }
  if (sections.maps) {
    add(
      'maps',
      mapRules(getPreset(config.phase, strictnessFor('maps')), config.phase),
    );
  }
  if (sections.uniques) {
    add('uniques', uniqueRules());
  }

  add(
    'junk',
    junkRules(
      archetype,
      getPreset(config.phase, strictnessFor('gear')),
      config.phase,
    ),
  );

  return {
    archetype,
    preset,
    sections,
    version,
    theme,
    rules: applyTheme(rules, theme),
    baseTypes: [...baseTypes].sort(),
  };
}

export function generateFilter(config: FilterConfig): GeneratedFilter {
  const compiled = compileFilter(config);

  const deviations = (Object.keys(config.sectionStrictness ?? {}) as (keyof Sections)[])
    .filter(
      (key) =>
        config.sectionStrictness?.[key] !== undefined &&
        config.sectionStrictness[key] !== config.strictness,
    )
    .map((key) => `${key}=${config.sectionStrictness![key]}`);

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
    ...(deviations.length > 0
      ? [`Section strictness: ${deviations.join(', ')}`]
      : []),
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