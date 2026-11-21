import { describe, expect, it } from 'vitest';
import { generateFilter } from './generate.ts';

const selection = { mode: 'family' as const, familyId: 'minion' as const };

describe('section strictness and themes', () => {
  it('applies strictness per section', () => {
    const normal = generateFilter({
      selection,
      phase: 'leveling',
      strictness: 'normal',
    });
    expect(normal.text).toContain('ItemLevel >= 10');

    const strictGear = generateFilter({
      selection,
      phase: 'leveling',
      strictness: 'normal',
      sectionStrictness: { gear: 'strict' },
    });

    expect(strictGear.text).toContain('Section strictness: gear=strict');
    expect(strictGear.text).toContain('ItemLevel >= 25');
    expect(strictGear.text).toContain('ItemLevel <= 24');
    // Currency still uses the global normal preset, so low currency remains.
    expect(strictGear.text).toContain('"Scroll of Wisdom"');
  });

  it('applies the contrast theme to show rules', () => {
    const filter = generateFilter({
      selection,
      phase: 'leveling',
      strictness: 'normal',
      theme: 'contrast',
    });

    const weapon = filter.text.slice(
      filter.text.indexOf('# weapon - rare'),
      filter.text.indexOf('# weapon - magic'),
    );
    expect(weapon).toContain('SetTextColor 255 255 255 255');
    expect(weapon).toContain('SetBorderColor 255 255 255 255');
    expect(weapon).toContain('SetBackgroundColor 0 0 0 255');
  });

  it('mutes sounds and icons', () => {
    const filter = generateFilter({
      selection,
      phase: 'leveling',
      strictness: 'normal',
      theme: 'muted',
    });
    expect(filter.text).not.toContain('MinimapIcon');
    expect(filter.text).not.toContain('PlayAlertSound');
  });
});