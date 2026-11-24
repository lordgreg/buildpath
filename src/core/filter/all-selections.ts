import { ASCENDANCIES } from '../../meta/ascendancies.ts';
import { FAMILIES } from '../../meta/families.ts';
import {
  getAscendanciesForSkill,
  getSnapshot,
  LEAGUE_IDS,
} from '../../meta/index.ts';
import type { BuildSelection } from '../../meta/types.ts';

export interface LabelledSelection {
  label: string;
  selection: BuildSelection;
}

/**
 * Every selection the builder can produce: each family, each ascendancy, each
 * skill paired with every ascendancy it allows, and both scratch starts.
 * Tests use this instead of hand-picking a few builds.
 */
export function allSelections(): LabelledSelection[] {
  const selections: LabelledSelection[] = [];

  for (const family of FAMILIES) {
    selections.push({
      label: `family:${family.id}`,
      selection: { mode: 'family', familyId: family.id },
    });
  }

  for (const ascendancy of ASCENDANCIES) {
    selections.push({
      label: `ascendancy:${ascendancy.id}`,
      selection: { mode: 'ascendancy', ascendancyId: ascendancy.id },
    });
  }

  for (const leagueId of LEAGUE_IDS) {
    for (const skill of getSnapshot(leagueId).skills) {
      for (const ascendancy of getAscendanciesForSkill(skill)) {
        selections.push({
          label: `meta:${leagueId}:${skill.id}:${ascendancy.id}`,
          selection: {
            mode: 'meta',
            leagueId,
            skillId: skill.id,
            ascendancyId: ascendancy.id,
            familyId: skill.family,
          },
        });
      }
    }
  }

  for (const scratchStart of ['hide', 'show'] as const) {
    selections.push({
      label: `scratch:${scratchStart}`,
      selection: { mode: 'scratch', scratchStart },
    });
  }

  return selections;
}
