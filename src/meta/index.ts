import presets from '../generated/presets.json';
import { ASCENDANCIES } from './ascendancies.ts';
import { BUILDS, getBuildEntry, isBuildId } from './builds.ts';
import { FAMILIES } from './families.ts';
import type {
  Ascendancy,
  BuildSelection,
  FamilyId,
  LeagueSnapshot,
  SkillEntry,
} from './types.ts';

const snapshots = presets.leagues.snapshots as unknown as Record<
  string,
  LeagueSnapshot
>;

export const PRESET_VERSION = presets.version;

export const LEAGUE_INDEX = {
  current: presets.leagues.current,
  leagues: presets.leagues.index,
};

export const LEAGUE_IDS = LEAGUE_INDEX.leagues.map((entry) => entry.id);

export const CURRENT_LEAGUE_ID = LEAGUE_INDEX.current;

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

export interface SkillWeightGroup {
  /** Null for skills without a seed weight. */
  weight: number | null;
  skills: SkillEntry[];
}

/**
 * Groups a league's skills by seed weight, highest first. Skills without a
 * weight fall into a final `null` group. Names sort within each group.
 */
export function groupSkillsByWeight(leagueId: string): SkillWeightGroup[] {
  const groups = new Map<number | null, SkillEntry[]>();
  for (const skill of getSnapshot(leagueId).skills) {
    const weight = skill.playShare ?? null;
    const group = groups.get(weight) ?? [];
    group.push(skill);
    groups.set(weight, group);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (b ?? -1) - (a ?? -1))
    .map(([weight, skills]) => ({ weight, skills }));
}

export function getAscendanciesForSkill(skill: SkillEntry): Ascendancy[] {
  const allowed = ASCENDANCIES.filter((ascendancy) =>
    skill.classes.includes(ascendancy.class),
  );
  const order = skill.topAscendancies ?? [];
  if (order.length > 0) {
    const byId = new Map(allowed.map((entry) => [entry.id, entry]));
    return order
      .map((id) => byId.get(id))
      .filter((entry): entry is Ascendancy => Boolean(entry));
  }
  return allowed.sort((a, b) => a.name.localeCompare(b.name));
}

export function defaultSelection(): BuildSelection {
  return { mode: 'family', familyId: 'minion' };
}

export function isValidSelection(selection: BuildSelection): boolean {
  if (selection.mode === 'scratch') return true;

  if (selection.mode === 'build') return isBuildId(selection.buildId);

  if (selection.mode === 'family') {
    return FAMILIES.some((family) => family.id === selection.familyId);
  }

  if (selection.mode === 'ascendancy') {
    return ASCENDANCIES.some(
      (ascendancy) => ascendancy.id === selection.ascendancyId,
    );
  }

  if (selection.mode !== 'meta') return false;

  const snapshot = snapshots[selection.leagueId ?? ''];
  if (!snapshot) return false;
  const skill = snapshot.skills.find((entry) => entry.id === selection.skillId);
  if (!skill) return false;
  const ascendancy = ASCENDANCIES.find(
    (entry) => entry.id === selection.ascendancyId,
  );
  if (!ascendancy) return false;
  return skill.classes.includes(ascendancy.class);
}

export function coerceSelection(
  input: Partial<BuildSelection> = {},
): BuildSelection {
  const fallback = defaultSelection();

  if (input.mode === 'family') {
    const family = FAMILIES.find((entry) => entry.id === input.familyId);
    return { mode: 'family', familyId: family?.id ?? 'minion' };
  }

  if (input.mode === 'build') {
    const build = getBuildEntry(input.buildId ?? '') ?? BUILDS[0];
    if (!build) throw new Error('No build seeds are compiled');
    return {
      mode: 'build',
      buildId: build.id,
      ascendancyId: build.ascendancyId,
      familyId: build.family,
    };
  }

  if (input.mode === 'scratch') {
    return {
      mode: 'scratch',
      scratchStart: input.scratchStart === 'show' ? 'show' : 'hide',
    };
  }

  if (input.mode === 'ascendancy') {
    const ascendancy = ASCENDANCIES.find(
      (entry) => entry.id === input.ascendancyId,
    );
    const chosen = ascendancy ?? ASCENDANCIES.find((e) => e.id === 'necromancer')!;
    return {
      mode: 'ascendancy',
      ascendancyId: chosen.id,
      familyId: chosen.defaultFamily,
    };
  }

  if (input.mode !== 'meta') return fallback;

  const leagueId =
    input.leagueId && snapshots[input.leagueId]
      ? input.leagueId
      : CURRENT_LEAGUE_ID;
  const familyId = FAMILIES.some((family) => family.id === input.familyId)
    ? (input.familyId as FamilyId)
    : 'caster';

  const familySkills = getSkills(leagueId, familyId);
  let skill =
    getSnapshot(leagueId).skills.find((entry) => entry.id === input.skillId) ??
    familySkills.find((entry) => entry.id === input.skillId) ??
    familySkills[0];

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
  if (!ascendancy) throw new Error(`No ascendancy available for "${skill.id}"`);

  return {
    mode: 'meta',
    leagueId,
    familyId: skill.family,
    skillId: skill.id,
    ascendancyId: ascendancy.id,
  };
}

const LEGACY_SELECTIONS: Record<
  string,
  { familyId: FamilyId; skillId: string; ascendancyId: string }
> = {
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

/** Maps the interim 12-build links onto the new meta selection. */
export function legacySelection(archetypeId: string): BuildSelection | null {
  const legacy = LEGACY_SELECTIONS[archetypeId];
  if (!legacy) return null;
  const selection: BuildSelection = {
    mode: 'meta',
    leagueId: CURRENT_LEAGUE_ID,
    ...legacy,
  };
  return isValidSelection(selection) ? selection : null;
}