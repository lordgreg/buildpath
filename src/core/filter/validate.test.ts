import { describe, expect, it } from 'vitest';
import { generateFilter } from './generate.ts';
import { filterNameFor, validateFilter } from './validate.ts';

const valid = [
  'Show',
  '    Class "Wands"',
  '    BaseType "Convoking Wand"',
  '    Rarity Rare',
  '    ItemLevel >= 70',
  '    SetFontSize 45',
  '    SetTextColor 255 255 255 255',
  '    SetBorderColor 217 178 106',
  '    SetBackgroundColor 40 28 12 255',
  '    PlayAlertSound 1 300',
  '    MinimapIcon 1 Yellow Star',
].join('\n');

describe('validateFilter', () => {
  it('accepts a normal block', () => {
    expect(validateFilter(valid)).toEqual([]);
  });

  it('accepts every generated filter', () => {
    const filter = generateFilter({
      archetypeId: 'necro-minions',
      phase: 'leveling',
      strictness: 'soft',
    });
    expect(filter.warnings).toEqual([]);
    expect(validateFilter(filter.text)).toEqual([]);
  });

  it('rejects a block without conditions', () => {
    const issues = validateFilter('Show\n    SetFontSize 40');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('no conditions');
  });

  it('rejects content outside a block', () => {
    const issues = validateFilter('SetFontSize 40');
    expect(issues[0]?.message).toContain('outside');
  });

  it('rejects unknown keywords', () => {
    const issues = validateFilter('Show\n    Rarity Rare\n    SetMagic 5');
    expect(issues[0]?.message).toContain('unknown keyword');
  });

  it('rejects colours outside 0-255', () => {
    const issues = validateFilter(
      'Show\n    Rarity Rare\n    SetTextColor 255 300 -1',
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('between 0 and 255');
  });

  it('rejects a bad minimap icon', () => {
    const issues = validateFilter(
      'Show\n    Rarity Rare\n    MinimapIcon 5 Orange Donut',
    );
    expect(issues[0]?.message).toContain('size color shape');
  });

  it('rejects a bad alert sound volume', () => {
    const issues = validateFilter(
      'Show\n    Rarity Rare\n    PlayAlertSound 4 900',
    );
    expect(issues[0]?.message).toContain('volume');
  });

  it('rejects unknown rarities', () => {
    const issues = validateFilter('Show\n    Rarity Legendary');
    expect(issues[0]?.message).toContain('unknown rarity');
  });

  it('accepts unquoted numeric comparisons', () => {
    expect(
      validateFilter('Show\n    Rarity Rare\n    ItemLevel > 80'),
    ).toEqual([]);
  });

  it('accepts exact-match Class and BaseType lists', () => {
    expect(
      validateFilter(
        'Show\n    Class == "Wands" "Staves"\n    BaseType == "Convoking Wand"',
      ),
    ).toEqual([]);
  });
});

describe('filterNameFor', () => {
  it('keeps a safe name', () => {
    expect(filterNameFor('FilterPath-necro-minions-leveling-normal')).toBe(
      'FilterPath-necro-minions-leveling-normal.filter',
    );
  });

  it('keeps a versioned name', () => {
    expect(filterNameFor('FilterPath-v0.2.0-necro-minions-leveling-normal')).toBe(
      'FilterPath-v0.2.0-necro-minions-leveling-normal.filter',
    );
  });

  it('strips path and shell characters', () => {
    expect(filterNameFor('../../evil:name*')).toBe('evilname.filter');
  });

  it('falls back to FilterPath', () => {
    expect(filterNameFor('***')).toBe('FilterPath.filter');
  });
});