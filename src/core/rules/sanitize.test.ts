import { describe, expect, it } from 'vitest';
import { generateFilter } from '../filter/generate.ts';
import type { Rule } from '../filter/types.ts';
import { withoutUnknownBases } from './sanitize.ts';

describe('withoutUnknownBases', () => {
  it('drops names the game no longer accepts and keeps the rest', () => {
    const rule: Rule = {
      action: 'Show',
      baseTypes: ['Rawhide Gloves', 'Gauche Gloves', 'Sinistral Gloves'],
    };
    const [cleaned] = withoutUnknownBases([rule]);
    expect(cleaned!.baseTypes).toEqual(['Rawhide Gloves']);
  });

  it('leaves a rule without base types alone', () => {
    const rule: Rule = { action: 'Hide', classNames: ['Gloves'] };
    const [cleaned] = withoutUnknownBases([rule]);
    expect(cleaned).toBe(rule);
  });

  it('never emits a stale base in a generated filter', () => {
    // This is the shape of a rule copied from an older preset.
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'minion' },
      phase: 'leveling',
      strictness: 'soft',
      customRules: [
        {
          action: 'Show',
          baseTypes: ['Rawhide Gloves', 'Gauche Gloves', 'Serpent Wand'],
        },
      ],
    });
    expect(filter.text).toContain('"Rawhide Gloves"');
    expect(filter.text).not.toContain('Gauche Gloves');
    expect(filter.text).not.toContain('Serpent Wand');
  });
});
