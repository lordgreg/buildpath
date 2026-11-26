import type { LevelingBracket, LevelingSwap } from './types.ts';

/**
 * The swaps a guide step should mention. A bracket covers the levels after the
 * previous bracket up to its own `until`, so a swap at the boundary (Sunder at
 * 12) appears on both the bracket that ends at 12 and the one that ends at 28.
 * `untilLevel` is exclusive: the level where the next skill takes over.
 */
export function activeSwaps(
  swaps: LevelingSwap[] | undefined,
  brackets: LevelingBracket[],
  bracketIndex: number,
): LevelingSwap[] {
  const bracket = brackets[bracketIndex];
  if (!swaps?.length || !bracket) return [];
  const bracketStart = bracketIndex > 0 ? brackets[bracketIndex - 1]!.until + 1 : 1;
  return swaps.filter(
    (swap) => swap.fromLevel <= bracket.until && (swap.untilLevel ?? 100) > bracketStart,
  );
}