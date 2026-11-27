import type { LevelingBracket, LevelingSwap } from './types.ts';

/** A gem change that happens inside, or at the end of, one guide step. */
export interface LevelingUpgrade {
  /** The gem that takes over. */
  gem: string;
  /** Character level it becomes usable at. */
  fromLevel: number;
  /** Exclusive end, when a later gem replaces it. */
  untilLevel?: number;
  /** The gem it replaces, when the step knows it. */
  replaces?: string;
  note?: string;
  /** True when the change lands exactly on the step's last level. */
  atBoundary: boolean;
}

/**
 * One guide step as instructions rather than a gem list. `startSkills` is what
 * the character should be using when the step opens, which is not the same as
 * the bracket's own list: Boneshatter is listed at `until: 28` but is only
 * usable at 28, so the step opens on Sunder and the switch is an upgrade.
 */
export interface LevelingStep {
  /** First character level in the step. */
  from: number;
  /** Last character level in the step; clamped to the checkpoint. */
  until: number;
  /** Gems the character should already have at `from`. */
  startSkills: string[];
  /** Changes inside the step, earliest first. */
  upgrades: LevelingUpgrade[];
}

/**
 * Where a guide step is read. `level` is the checkpoint, so a bracket that
 * overshoots it is clamped: a guide with no level-12 bracket must not present
 * its level-28 bracket at the level-12 checkpoint. `from` is where the step
 * opens when the bracket itself starts earlier, e.g. a missing bracket.
 */
export interface LevelingWindow {
  level?: number;
  from?: number;
}

/**
 * Resolve one guide step into "use this now, switch at that level".
 */
export function levelingStep(
  leveling: { swaps?: LevelingSwap[]; brackets: LevelingBracket[] },
  bracketIndex: number,
  requiredLevel: (gem: string) => number | undefined,
  window?: LevelingWindow,
): LevelingStep | null {
  const bracket = leveling.brackets[bracketIndex];
  if (!bracket) return null;
  const bracketFrom = bracketIndex > 0 ? leveling.brackets[bracketIndex - 1]!.until + 1 : 1;
  const from = Math.max(bracketFrom, window?.from ?? 1);
  const until = window?.level === undefined ? bracket.until : Math.min(bracket.until, window.level);
  if (until < from) return null;

  const swaps = leveling.swaps ?? [];
  const level = (gem: string) => requiredLevel(gem) ?? 1;
  const activeAt = (swap: LevelingSwap, at: number) =>
    swap.fromLevel <= at && (swap.untilLevel ?? 101) > at;

  // A swap made inside an earlier bracket is part of the starting set, and the
  // gem it replaced is gone.
  const done = swaps.filter((swap) => activeAt(swap, from));
  const replaced = new Set(
    done.map((swap) => swap.replaces).filter((gem): gem is string => Boolean(gem)),
  );
  const previous = bracketIndex > 0 ? leveling.brackets[bracketIndex - 1]!.skills : [];
  const skills = bracket.skills ?? [];
  const main = skills[0];
  const previousMain = previous[0];
  const collected = [
    ...new Set([
      ...previous,
      ...done.map((swap) => swap.gem),
      ...skills.filter((gem) => level(gem) <= from),
    ]),
  ].filter(
    (gem) =>
      !replaced.has(gem) &&
      // The new main skill took over inside the previous bracket, so the old
      // one is not part of this step.
      !(gem === previousMain && main !== previousMain && level(main) <= from),
  );
  // Lead with the skill the step is built around, not whichever name the seed
  // listed first in an earlier bracket.
  const lead = done.at(-1)?.gem ?? (main && level(main) <= from ? main : undefined);
  const startSkills =
    lead && collected.includes(lead)
      ? [lead, ...collected.filter((gem) => gem !== lead)]
      : collected;

  const upgrades: LevelingUpgrade[] = [];
  const seen = new Set<string>();
  for (const swap of swaps) {
    if (swap.fromLevel <= from || swap.fromLevel > until) continue;
    seen.add(swap.gem);
    upgrades.push({ ...swap, atBoundary: swap.fromLevel === until });
  }
  // The next bracket's main skill can become usable before this step ends, and
  // that hand-off has to be said out loud: a seed that writes "until 28" for
  // both Cleave and Cyclone never says when the swap happens.
  const nextMain = leveling.brackets[bracketIndex + 1]?.skills?.[0];
  const candidates = [
    ...skills.map((gem, index) => ({ gem, replaces: index === 0 ? startSkills[0] : undefined })),
    ...(nextMain && !skills.includes(nextMain)
      ? [{ gem: nextMain, replaces: startSkills[0] }]
      : []),
  ];
  for (const candidate of candidates) {
    const gem = candidate.gem;
    if (seen.has(gem) || level(gem) <= from || level(gem) > until) continue;
    seen.add(gem);
    upgrades.push({
      gem,
      fromLevel: level(gem),
      replaces:
        swaps.find((swap) => swap.untilLevel === level(gem) && swap.gem !== gem)?.gem ??
        candidate.replaces,
      atBoundary: level(gem) === until,
    });
  }
  upgrades.sort((a, b) => a.fromLevel - b.fromLevel);

  return { from, until, startSkills, upgrades };
}
