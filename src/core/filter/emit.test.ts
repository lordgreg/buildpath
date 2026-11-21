import { describe, expect, it } from 'vitest';
import { emitFilter, emitRules } from './emit.ts';
import type { Rule } from './types.ts';

describe('emitRules', () => {
  it('writes conditions in a fixed order', () => {
    const rule: Rule = {
      action: 'Show',
      style: { textColor: [1, 2, 3], fontSize: 40 },
      itemLevel: { min: 10 },
      rarity: 'Rare',
      baseTypes: ['Convoking Wand'],
      classNames: ['Wands'],
      comment: 'wand',
    };

    expect(emitRules([rule])).toBe(
      [
        '# wand',
        'Show',
        '    Class "Wands"',
        '    BaseType "Convoking Wand"',
        '    Rarity Rare',
        '    ItemLevel >= 10',
        '    SetFontSize 40',
        '    SetTextColor 1 2 3',
        '',
      ].join('\n'),
    );
  });

  it('strips quotes from values instead of producing broken syntax', () => {
    const text = emitRules([
      { action: 'Show', baseTypes: ['The "Best" Base'], rarity: 'Unique' },
    ]);
    expect(text).toContain('BaseType "The Best Base"');
  });

  it('supports ranges, booleans, continue and every style action', () => {
    const text = emitRules([
      {
        action: 'Hide',
        itemLevel: { min: 1, max: 5 },
        corrupted: false,
        identified: true,
        continue: true,
        style: {
          fontSize: 45,
          textColor: [10, 20, 30, 255],
          borderColor: [1, 2, 3],
          backgroundColor: [4, 5, 6, 255],
          alertSound: 6,
          alertVolume: 300,
          playEffect: 'Blue',
          minimapIcon: { size: 1, color: 'Cyan', shape: 'Diamond' },
        },
      },
    ]);

    expect(text).toContain('ItemLevel >= 1');
    expect(text).toContain('ItemLevel <= 5');
    expect(text).toContain('Corrupted False');
    expect(text).toContain('Identified True');
    expect(text).toContain('Continue');
    expect(text).toContain('SetFontSize 45');
    expect(text).toContain('SetTextColor 10 20 30 255');
    expect(text).toContain('SetBorderColor 1 2 3');
    expect(text).toContain('SetBackgroundColor 4 5 6 255');
    expect(text).toContain('PlayAlertSound 6 300');
    expect(text).toContain('PlayEffect Blue');
    expect(text).toContain('MinimapIcon 1 Cyan Diamond');
  });

  it('is deterministic for the same input', () => {
    const rules: Rule[] = [
      { action: 'Show', rarity: 'Rare' },
      { action: 'Hide', rarity: 'Normal' },
    ];
    expect(emitRules(rules)).toBe(emitRules(rules));
  });

  it('prefixes the header as comments and ends with a newline', () => {
    const text = emitFilter(['hello', 'world'], [
      { action: 'Show', rarity: 'Unique' },
    ]);
    expect(text.startsWith('# hello\n# world\n\nShow\n')).toBe(true);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });
});