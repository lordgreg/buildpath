import { describe, expect, it } from 'vitest';
import { validateArchetype } from '../core/archetypes/validate.ts';
import { baseTypes } from '../core/data/base-types.ts';
import { resolveSlotBases } from '../core/data/resolve.ts';
import knownBaseTypes from '../core/data/known-base-types.json';
import { generateFilter } from '../core/filter/generate.ts';
import type { Phase, Strictness } from '../core/filter/presets.ts';
import { validateFilter } from '../core/filter/validate.ts';
import { ASCENDANCIES, getAscendancy } from './ascendancies.ts';
import { FAMILIES } from './families.ts';
import {
  coerceSelection,
  defaultSelection,
  getAscendanciesForSkill,
  getSkills,
  getSnapshot,
  isValidSelection,
  LEAGUE_INDEX,
  legacySelection,
} from './index.ts';
import { resolveBuild } from './resolve.ts';
import catalog from './skill-names.json';
import type { BuildSelection, FamilyId } from './types.ts';

const CLASSES = new Set([
  'Scion',
  'Marauder',
  'Ranger',
  'Duelist',
  'Witch',
  'Templar',
  'Shadow',
]);
const FAMILY_IDS = new Set<FamilyId>(FAMILIES.map((family) => family.id));
const SKILL_NAMES = new Set(catalog.skills.map((skill) => skill.name));
const allTags = new Set(baseTypes.flatMap((base) => base.tags));
const knownNames = new Set(knownBaseTypes.names);

describe('league snapshots', () => {
  it('lists the current league in the index', () => {
    expect(
      LEAGUE_INDEX.leagues.some((league) => league.id === LEAGUE_INDEX.current),
    ).toBe(true);
  });

  for (const league of LEAGUE_INDEX.leagues) {
    describe(league.id, () => {
      const snapshot = getSnapshot(league.id);

      it('matches the index metadata', () => {
        expect(snapshot.league.id).toBe(league.id);
        expect(snapshot.league.name).toBe(league.name);
        expect(snapshot.capturedAt).toBe(league.capturedAt);
        expect(snapshot.schemaVersion).toBe(1);
      });

      it('has unique skills with real gem names', () => {
        const ids = snapshot.skills.map((skill) => skill.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const skill of snapshot.skills) {
          expect(SKILL_NAMES.has(skill.name), skill.name).toBe(true);
          expect(FAMILY_IDS.has(skill.family), skill.id).toBe(true);
        }
      });

      it('has at least four skills per family', () => {
        for (const family of FAMILIES) {
          expect(getSkills(league.id, family.id).length, family.id).toBeGreaterThanOrEqual(4);
        }
      });

      it('uses valid classes and ascendancies', () => {
        for (const skill of snapshot.skills) {
          expect(skill.classes.length, skill.id).toBeGreaterThan(0);
          for (const className of skill.classes) {
            expect(CLASSES.has(className), `${skill.id}: ${className}`).toBe(true);
          }
          for (const ascendancyId of skill.topAscendancies ?? []) {
            const ascendancy = getAscendancy(ascendancyId);
            expect(
              skill.classes.includes(ascendancy.class),
              `${skill.id}: ${ascendancyId}`,
            ).toBe(true);
          }
        }
      });

      it('covers all seven classes', () => {
        const classes = new Set(snapshot.skills.flatMap((skill) => skill.classes));
        for (const className of CLASSES) {
          expect(classes.has(className as never), className).toBe(true);
        }
      });
    });
  }

  it('makes every ascendancy reachable', () => {
    const reachable = new Set<string>();
    for (const skill of getSnapshot(LEAGUE_INDEX.current).skills) {
      for (const ascendancy of getAscendanciesForSkill(skill)) {
        reachable.add(ascendancy.id);
      }
    }
    for (const ascendancy of ASCENDANCIES) {
      expect(reachable.has(ascendancy.id), ascendancy.id).toBe(true);
    }
  });
});

describe('ascendancy data', () => {
  it('uses tags that exist in the base item data', () => {
    for (const ascendancy of ASCENDANCIES) {
      for (const tag of [
        ...ascendancy.defenceTags,
        ...ascendancy.shieldTags,
        ascendancy.jewelTag,
      ]) {
        expect(allTags.has(tag), `${ascendancy.id}: ${tag}`).toBe(true);
      }
    }
  });

  it('has unique ids and valid classes', () => {
    const ids = ASCENDANCIES.map((ascendancy) => ascendancy.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ascendancy of ASCENDANCIES) {
      expect(CLASSES.has(ascendancy.class), ascendancy.id).toBe(true);
      expect(ascendancy.attributes.length, ascendancy.id).toBeGreaterThan(0);
    }
  });
});

describe('selection', () => {
  it('validates the default', () => {
    expect(isValidSelection(defaultSelection())).toBe(true);
  });

  it('coerces an impossible family/skill/ascendancy combination', () => {
    const selection = coerceSelection({
      leagueId: 'covens',
      familyId: 'bow',
      skillId: 'summon-skeletons',
      ascendancyId: 'necromancer',
    });

    expect(selection.familyId).toBe('bow');
    expect(selection.skillId).toBe('lightning-arrow');
    expect(getAscendancy(selection.ascendancyId).class).toBe('Ranger');
    expect(isValidSelection(selection)).toBe(true);
  });

  it('maps every interim archetype link', () => {
    for (const legacyId of [
      'necro-minions',
      'occultist-cold-dot',
      'inquisitor-rf',
      'hierophant-totems',
      'jugg-boneshatter',
      'slayer-cyclone',
      'champion-steel',
      'deadeye-lightning-arrow',
      'pathfinder-toxic-rain',
      'trickster-frost-blades',
      'saboteur-hexblast-mines',
      'ascendant-aurabot',
    ]) {
      const selection = legacySelection(legacyId);
      expect(selection, legacyId).not.toBeNull();
      expect(isValidSelection(selection!), legacyId).toBe(true);
    }
  });
});

describe('resolveBuild', () => {
  const resolve = (
    familyId: FamilyId,
    skillId: string,
    ascendancyId: string,
  ) =>
    resolveBuild({
      leagueId: LEAGUE_INDEX.current,
      familyId,
      skillId,
      ascendancyId,
    });

  it('gives minions a minion wand and minion shield', () => {
    const build = resolve('minion', 'summon-skeletons', 'necromancer');
    expect(build.slots.weapon?.tags).toContain(
      'weapon_can_roll_minion_modifiers',
    );
    expect(build.slots.offhand?.tags).toContain(
      'focus_can_roll_minion_modifiers',
    );
  });

  it('drops the offhand for two-handed skills', () => {
    const build = resolve('melee', 'cyclone', 'slayer');
    expect(build.slots.weapon?.itemClasses).toEqual(['Two Hand Sword']);
    expect(build.slots.offhand).toBeUndefined();
  });

  it('applies skill weapon overrides', () => {
    expect(resolve('caster', 'righteous-fire', 'inquisitor').slots.weapon?.itemClasses).toEqual([
      'Sceptre',
    ]);
    expect(resolve('melee', 'boneshatter', 'juggernaut').slots.weapon?.itemClasses).toEqual([
      'Two Hand Axe',
    ]);
  });

  it('uses the ascendancy for armour and attributes', () => {
    const pathfinder = resolve('bow', 'toxic-rain', 'pathfinder');
    expect(pathfinder.class).toBe('Ranger');
    expect(pathfinder.attributes).toEqual(['dex', 'int']);
    expect(pathfinder.slots.body?.tags).toEqual([
      'dex_int_armour',
      'dex_armour',
    ]);

    const deadeye = resolve('bow', 'lightning-arrow', 'deadeye');
    expect(deadeye.slots.body?.tags).toEqual(['dex_armour']);
  });

  it('resolves every skill to real bases and a valid archetype', () => {
    const snapshot = getSnapshot(LEAGUE_INDEX.current);
    for (const skill of snapshot.skills) {
      const ascendancy = getAscendanciesForSkill(skill)[0]!;
      const build = resolveBuild({
        leagueId: LEAGUE_INDEX.current,
        familyId: skill.family,
        skillId: skill.id,
        ascendancyId: ascendancy.id,
      });

      expect(validateArchetype(build), skill.id).toEqual([]);
      for (const [slot, spec] of Object.entries(build.slots)) {
        if (!spec) continue;
        expect(
          resolveSlotBases(spec).length,
          `${skill.id}.${slot}`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe('selection filters', () => {
  const phases: Phase[] = ['leveling', 'endgame'];
  const strictness: Strictness[] = ['normal', 'strict', 'very-strict'];

  it('generates valid filters for every skill', () => {
    const snapshot = getSnapshot(LEAGUE_INDEX.current);

    for (const skill of snapshot.skills) {
      const ascendancy = getAscendanciesForSkill(skill)[0]!;
      const selection: BuildSelection = {
        leagueId: LEAGUE_INDEX.current,
        familyId: skill.family,
        skillId: skill.id,
        ascendancyId: ascendancy.id,
      };

      for (const phase of phases) {
        for (const level of strictness) {
          const filter = generateFilter({
            selection,
            phase,
            strictness: level,
          });

          const label = `${skill.id}/${ascendancy.id}/${phase}/${level}`;
          expect(validateFilter(filter.text), label).toEqual([]);
          expect(filter.warnings, label).toEqual([]);
          expect(filter.fileName, label).toMatch(
            /^FilterPath-vdev-[a-z-]+-(lev|end)-(normal|strict|very-strict)\.filter$/,
          );
          expect(filter.text, label).not.toMatch(/[^\x09\x0a\x20-\x7e]/);

          for (const line of filter.text.split('\n')) {
            const match = /^ {4}BaseType (.+)$/.exec(line);
            if (!match) continue;
            for (const quoted of match[1]!.matchAll(/"([^"]*)"/g)) {
              expect(knownNames.has(quoted[1]!), `${label}: ${quoted[1]}`).toBe(
                true,
              );
            }
          }
        }
      }
    }
  });

  it('keeps legacy archetype generation working', () => {
    const filter = generateFilter({
      archetypeId: 'necro-minions',
      phase: 'leveling',
      strictness: 'normal',
    });
    expect(filter.fileName).toBe(
      'FilterPath-vdev-necro-minions-leveling-normal.filter',
    );
  });
});