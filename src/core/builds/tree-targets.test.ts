import { describe, expect, it } from 'vitest';
import {
  lineAppliesToBuild,
  notableTargetPriorities,
  weaponTraitsFor,
} from './tree-targets.ts';
import type { PlanScope, PlanTreeNode } from './tree-targets.ts';

const base = (tags: string[]) => ({ tags });

const AXE = base(['axe', 'default', 'two_hand_weapon', 'twohand', 'weapon']);
const BOW = base(['bow', 'default', 'ranged', 'two_hand_weapon', 'twohand', 'weapon']);
const WAND = base(['default', 'one_hand_weapon', 'onehand', 'ranged', 'wand', 'weapon']);
const SWORD = base(['default', 'one_hand_weapon', 'onehand', 'sword', 'weapon']);
const SHIELD = base(['armour', 'default', 'shield']);
const QUIVER = base(['default', 'quiver']);

const scope = (
  traits: string[],
  options: Partial<Pick<PlanScope, 'resoluteTechnique' | 'minions'>> = {},
): PlanScope => ({
  traits,
  resoluteTechnique: false,
  minions: false,
  ...options,
});

const AXE_SCOPE = scope(['axe', 'melee', 'two_hand_weapon']);

describe('weaponTraitsFor', () => {
  it('turns a two-hand axe into axe, two-handed and melee', () => {
    expect(weaponTraitsFor(AXE)).toEqual(['axe', 'melee', 'two_hand_weapon']);
  });

  it('does not call a bow or a wand melee', () => {
    expect(weaponTraitsFor(BOW)).toEqual(['bow', 'two_hand_weapon']);
    expect(weaponTraitsFor(WAND)).toEqual(['one_hand_weapon', 'wand']);
  });

  it('adds the offhand shield or quiver', () => {
    expect(weaponTraitsFor(SWORD, SHIELD)).toEqual([
      'melee',
      'one_hand_weapon',
      'shield',
      'sword',
    ]);
    expect(weaponTraitsFor(BOW, QUIVER)).toEqual([
      'bow',
      'quiver',
      'two_hand_weapon',
    ]);
  });

  it('returns no traits when the weapon is missing', () => {
    expect(weaponTraitsFor(undefined)).toEqual([]);
  });
});

describe('lineAppliesToBuild', () => {
  it('rejects a one-hand line for a two-hander', () => {
    expect(
      lineAppliesToBuild(
        '25% increased Physical Damage with One Handed Melee Weapons',
        AXE_SCOPE,
      ),
    ).toBe(false);
  });

  it('rejects maces and swords for an axe', () => {
    expect(
      lineAppliesToBuild(
        '30% increased Physical Damage with Maces or Sceptres',
        AXE_SCOPE,
      ),
    ).toBe(false);
    expect(
      lineAppliesToBuild('20% increased Physical Damage with Swords', AXE_SCOPE),
    ).toBe(false);
  });

  it('keeps axe and two-handed lines', () => {
    expect(
      lineAppliesToBuild('30% increased Physical Damage with Axes', AXE_SCOPE),
    ).toBe(true);
    expect(
      lineAppliesToBuild(
        '25% increased Physical Damage with Two Handed Melee Weapons',
        AXE_SCOPE,
      ),
    ).toBe(true);
  });

  it('does not treat a bow as a two-handed melee weapon', () => {
    const bow = scope(['bow', 'two_hand_weapon']);
    expect(
      lineAppliesToBuild(
        '25% increased Physical Damage with Two Handed Melee Weapons',
        bow,
      ),
    ).toBe(false);
    expect(lineAppliesToBuild('20% increased Damage with Bows', bow)).toBe(true);
  });

  it('leaves generic lines neutral', () => {
    expect(lineAppliesToBuild('10% increased maximum Life', AXE_SCOPE)).toBe(true);
    expect(lineAppliesToBuild('+20 to Strength', AXE_SCOPE)).toBe(true);
  });

  it('rejects shield and quiver lines without the slot', () => {
    expect(
      lineAppliesToBuild('8% increased Attack Speed while holding a Shield', AXE_SCOPE),
    ).toBe(false);
    expect(
      lineAppliesToBuild(
        '20% increased bonuses gained from Equipped Quiver',
        AXE_SCOPE,
      ),
    ).toBe(false);
    expect(
      lineAppliesToBuild(
        '20% increased bonuses gained from Equipped Quiver',
        scope(['bow', 'quiver']),
      ),
    ).toBe(true);
  });

  it('ignores accuracy and crit lines under Resolute Technique', () => {
    const line = '+200 to Accuracy Rating with Axes';
    expect(lineAppliesToBuild(line, AXE_SCOPE)).toBe(true);
    expect(
      lineAppliesToBuild(line, { ...AXE_SCOPE, resoluteTechnique: true }),
    ).toBe(false);
    expect(
      lineAppliesToBuild('+40% to Critical Strike Multiplier with Axes', {
        ...AXE_SCOPE,
        resoluteTechnique: true,
      }),
    ).toBe(false);
    expect(
      lineAppliesToBuild(
        'Axe Attacks deal 30% increased Damage with Hits and Ailments',
        { ...AXE_SCOPE, resoluteTechnique: true },
      ),
    ).toBe(true);
  });

  it('rejects minion lines unless the build targets minions', () => {
    expect(
      lineAppliesToBuild('Minions have 15% increased maximum Life', AXE_SCOPE),
    ).toBe(false);
    expect(
      lineAppliesToBuild('Minions have 15% increased maximum Life', {
        ...AXE_SCOPE,
        minions: true,
      }),
    ).toBe(true);
  });
});

describe('notableTargetPriorities', () => {
  const targets = [
    'with axes',
    'increased maximum life',
    'increased physical damage',
    'increased armour',
    'increased attack speed',
    'two handed',
  ];
  const nodes: PlanTreeNode[] = [
    {
      id: 1,
      notable: true,
      stats: [
        '25% increased Physical Damage with One Handed Melee Weapons',
        'Attacks with One Handed Melee Weapons deal 25% increased Damage with Ailments',
        '5% increased Attack Speed with One Handed Melee Weapons',
        '+20 to Strength',
      ],
    },
    {
      id: 2,
      notable: true,
      stats: [
        '30% increased Physical Damage with Maces or Sceptres',
        'Mace or Sceptre Attacks deal 30% increased Damage with Ailments',
        '100% increased Stun Duration against Enemies that are on Full Life',
      ],
    },
    {
      id: 3,
      notable: true,
      stats: [
        '25% increased Physical Damage with Two Handed Melee Weapons',
        'Attacks with Two Handed Melee Weapons deal 25% increased Damage with Ailments',
        '5% increased Attack Speed with Two Handed Melee Weapons',
        '+20 to Strength',
      ],
    },
    {
      id: 4,
      notable: true,
      stats: [
        '10% increased maximum Life',
        '25% increased Physical Damage with One Handed Melee Weapons',
      ],
    },
    {
      id: 5,
      notable: true,
      stats: ['+200 to Accuracy Rating with Axes'],
    },
    {
      id: 6,
      notable: true,
      stats: ['Minions have 15% increased maximum Life'],
    },
    { id: 7, notable: false, stats: ['30% increased Physical Damage with Axes'] },
  ];

  it('drops a one-hand notable and a mace notable', () => {
    const priorities = notableTargetPriorities(nodes, targets, AXE_SCOPE);
    expect(priorities[1]).toBeUndefined();
    expect(priorities[2]).toBeUndefined();
  });

  it('keeps a two-handed notable at its target priority', () => {
    const priorities = notableTargetPriorities(nodes, targets, AXE_SCOPE);
    expect(priorities[3]).toBe(3);
  });

  it('uses the next target when the first match is unusable', () => {
    const priorities = notableTargetPriorities(nodes, targets, AXE_SCOPE);
    expect(priorities[4]).toBe(2);
  });

  it('drops a minion-life notable for a non-minion build', () => {
    const priorities = notableTargetPriorities(nodes, targets, AXE_SCOPE);
    expect(priorities[6]).toBeUndefined();
    expect(
      notableTargetPriorities(nodes, targets, { ...AXE_SCOPE, minions: true })[6],
    ).toBe(2);
  });

  it('does not consider non-notables', () => {
    const priorities = notableTargetPriorities(nodes, targets, AXE_SCOPE);
    expect(priorities[7]).toBeUndefined();
  });

  it('drops an accuracy-only match under Resolute Technique', () => {
    expect(
      notableTargetPriorities(nodes, targets, {
        ...AXE_SCOPE,
        resoluteTechnique: true,
      })[5],
    ).toBeUndefined();
    expect(notableTargetPriorities(nodes, targets, AXE_SCOPE)[5]).toBe(1);
  });
});
