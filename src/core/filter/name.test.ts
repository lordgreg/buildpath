import { describe, expect, it } from 'vitest';
import {
  autoBuildName,
  buildFileName,
  resolveBuildName,
  slugify,
} from './name.ts';

describe('filter naming', () => {
  it('slugifies typed names', () => {
    expect(slugify('My Vortex Build!')).toBe('my-vortex-build');
    expect(slugify('  Crème Brûlée  ')).toBe('creme-brulee');
    expect(slugify('A--B')).toBe('a-b');
    expect(slugify('!!!')).toBe('');
  });

  it('derives a name from the build selection', () => {
    expect(autoBuildName({ mode: 'family', familyId: 'minion' })).toBe(
      'minion',
    );
    expect(
      autoBuildName({ mode: 'ascendancy', ascendancyId: 'necromancer' }),
    ).toBe('necromancer');
    expect(
      autoBuildName({
        mode: 'meta',
        skillId: 'lightning-arrow',
        ascendancyId: 'deadeye',
      }),
    ).toBe('lightning-arrow-deadeye');
    expect(autoBuildName({ mode: 'scratch' })).toBe('custom');
  });

  it('prefers a typed name over the derived one', () => {
    const family = { mode: 'family' as const, familyId: 'minion' as const };
    expect(resolveBuildName(family, 'My Vortex')).toBe('my-vortex');
    expect(resolveBuildName(family, '   ')).toBe('minion');
  });

  it('builds the filename in the agreed order', () => {
    expect(
      buildFileName({
        selection: { mode: 'family', familyId: 'minion' },
        phase: 'leveling',
        strictness: 'normal',
      }),
    ).toBe('filterpath-minion-leveling-normal.filter');

    expect(
      buildFileName({
        selection: { mode: 'meta', skillId: 'lightning-arrow', ascendancyId: 'deadeye' },
        phase: 'endgame',
        strictness: 'very-strict',
        name: 'My LA',
      }),
    ).toBe('filterpath-my-la-endgame-very-strict.filter');
  });

  it('collapses phase and strictness for from-scratch filters', () => {
    expect(
      buildFileName({
        selection: { mode: 'scratch', scratchStart: 'hide' },
        phase: 'leveling',
        strictness: 'normal',
      }),
    ).toBe('filterpath-custom-hide-all.filter');

    expect(
      buildFileName({
        selection: { mode: 'scratch', scratchStart: 'show' },
        phase: 'endgame',
        strictness: 'strict',
        name: 'Show me loot',
      }),
    ).toBe('filterpath-show-me-loot-show-all.filter');
  });
});
