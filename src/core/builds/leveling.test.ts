import { describe, expect, it } from 'vitest';
import { activeSwaps } from './leveling.ts';
import type { LevelingBracket, LevelingSwap } from './types.ts';

const brackets: LevelingBracket[] = [
  { until: 12, skills: ['Cleave'] },
  { until: 28, skills: ['Boneshatter'] },
  { until: 68, skills: ['Boneshatter'] },
  { until: 100, skills: ['Boneshatter'] },
];

const sunder: LevelingSwap = {
  gem: 'Sunder',
  fromLevel: 12,
  untilLevel: 28,
  replaces: 'Cleave',
};

describe('activeSwaps', () => {
  it('shows a boundary swap on both brackets that touch it', () => {
    expect(activeSwaps([sunder], brackets, 0)).toEqual([sunder]);
    expect(activeSwaps([sunder], brackets, 1)).toEqual([sunder]);
  });

  it('drops the swap once the next skill has taken over', () => {
    expect(activeSwaps([sunder], brackets, 2)).toEqual([]);
    expect(activeSwaps([sunder], brackets, 3)).toEqual([]);
  });

  it('treats untilLevel as exclusive', () => {
    const short = { ...sunder, untilLevel: 13 };
    expect(activeSwaps([short], brackets, 0)).toEqual([short]);
    expect(activeSwaps([short], brackets, 1)).toEqual([]);
  });

  it('keeps a swap with no end across every later bracket', () => {
    const openEnded = { gem: 'Sunder', fromLevel: 12 };
    expect(activeSwaps([openEnded], brackets, 0)).toHaveLength(1);
    expect(activeSwaps([openEnded], brackets, 3)).toHaveLength(1);
  });

  it('handles missing swaps and out-of-range brackets', () => {
    expect(activeSwaps(undefined, brackets, 0)).toEqual([]);
    expect(activeSwaps([sunder], brackets, 4)).toEqual([]);
    expect(activeSwaps([sunder], [], 0)).toEqual([]);
  });
});