import { describe, expect, it } from 'vitest';
import { ASCENDANCIES } from '../../meta/ascendancies.ts';
import { FAMILIES } from '../../meta/families.ts';
import {
  getAscendanciesForSkill,
  getSnapshot,
  LEAGUE_IDS,
} from '../../meta/index.ts';
import type { BuildSelection } from '../../meta/types.ts';
import type { Archetype } from '../archetypes/types.ts';
import { baseTypes, type BaseType } from '../data/base-types.ts';
import { evaluateRules, type PreviewItem } from '../preview/match.ts';
import { EQUIPMENT_CLASSES, FLASK_CLASSES, toFilterClass } from './classes.ts';
import { generateFilter } from './generate.ts';
import {
  baseTypesFor,
  filterClassesFor,
  usedFilterClasses,
} from './rules/gear.ts';

const SOCKETABLE = new Set([
  'Bows',
  'Claws',
  'Daggers',
  'Gloves',
  'Helmets',
  'One Hand Axes',
  'One Hand Maces',
  'One Hand Swords',
  'Rune Daggers',
  'Sceptres',
  'Shields',
  'Staves',
  'Thrusting One Hand Swords',
  'Two Hand Axes',
  'Two Hand Maces',
  'Two Hand Swords',
  'Wands',
  'Warstaves',
  'Body Armours',
  'Boots',
]);

const baseByName = new Map(baseTypes.map((base) => [base.name, base]));
const basesByClass = new Map<string, BaseType[]>();
for (const base of baseTypes) {
  const filterClass = toFilterClass(base.itemClass);
  const list = basesByClass.get(filterClass) ?? [];
  list.push(base);
  basesByClass.set(filterClass, list);
}

interface Coverage {
  allowed: Map<string, Set<string>>;
  unused: Set<string>;
  unrestricted: Set<string>;
}

function coverage(archetype: Archetype): Coverage {
  const used = usedFilterClasses(archetype);
  const allowed = new Map<string, Set<string>>();
  const unrestricted = new Set<string>();

  for (const spec of Object.values(archetype.slots)) {
    if (!spec) continue;
    const classes = filterClassesFor(spec);
    const bases = baseTypesFor(spec);
    if (bases.length === 0) {
      for (const name of classes) unrestricted.add(name);
      continue;
    }
    for (const name of classes) {
      const set = allowed.get(name) ?? new Set<string>();
      for (const baseName of bases) {
        const base = baseByName.get(baseName);
        if (base && toFilterClass(base.itemClass) === name) set.add(baseName);
      }
      allowed.set(name, set);
    }
  }

  for (const name of unrestricted) allowed.delete(name);
  return {
    allowed,
    unused: new Set(EQUIPMENT_CLASSES.filter((name) => !used.has(name))),
    unrestricted,
  };
}

function item(
  base: BaseType,
  rarity: PreviewItem['rarity'],
  extra: Partial<PreviewItem> = {},
): PreviewItem {
  return {
    id: `${base.name}-${rarity}`,
    name: base.name,
    itemClass: toFilterClass(base.itemClass),
    baseType: base.name,
    rarity,
    itemLevel: 100,
    sockets: 1,
    linkedSockets: 1,
    identified: true,
    ...extra,
  };
}

function firstBase(className: string): BaseType | undefined {
  return [...(basesByClass.get(className) ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  )[0];
}

function disallowedBase(
  className: string,
  allowed: Set<string> | undefined,
): BaseType | undefined {
  return [...(basesByClass.get(className) ?? [])]
    .filter((base) => !allowed?.has(base.name))
    .sort((a, b) => a.name.localeCompare(b.name))[0];
}

const BUILD_SELECTIONS: { label: string; selection: BuildSelection }[] = [
  ...FAMILIES.map((family) => ({
    label: `family:${family.id}`,
    selection: { mode: 'family' as const, familyId: family.id },
  })),
  ...ASCENDANCIES.map((ascendancy) => ({
    label: `ascendancy:${ascendancy.id}`,
    selection: {
      mode: 'ascendancy' as const,
      ascendancyId: ascendancy.id,
    },
  })),
];

for (const leagueId of LEAGUE_IDS) {
  for (const skill of getSnapshot(leagueId).skills) {
    const ascendancy = getAscendanciesForSkill(skill)[0];
    if (!ascendancy) continue;
    BUILD_SELECTIONS.push({
      label: `meta:${leagueId}:${skill.id}:${ascendancy.id}`,
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

describe('preset coverage audit', () => {
  it('never shows unused or wrong-base gear at any phase or strictness', () => {
    const failures: string[] = [];
    let checks = 0;

    for (const { label, selection } of BUILD_SELECTIONS) {
      for (const phase of ['leveling', 'endgame'] as const) {
        for (const strictness of [
          'normal',
          'strict',
          'very-strict',
        ] as const) {
          const filter = generateFilter({ selection, phase, strictness });
          const { allowed, unused, unrestricted } = coverage(filter.archetype);
          const highlight = filter.preset.gear.highlightLinks;
          const magicVisible = filter.preset.gear.magicMinItemLevel !== null;
          const normalVisible = filter.preset.gear.normalMinItemLevel !== null;
          // Fixtures are ilvl 100, above every floor, so a build base shows
          // whenever whites are on for the preset.
          const normalShown = normalVisible || highlight;
          const where = `${label} ${phase}/${strictness}`;

          const check = (
            sample: PreviewItem,
            expected: boolean,
            what: string,
          ) => {
            checks += 1;
            const result = evaluateRules(filter.rules, sample);
            if (result.shown !== expected) {
              failures.push(
                `${where} ${what}: ${result.shown ? 'shown' : 'hidden'} (${result.reason})`,
              );
            }
          };

          for (const className of unused) {
            const base = firstBase(className);
            if (!base) continue;
            check(item(base, 'Rare'), false, `${className} unused rare`);
            check(item(base, 'Magic'), false, `${className} unused magic`);
            check(item(base, 'Normal'), false, `${className} unused normal`);
            if (SOCKETABLE.has(className)) {
              check(
                item(base, 'Normal', {
                  linkedSockets: 4,
                  sockets: 4,
                }),
                false,
                `${className} unused 4-link`,
              );
            }
          }

          const flasks = new Set<string>(FLASK_CLASSES);
          for (const className of unrestricted) {
            const base = firstBase(className);
            if (!base) continue;
            check(item(base, 'Rare'), true, `${className} unrestricted rare`);
            check(
              item(base, 'Normal'),
              normalVisible && !flasks.has(className),
              `${className} unrestricted normal`,
            );
            if (SOCKETABLE.has(className)) {
              check(
                item(base, 'Normal', {
                  linkedSockets: 4,
                  sockets: 4,
                }),
                normalShown,
                `${className} unrestricted 4-link`,
              );
            }
          }

          for (const [className, allowedNames] of allowed) {
            const allowedBase = [...allowedNames]
              .map((name) => baseByName.get(name))
              .find((base): base is BaseType => !!base);
            const wrong = disallowedBase(className, allowedNames);
            if (allowedBase) {
              check(
                item(allowedBase, 'Rare'),
                true,
                `${className} allowed rare`,
              );
              check(
                item(allowedBase, 'Magic'),
                magicVisible,
                `${className} allowed magic`,
              );
              check(
                item(allowedBase, 'Normal'),
                normalVisible,
                `${className} allowed normal`,
              );
              if (SOCKETABLE.has(className)) {
                check(
                  item(allowedBase, 'Normal', {
                    linkedSockets: 4,
                    sockets: 4,
                  }),
                  normalShown,
                  `${className} allowed 4-link`,
                );
              }
            }
            if (wrong) {
              check(item(wrong, 'Rare'), false, `${className} wrong rare`);
              check(item(wrong, 'Magic'), false, `${className} wrong magic`);
              check(item(wrong, 'Normal'), false, `${className} wrong normal`);
              if (SOCKETABLE.has(className)) {
                check(
                  item(wrong, 'Normal', {
                    linkedSockets: 4,
                    sockets: 4,
                  }),
                  false,
                  `${className} wrong 4-link`,
                );
              }
            }
          }
        }
      }
    }

    expect(BUILD_SELECTIONS.length).toBeGreaterThanOrEqual(64);
    expect(checks).toBeGreaterThan(10_000);
    expect(failures.slice(0, 40)).toEqual([]);
  });
});