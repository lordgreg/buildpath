import type { FilterAction, RuleSection } from '../filter/types.ts';
import { generateFilter } from '../filter/generate.ts';
import {
  STRICTNESS_ORDER,
  type Phase,
  type Strictness,
} from '../filter/presets.ts';
import { evaluateRules, type PreviewItem } from '../preview/match.ts';
import { ASCENDANCIES } from '../../meta/ascendancies.ts';
import { FAMILIES } from '../../meta/families.ts';
import {
  CURRENT_LEAGUE_ID,
  getAscendanciesForSkill,
  getSnapshot,
  LEAGUE_IDS,
  PRESET_VERSION,
} from '../../meta/index.ts';
import type { BuildSelection } from '../../meta/types.ts';
import { APP_VERSION } from '../../version.ts';
import { AUDIT_CASES, type AuditCategory, type AuditCase } from './cases.ts';

export const AUDIT_PHASES: Phase[] = ['leveling', 'endgame'];
export const AUDIT_STRICTNESS: Strictness[] = STRICTNESS_ORDER;

export type AuditKind = 'family' | 'ascendancy' | 'meta';

/** Where a cell's shown/hidden decision came from. */
export interface AuditProvenance {
  shown: boolean;
  /** `rule` = a block matched; `default` = nothing matched, visible by default. */
  decidedBy: 'rule' | 'default';
  ruleId?: string;
  section?: RuleSection;
  comment?: string;
  action?: FilterAction;
  /** Index into the compiled rule list; -1 when nothing matched. */
  ruleIndex: number;
  /** 1-based line range of the deciding block in the emitted `.filter`. */
  startLine?: number;
  endLine?: number;
}

export interface AuditCell {
  caseId: string;
  provenance: AuditProvenance;
}

export interface AuditVariant {
  phase: Phase;
  strictness: Strictness;
  fileName: string;
  cells: AuditCell[];
  shown: number;
  hidden: number;
}

export interface AuditBuild {
  label: string;
  kind: AuditKind;
  selection: BuildSelection;
  variants: AuditVariant[];
}

export interface AuditCaseSummary {
  id: string;
  label: string;
  category: AuditCategory;
  note?: string;
}

export interface AuditReport {
  version: string;
  presetVersion: string;
  league: string;
  cases: AuditCaseSummary[];
  builds: AuditBuild[];
}

interface BuildRef {
  label: string;
  kind: AuditKind;
  selection: BuildSelection;
}

/** Every family, ascendancy and meta build the report covers. */
export function auditBuildRefs(): BuildRef[] {
  const builds: BuildRef[] = [];

  for (const family of FAMILIES) {
    builds.push({
      label: `family:${family.id}`,
      kind: 'family',
      selection: { mode: 'family', familyId: family.id },
    });
  }

  for (const ascendancy of ASCENDANCIES) {
    builds.push({
      label: `ascendancy:${ascendancy.id}`,
      kind: 'ascendancy',
      selection: { mode: 'ascendancy', ascendancyId: ascendancy.id },
    });
  }

  for (const leagueId of LEAGUE_IDS) {
    for (const skill of getSnapshot(leagueId).skills) {
      const ascendancy = getAscendanciesForSkill(skill)[0];
      if (!ascendancy) continue;
      builds.push({
        label: `meta:${leagueId}:${skill.id}:${ascendancy.id}`,
        kind: 'meta',
        selection: {
          mode: 'meta',
          leagueId,
          familyId: skill.family,
          skillId: skill.id,
          ascendancyId: ascendancy.id,
        },
      });
    }
  }

  return builds;
}

function provenanceFor(
  filter: ReturnType<typeof generateFilter>,
  result: ReturnType<typeof evaluateRules>,
): AuditProvenance {
  if (!result.rule) {
    return { shown: result.shown, decidedBy: 'default', ruleIndex: -1 };
  }
  const span = filter.lineSpans.find((entry) => entry.index === result.index);
  return {
    shown: result.shown,
    decidedBy: 'rule',
    ruleId: result.rule.id,
    section: result.rule.section,
    comment: result.rule.comment,
    action: result.rule.action,
    ruleIndex: result.index,
    startLine: span?.startLine,
    endLine: span?.endLine,
  };
}

/** Runs every case through every build, at every phase and strictness. */
export function buildAuditReport(options: { version?: string } = {}): AuditReport {
  const version = options.version ?? APP_VERSION;

  const builds: AuditBuild[] = auditBuildRefs().map((ref) => {
    const variants: AuditVariant[] = [];

    for (const phase of AUDIT_PHASES) {
      for (const strictness of AUDIT_STRICTNESS) {
        const filter = generateFilter({
          selection: ref.selection,
          phase,
          strictness,
          version,
        });
        let shown = 0;
        let hidden = 0;
        const cells = AUDIT_CASES.map((auditCase) => {
          const result = evaluateRules(filter.rules, auditCase.item);
          if (result.shown) shown += 1;
          else hidden += 1;
          return { caseId: auditCase.id, provenance: provenanceFor(filter, result) };
        });
        variants.push({
          phase,
          strictness,
          fileName: filter.fileName,
          cells,
          shown,
          hidden,
        });
      }
    }

    return { label: ref.label, kind: ref.kind, selection: ref.selection, variants };
  });

  return {
    version,
    presetVersion: PRESET_VERSION,
    league: getSnapshot(CURRENT_LEAGUE_ID).league.name,
    cases: AUDIT_CASES.map((auditCase: AuditCase): AuditCaseSummary => ({
      id: auditCase.id,
      label: auditCase.label,
      category: auditCase.category,
      note: auditCase.note,
    })),
    builds,
  };
}

/**
 * Compact, diff-friendly fingerprint of the whole matrix. Used as a behaviour
 * golden so an unintended rule reorder shows up as a reviewable change.
 */
export function behaviourSummary(report = buildAuditReport()): string {
  const lines: string[] = [];
  for (const build of [...report.builds].sort((a, b) => a.label.localeCompare(b.label))) {
    for (const variant of build.variants) {
      const hidden = variant.cells
        .filter((cell) => !cell.provenance.shown)
        .map((cell) => cell.caseId)
        .sort();
      const byDefault = variant.cells.filter(
        (cell) => cell.provenance.shown && cell.provenance.decidedBy === 'default',
      ).length;
      lines.push(
        `${build.label}|${variant.phase}|${variant.strictness}|shown=${variant.shown}|hidden=${variant.hidden}|default=${byDefault}|hide=${hidden.join(',')}`,
      );
    }
  }
  return `${lines.join('\n')}\n`;
}

export type { AuditCase, PreviewItem };
