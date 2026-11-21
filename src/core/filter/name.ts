import type { BuildSelection } from '../../meta/types.ts';
import type { Phase, Strictness } from './presets.ts';

const NAME_LIMIT = 64;

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, NAME_LIMIT)
    .replace(/-+$/g, '');
}

/** Fallback name derived from the build selection when the user leaves it empty. */
export function autoBuildName(selection: BuildSelection): string {
  switch (selection.mode) {
    case 'family':
      return slugify(selection.familyId ?? 'minion');
    case 'ascendancy':
      return slugify(selection.ascendancyId ?? 'necromancer');
    case 'meta': {
      const skill = slugify(selection.skillId ?? 'meta');
      const ascendancy = slugify(selection.ascendancyId ?? '');
      return ascendancy ? `${skill}-${ascendancy}` : skill;
    }
    case 'scratch':
      return 'custom';
  }
}

export function resolveBuildName(
  selection: BuildSelection,
  name?: string,
): string {
  return slugify(name ?? '') || autoBuildName(selection);
}

/**
 * `filterpath-<name>-<phase>-<strictness>-<version>.filter`. From-scratch
 * filters have no phase or strictness, so both collapse into hide-all/show-all.
 */
export function buildFileName(input: {
  selection: BuildSelection;
  phase: Phase;
  strictness: Strictness;
  version: string;
  name?: string;
}): string {
  const name = resolveBuildName(input.selection, input.name);
  const version = input.version.replace(/[^0-9A-Za-z.-]/g, '');

  if (input.selection.mode === 'scratch') {
    const start =
      input.selection.scratchStart === 'show' ? 'show-all' : 'hide-all';
    return `filterpath-${name}-${start}-${version}.filter`;
  }

  return `filterpath-${name}-${input.phase}-${input.strictness}-${version}.filter`;
}
