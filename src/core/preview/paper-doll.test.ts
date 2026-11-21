import { describe, expect, it } from 'vitest';
import {
  getAscendanciesForSkill,
  getSnapshot,
  LEAGUE_INDEX,
} from '../../meta/index.ts';
import { compileFilter } from '../filter/generate.ts';
import type { Phase, Strictness } from '../filter/presets.ts';
import { evaluateRules } from './match.ts';
import { paperDollItems } from './paper-doll.ts';

const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['normal', 'strict', 'very-strict'];

describe('paper doll', () => {
  it('shows every equipment item for every build and preset', () => {
    const snapshot = getSnapshot(LEAGUE_INDEX.current);

    for (const skill of snapshot.skills) {
      const ascendancy = getAscendanciesForSkill(skill)[0]!;
      const selection = {
        mode: 'meta' as const,
        leagueId: LEAGUE_INDEX.current,
        familyId: skill.family,
        skillId: skill.id,
        ascendancyId: ascendancy.id,
      };

      for (const phase of PHASES) {
        for (const strictness of STRICTNESS) {
          const compiled = compileFilter({ selection, phase, strictness });
          const entries = paperDollItems(compiled.archetype);
          const label = `${skill.id}/${phase}/${strictness}`;

          expect(entries.length, label).toBeGreaterThanOrEqual(12);

          for (const entry of entries) {
            if (!entry.item) continue;
            const result = evaluateRules(compiled.rules, entry.item);
            expect(
              result.shown,
              `${label}: ${entry.label} (${entry.item.name}) - ${result.reason}`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it('leaves the offhand empty for two-handed skills', () => {
    const twoHanded = compileFilter({
      selection: {
        mode: 'meta',
        leagueId: LEAGUE_INDEX.current,
        familyId: 'melee',
        skillId: 'cyclone',
        ascendancyId: 'slayer',
      },
      phase: 'endgame',
      strictness: 'normal',
    });
    const entries = paperDollItems(twoHanded.archetype);
    expect(entries.find((entry) => entry.slot === 'offhand')?.item).toBeNull();
  });

  it('includes the flask and jewel slots', () => {
    const compiled = compileFilter({
      selection: {
        mode: 'meta',
        leagueId: LEAGUE_INDEX.current,
        familyId: 'minion',
        skillId: 'summon-skeletons',
        ascendancyId: 'necromancer',
      },
      phase: 'endgame',
      strictness: 'normal',
    });
    const entries = paperDollItems(compiled.archetype);
    expect(entries.filter((entry) => entry.slot === 'flask').every((entry) => entry.item)).toBe(true);
    expect(entries.find((entry) => entry.slot === 'jewel')?.item).toBeTruthy();
  });
});