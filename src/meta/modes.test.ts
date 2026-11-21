import { describe, expect, it } from 'vitest';
import { validateArchetype } from '../core/archetypes/validate.ts';
import { resolveSlotBases } from '../core/data/resolve.ts';
import knownBaseTypes from '../core/data/known-base-types.json';
import { generateFilter } from '../core/filter/generate.ts';
import type { Phase, Strictness } from '../core/filter/presets.ts';
import { validateFilter } from '../core/filter/validate.ts';
import { ASCENDANCIES } from './ascendancies.ts';
import { FAMILIES, getFamily } from './families.ts';
import {
  coerceSelection,
  CURRENT_LEAGUE_ID,
  getSnapshot,
  isValidSelection,
  LEAGUE_INDEX,
  PRESET_VERSION,
} from './index.ts';
import { resolveBuild } from './resolve.ts';

const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['normal', 'strict', 'very-strict'];
const knownNames = new Set(knownBaseTypes.names);
const FAMILY_IDS = new Set(FAMILIES.map((family) => family.id));

describe('generated presets', () => {
  it('lists five families and nineteen ascendancies', () => {
    expect(FAMILIES).toHaveLength(5);
    expect(ASCENDANCIES).toHaveLength(19);
    expect(PRESET_VERSION).toMatch(/^[0-9a-f]{12}$/);
  });

  it('gives every ascendancy a valid default family', () => {
    for (const ascendancy of ASCENDANCIES) {
      expect(FAMILY_IDS.has(ascendancy.defaultFamily), ascendancy.id).toBe(true);
    }
  });

  it('has at least four skills per family in every league', () => {
    for (const league of LEAGUE_INDEX.leagues) {
      const snapshot = getSnapshot(league.id);
      for (const family of FAMILIES) {
        expect(
          snapshot.skills.filter((skill) => skill.family === family.id).length,
          `${league.id}/${family.id}`,
        ).toBeGreaterThanOrEqual(4);
      }
    }
  });
});

describe('family mode', () => {
  it('resolves a family without a class or skill', () => {
    const build = resolveBuild({ mode: 'family', familyId: 'minion' });
    expect(build.name).toBe('Minion');
    expect(build.class).toBeUndefined();
    expect(build.ascendancy).toBeUndefined();
    expect(build.slots.weapon?.tags).toContain(
      'weapon_can_roll_minion_modifiers',
    );
    expect(build.slots.offhand?.tags).toContain(
      'focus_can_roll_minion_modifiers',
    );
  });

  it('generates valid filters for every family and preset', () => {
    for (const family of FAMILIES) {
      const selection = coerceSelection({
        mode: 'family',
        familyId: family.id,
      });
      expect(isValidSelection(selection), family.id).toBe(true);
      const build = resolveBuild(selection);
      expect(validateArchetype(build), family.id).toEqual([]);

      for (const phase of PHASES) {
        for (const strictness of STRICTNESS) {
          const filter = generateFilter({ selection, phase, strictness });
          const label = `${family.id}/${phase}/${strictness}`;
          expect(filter.warnings, label).toEqual([]);
          expect(validateFilter(filter.text), label).toEqual([]);
          expect(filter.fileName, label).toBe(
            `filterpath-${family.id}-${phase}-${strictness}-dev.filter`,
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
});

describe('ascendancy mode', () => {
  it('uses the ascendancy default loadout', () => {
    const juggernaut = resolveBuild({
      mode: 'ascendancy',
      ascendancyId: 'juggernaut',
    });
    expect(juggernaut.name).toBe('Juggernaut');
    expect(juggernaut.class).toBe('Marauder');
    expect(juggernaut.slots.weapon?.itemClasses).toEqual(['Two Hand Axe']);
    expect(juggernaut.slots.offhand).toBeUndefined();

    const necromancer = resolveBuild({
      mode: 'ascendancy',
      ascendancyId: 'necromancer',
    });
    expect(getFamily('minion').id).toBe('minion');
    expect(necromancer.slots.weapon?.tags).toContain(
      'weapon_can_roll_minion_modifiers',
    );

    const deadeye = resolveBuild({
      mode: 'ascendancy',
      ascendancyId: 'deadeye',
    });
    expect(deadeye.slots.weapon?.itemClasses).toEqual(['Bow']);
    expect(deadeye.slots.offhand?.itemClasses).toEqual(['Quiver']);
  });

  it('resolves every ascendancy to real bases and valid filters', () => {
    for (const ascendancy of ASCENDANCIES) {
      const selection = coerceSelection({
        mode: 'ascendancy',
        ascendancyId: ascendancy.id,
      });
      expect(isValidSelection(selection), ascendancy.id).toBe(true);
      const build = resolveBuild(selection);
      expect(validateArchetype(build), ascendancy.id).toEqual([]);

      for (const [slot, spec] of Object.entries(build.slots)) {
        if (!spec) continue;
        expect(
          resolveSlotBases(spec).length,
          `${ascendancy.id}.${slot}`,
        ).toBeGreaterThan(0);
      }

      const filter = generateFilter({
        selection,
        phase: 'endgame',
        strictness: 'strict',
      });
      expect(filter.warnings, ascendancy.id).toEqual([]);
      expect(filter.fileName, ascendancy.id).toBe(
        `filterpath-${ascendancy.id}-endgame-strict-dev.filter`,
      );
    }
  });
});

describe('mode coercion', () => {
  it('repairs unknown family and ascendancy values', () => {
    expect(
      coerceSelection({ mode: 'family', familyId: 'nope' as never }),
    ).toEqual({ mode: 'family', familyId: 'minion' });

    const repaired = coerceSelection({
      mode: 'ascendancy',
      ascendancyId: 'nope',
    });
    expect(repaired.mode).toBe('ascendancy');
    expect(repaired.ascendancyId).toBe('necromancer');
    expect(repaired.familyId).toBe('minion');
  });

  it('validates the current league name for display', () => {
    expect(getSnapshot(CURRENT_LEAGUE_ID).league.name).toBe('Covens');
  });
});