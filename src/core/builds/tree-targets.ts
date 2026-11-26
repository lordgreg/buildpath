import type { BaseType } from '../data/base-types.ts';

/** The tree facts the planner needs, copied from `src/generated/tree-geometry.json`. */
export interface PlanTreeNode {
  id: number;
  notable: boolean;
  keystone?: boolean;
  stats?: readonly string[];
}

/** What the build can actually use from a notable's stat lines. */
export interface PlanScope {
  traits: readonly string[];
  resoluteTechnique: boolean;
  minions: boolean;
}

/** Item-class tags that decide which weapon words a stat line can satisfy. */
const WEAPON_FAMILIES = ['axe', 'sword', 'mace', 'sceptre', 'claw', 'dagger', 'wand', 'bow', 'staff'] as const;

/**
 * Words a tree stat uses for a weapon family. "stave"/"staves" is the tree's
 * spelling of the staff cluster; "warstaff" is a two-handed staff base.
 */
const FAMILY_WORDS: readonly (readonly [string, string])[] = [
  ['axe', 'axe'],
  ['sword', 'sword'],
  ['mace', 'mace'],
  ['sceptre', 'sceptre'],
  ['claw', 'claw'],
  ['dagger', 'dagger'],
  ['wand', 'wand'],
  ['bow', 'bow'],
  ['staff', 'staff'],
  ['stave', 'staff'],
  ['unarmed', 'unarmed'],
];

/**
 * The weapon words a build's gear can satisfy. A two-hand axe is
 * `axe + two_hand_weapon + melee`; a bow is `bow + two_hand_weapon` but not
 * `melee`; a wand is `wand + one_hand_weapon` but not `melee`.
 */
export function weaponTraitsFor(
  weapon: Pick<BaseType, 'tags'> | undefined,
  offhand?: Pick<BaseType, 'tags'> | undefined,
): string[] {
  if (!weapon) return [];
  const tags = weapon.tags;
  const traits = new Set<string>();
  if (tags.includes('one_hand_weapon')) traits.add('one_hand_weapon');
  if (tags.includes('two_hand_weapon')) traits.add('two_hand_weapon');
  // Bows and wands are ranged; every other weapon base in the registry is melee.
  if (tags.includes('weapon') && !tags.includes('ranged')) traits.add('melee');
  for (const family of WEAPON_FAMILIES) {
    if (tags.includes(family)) traits.add(family);
  }
  if (tags.includes('warstaff')) traits.add('staff');
  for (const tag of offhand?.tags ?? []) {
    if (tag === 'shield' || tag === 'quiver') traits.add(tag);
  }
  return [...traits].sort();
}

function lineApplies(
  line: string,
  traits: ReadonlySet<string>,
  scope: PlanScope,
): boolean {
  const text = line.toLowerCase();
  if (!scope.minions && text.includes('minion')) return false;
  if (
    scope.resoluteTechnique &&
    (text.includes('accuracy rating') ||
      text.includes('critical strike chance') ||
      text.includes('critical strike multiplier'))
  ) {
    return false;
  }
  if (text.includes('one handed') && !traits.has('one_hand_weapon')) return false;
  if (text.includes('two handed') && !traits.has('two_hand_weapon')) return false;
  if (text.includes('melee') && !traits.has('melee')) return false;
  // `a shield` catches "while holding a Shield" and "Dual Wielding or holding
  // a Shield"; the other two spellings catch "Staff or Shield". Plain "Energy
  // Shield" must not demand a shield, so the bare word is not enough.
  if (
    (text.includes('a shield') || text.includes('or shield') || text.includes('shield or')) &&
    !traits.has('shield')
  ) {
    return false;
  }
  if (text.includes('quiver') && !traits.has('quiver')) return false;

  let mentioned = false;
  let allowed = false;
  for (const [word, family] of FAMILY_WORDS) {
    if (!text.includes(word)) continue;
    mentioned = true;
    if (traits.has(family)) allowed = true;
  }
  return !mentioned || allowed;
}

/**
 * Whether one stat line can do anything for this build. A line is rejected
 * when it names a generic qualifier the weapon lacks (`one handed`, `two
 * handed`, `melee`) or when every weapon family it mentions is one the build
 * does not wield. A line with no weapon words is neutral and stays eligible.
 *
 * Resolute Technique makes accuracy and critical-strike lines dead, and a
 * build that does not target minions cannot use "Minions have ..." lines.
 */
export function lineAppliesToBuild(line: string, scope: PlanScope): boolean {
  return lineApplies(line, new Set(scope.traits), scope);
}

/**
 * Map every notable to the first target phrase it satisfies on a line the
 * build can use. The Lua planner consumes this map directly, so the matching
 * rules live in one testable place instead of inside the oracle.
 */
export function notableTargetPriorities(
  nodes: readonly PlanTreeNode[],
  targets: readonly string[],
  scope: PlanScope,
): Record<number, number> {
  const traits = new Set(scope.traits);
  const patterns = targets.map((target) => target.toLowerCase());
  const priorities: Record<number, number> = {};
  for (const node of nodes) {
    if (!node.notable || node.keystone) continue;
    const lines = (node.stats ?? []).map((line) => line.toLowerCase());
    for (let index = 0; index < patterns.length; index += 1) {
      const pattern = patterns[index];
      if (
        lines.some(
          (line) => line.includes(pattern) && lineApplies(line, traits, scope),
        )
      ) {
        priorities[node.id] = index + 1;
        break;
      }
    }
  }
  return priorities;
}
