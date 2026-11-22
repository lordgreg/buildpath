import { getArchetype } from '../archetypes/index.ts';
import type { Archetype } from '../archetypes/types.ts';
import { PRESET_VERSION } from '../../meta/index.ts';
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
import { leagueRules } from './rules/league.ts';
import { uniqueRules } from './rules/uniques.ts';
import { COLORS, type Rule, type RuleSection } from './types.ts';
import { applyTheme, type ThemeId } from './themes.ts';
import { filterNameFor, validateFilter, type FilterIssue } from './validate.ts';
import { buildFileName } from './name.ts';
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
  /** Visual theme applied after rule generation. */
  theme?: ThemeId;
  /** User rules, evaluated before the generated preset. */
  customRules?: Rule[];
  /** Build version embedded in the header and file name. */
  version?: string;
  /** Optional user name for the downloaded file. */
  buildName?: string;
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

/** Quest items are always shown and audible, even in From Scratch hide-all. */
const QUEST_RULE: Rule = {
  action: 'Show',
  id: 'quest-items',
  section: 'quest',
  comment: 'Quest items',
  classNames: ['Quest Items'],
  style: {
    textColor: COLORS.white,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.black,
    fontSize: 40,
    alertSound: 1,
    alertVolume: 300,
    minimapIcon: { size: 1, color: 'Green', shape: 'Circle' },
  },
};

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

  const customRules = (config.customRules ?? [])
    .filter((rule) => !rule.disabled)
    .map((rule, index) => ({
      ...rule,
      id: rule.id ?? `custom-${index}`,
      section: rule.section ?? ('custom' as RuleSection),
    }));

  if (config.selection?.mode === 'scratch') {
    const start = config.selection.scratchStart === 'show' ? 'show' : 'hide';
    const baseRule: Rule = {
      action: start === 'show' ? 'Show' : 'Hide',
      id: 'scratch-base',
      section: 'custom',
      comment: `From scratch - ${start} everything`,
      itemLevel: { min: 0 },
    };
    const bases = new Set(customRules.flatMap((rule) => rule.baseTypes ?? []));
    return {
      archetype,
      preset,
      sections,
      version,
      theme,
      rules: applyTheme([QUEST_RULE, ...customRules, baseRule], theme),
      baseTypes: [...bases].sort(),
    };
  }

  const rules: Rule[] = [QUEST_RULE, ...customRules];
  const baseTypes = new Set<string>();

  for (const spec of Object.values(archetype.slots)) {
    if (!spec) continue;
    for (const base of baseTypesFor(spec)) baseTypes.add(base);
  }
  for (const rule of customRules) {
    for (const base of rule.baseTypes ?? []) baseTypes.add(base);
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

  if (sections.gear) add('gear', gearRules(archetype, preset));
  if (sections.gems) add('gems', gemRules(preset));
  if (sections.currency) add('currency', currencyRules(preset));
  if (sections.maps) add('maps', mapRules(preset, config.phase));
  if (sections.uniques) add('uniques', uniqueRules());

  add('junk', junkRules(archetype, preset));
  // Style-only category rules run last so they never change what the preset
  // shows; they only restyle items that were already visible.
  add('league', leagueRules());

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

  const scratch = config.selection?.mode === 'scratch';
  const scratchStart =
    config.selection?.scratchStart === 'show' ? 'show' : 'hide';

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
    ...(scratch
      ? [`Mode: From scratch - ${scratchStart} everything`]
      : [
          `Phase: ${config.phase === 'leveling' ? 'Leveling' : 'Endgame'} - ${STRICTNESS_LABELS_PUBLIC[config.strictness]}`,
        ]),
    `League: ${compiled.archetype.verifiedFor}`,
    `Presets: ${PRESET_VERSION}`,
    `Rules: ${compiled.rules.length} - Base types: ${compiled.baseTypes.length}`,
    `Base data: RePoE ${baseTypeMeta.ref} (${baseTypeMeta.sha256.slice(0, 8)})`,
    'Generated at https://lordgreg.github.io/filterpath/',
    'Not affiliated with or endorsed by Grinding Gear Games.',
    '========================================================================',
  ];

  const text = emitFilter(header, compiled.rules);

  return {
    ...compiled,
    text,
    fileName: config.selection
      ? buildFileName({
          selection: config.selection,
          phase: config.phase,
          strictness: config.strictness,
          name: config.buildName,
        })
      : filterNameFor(
          `filterpath-${compiled.archetype.id}-${config.phase}-${config.strictness}`,
        ),
    ruleCount: compiled.rules.length,
    baseTypeCount: compiled.baseTypes.length,
    warnings: validateFilter(text),
  };
}