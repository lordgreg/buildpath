import covensJson from './leagues/covens.json';
import standardJson from './leagues/standard.json';
import leagueIndex from './leagues/index.json';
import { ASCENDANCIES } from './ascendancies.ts';
import { FAMILIES } from './families.ts';
import type {
  Ascendancy,
  BuildSelection,
  FamilyId,
  LeagueSnapshot,
  SkillEntry,
} from './types.ts';

const snapshots: Record<string, LeagueSnapshot> = {
  covens: covensJson as unknown as LeagueSnapshot,
  standard: standardJson as unknown as LeagueSnapshot,
};

export const LEAGUE_INDEX = leagueIndex;

export const LEAGUE_IDS = leagueIndex.leagues.map((entry) => entry.id);

export const CURRENT_LEAGUE_ID = leagueIndex.current;

export function getSnapshot(leagueId: string): LeagueSnapshot {
  const snapshot = snapshots[leagueId];
  if (!snapshot) throw new Error(`Unknown league "${leagueId}"`);
  return snapshot;
}

export function getSkills(
  leagueId: string,
  familyId: FamilyId,
): SkillEntry[] {
  return getSnapshot(leagueId)
    .skills.filter((skill) => skill.family === familyId)
    .sort(
      (a, b) =>
        (b.playShare ?? 0) - (a.playShare ?? 0) ||
        a.name.localeCompare(b.name),
    );
}

export function getSkill(
  leagueId: string,
  skillId: string,
): SkillEntry | undefined {
  return getSnapshot(leagueId).skills.find((skill) => skill.id === skillId);
}

export function getAscendanciesForSkill(skill: SkillEntry): Ascendancy[] {
  const allowed = ASCENDANCIES.filter((ascendancy) =>
    skill.classes.includes(ascendancy.class),
  );
  const rank = new Map(
    (skill.topAscendancies ?? []).map((id, index) => [id, index]),
  );
  return allowed.sort((a, b) => {
    const aRank = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRank = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.name.localeCompare(b.name);
  });
}

export function defaultSelection(): BuildSelection {
  return {
    leagueId: CURRENT_LEAGUE_ID,
    familyId: 'minion',
    skillId: 'summon-skeletons',
    ascendancyId: 'necromancer',
  };
}

export function isValidSelection(selection: BuildSelection): boolean {
  const snapshot = snapshots[selection.leagueId];
  if (!snapshot) return false;
  const skill = snapshot.skills.find((entry) => entry.id === selection.skillId);
  if (!skill) return false;
  if (skill.family !== selection.familyId) return false;
  const ascendancy = ASCENDANCIES.find(
    (entry) => entry.id === selection.ascendancyId,
  );
  if (!ascendancy) return false;
  return skill.classes.includes(ascendancy.class);
}

/**
 * Repairs a partial or stale selection after a hash change: unknown league or
 * family fall back, a skill that no longer exists picks the family's top skill,
 * and an invalid ascendancy picks the skill's first allowed one.
 */
export function coerceSelection(
  input: Partial<BuildSelection> = {},
): BuildSelection {
  const fallback = defaultSelection();
  const leagueId =
    input.leagueId && snapshots[input.leagueId]
      ? input.leagueId
      : fallback.leagueId;
  const familyId = FAMILIES.some((family) => family.id === input.familyId)
    ? (input.familyId as FamilyId)
    : fallback.familyId;

  const familySkills = getSkills(leagueId, familyId);
  let skill =
    familySkills.find((entry) => entry.id === input.skillId) ?? familySkills[0];

  if (!skill) {
    for (const family of FAMILIES) {
      const candidates = getSkills(leagueId, family.id);
      if (candidates[0]) {
        skill = candidates[0];
        break;
      }
    }
  }
  if (!skill) throw new Error(`No skills in snapshot "${leagueId}"`);

  const ascendancies = getAscendanciesForSkill(skill);
  const ascendancy =
    ascendancies.find((entry) => entry.id === input.ascendancyId) ??
    ascendancies[0];
  if (!ascendancy) {
    throw new Error(`No ascendancy available for "${skill.id}"`);
  }

  return {
    leagueId,
    familyId: skill.family,
    skillId: skill.id,
    ascendancyId: ascendancy.id,
  };
}

const LEGACY_SELECTIONS: Record<string, Omit<BuildSelection, 'leagueId'>> = {
  'necro-minions': {
    familyId: 'minion',
    skillId: 'summon-skeletons',
    ascendancyId: 'necromancer',
  },
  'occultist-cold-dot': {
    familyId: 'caster',
    skillId: 'hexblast',
    ascendancyId: 'occultist',
  },
  'inquisitor-rf': {
    familyId: 'caster',
    skillId: 'righteous-fire',
    ascendancyId: 'inquisitor',
  },
  'hierophant-totems': {
    familyId: 'caster',
    skillId: 'arc',
    ascendancyId: 'hierophant',
  },
  'jugg-boneshatter': {
    familyId: 'melee',
    skillId: 'boneshatter',
    ascendancyId: 'juggernaut',
  },
  'slayer-cyclone': {
    familyId: 'melee',
    skillId: 'cyclone',
    ascendancyId: 'slayer',
  },
  'champion-steel': {
    familyId: 'melee',
    skillId: 'splitting-steel',
    ascendancyId: 'champion',
  },
  'deadeye-lightning-arrow': {
    familyId: 'bow',
    skillId: 'lightning-arrow',
    ascendancyId: 'deadeye',
  },
  'pathfinder-toxic-rain': {
    familyId: 'bow',
    skillId: 'toxic-rain',
    ascendancyId: 'pathfinder',
  },
  'trickster-frost-blades': {
    familyId: 'hybrid',
    skillId: 'frost-blades',
    ascendancyId: 'trickster',
  },
  'saboteur-hexblast-mines': {
    familyId: 'caster',
    skillId: 'hexblast',
    ascendancyId: 'saboteur',
  },
  'ascendant-aurabot': {
    familyId: 'caster',
    skillId: 'detonate-dead',
    ascendancyId: 'ascendant',
  },
};

/** Maps the interim 12-build links onto the new selection. */
export function legacySelection(archetypeId: string): BuildSelection | null {
  const legacy = LEGACY_SELECTIONS[archetypeId];
  if (!legacy) return null;
  const selection: BuildSelection = {
    leagueId: CURRENT_LEAGUE_ID,
    ...legacy,
  };
  return isValidSelection(selection) ? selection : null;
}