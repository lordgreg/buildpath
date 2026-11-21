import type { BuildSelection } from '../../meta/types.ts';
import type { Sections } from '../filter/generate.ts';
import type { Phase, Strictness } from '../filter/presets.ts';
import type { Rule } from '../filter/types.ts';

export interface RuleClone {
  schemaVersion: 1;
  key: string;
  label: string;
  presetVersion: string;
  createdAt: string;
  rules: Rule[];
}

export function cloneKey(
  selection: BuildSelection,
  phase: Phase,
  strictness: Strictness,
  sections: Sections,
): string {
  return JSON.stringify({
    mode: selection.mode,
    familyId: selection.familyId,
    ascendancyId: selection.ascendancyId,
    leagueId: selection.leagueId,
    skillId: selection.skillId,
    phase,
    strictness,
    sections,
  });
}

export function createClone(input: {
  key: string;
  label: string;
  presetVersion: string;
  rules: readonly Rule[];
}): RuleClone {
  return {
    schemaVersion: 1,
    key: input.key,
    label: input.label,
    presetVersion: input.presetVersion,
    createdAt: new Date().toISOString(),
    rules: JSON.parse(JSON.stringify(input.rules)) as Rule[],
  };
}

export function parseClone(value: unknown): RuleClone | null {
  if (!value || typeof value !== 'object') return null;
  const clone = value as Partial<RuleClone>;
  if (clone.schemaVersion !== 1) return null;
  if (typeof clone.key !== 'string' || typeof clone.label !== 'string') {
    return null;
  }
  if (typeof clone.presetVersion !== 'string') return null;
  if (!Array.isArray(clone.rules)) return null;

  const rules = clone.rules.filter(
    (rule): rule is Rule =>
      !!rule &&
      typeof rule === 'object' &&
      (rule.action === 'Show' || rule.action === 'Hide'),
  );
  if (rules.length !== clone.rules.length) return null;

  return {
    schemaVersion: 1,
    key: clone.key,
    label: clone.label,
    presetVersion: clone.presetVersion,
    createdAt: clone.createdAt ?? new Date().toISOString(),
    rules,
  };
}