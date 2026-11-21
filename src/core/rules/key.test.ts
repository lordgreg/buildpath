import { describe, expect, it } from 'vitest';
import { configKey } from './key.ts';

describe('configKey', () => {
  it('keys rules by the selected build only', () => {
    expect(configKey({ mode: 'family', familyId: 'minion' })).toBe(
      'family:minion',
    );
    expect(
      configKey({ mode: 'ascendancy', ascendancyId: 'necromancer' }),
    ).toBe('ascendancy:necromancer');
    expect(
      configKey({
        mode: 'meta',
        leagueId: 'l',
        skillId: 's',
        ascendancyId: 'a',
      }),
    ).toBe('meta:l:s:a');
  });

  it('shares one scratch key for both starting points', () => {
    expect(configKey({ mode: 'scratch', scratchStart: 'hide' })).toBe(
      'scratch',
    );
    expect(configKey({ mode: 'scratch', scratchStart: 'show' })).toBe(
      'scratch',
    );
  });
});
