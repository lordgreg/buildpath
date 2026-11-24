import { describe, expect, it } from 'vitest';
import { allSelections } from './all-selections.ts';
import { emitRulesWithSpans } from './emit.ts';
import { compileFilter, generateFilter } from './generate.ts';
import { STRICTNESS_ORDER } from './presets.ts';
import type { Rule } from './types.ts';
import { parseFilter } from './validate.ts';

const PHASES = ['leveling', 'endgame'] as const;

/**
 * The fields the emitter writes, after the normalisations it applies: list
 * values lose their own quotes, a numeric sound always carries a volume, and
 * an empty style is not written. Metadata is never emitted.
 */
function comparable(rule: Rule): Rule {
  const {
    id: _id,
    section: _section,
    styleKind: _styleKind,
    disabled: _disabled,
    chips: _chips,
    ...rest
  } = rule;
  const next = structuredClone(rest) as Rule;

  for (const key of ['classNames', 'baseTypes', 'hasExplicitMod'] as const) {
    const values = next[key];
    if (values) next[key] = values.map((value) => value.replaceAll('"', ''));
  }

  if (next.style) {
    const style = next.style;
    if (typeof style.alertSound === 'number') {
      style.alertVolume = style.alertVolume ?? 100;
    } else {
      delete style.alertVolume;
    }
    if (Object.keys(style).length === 0) delete next.style;
  }

  return next;
}

describe('parseFilter', () => {
  it('parses a simple block', () => {
    const text = [
      '# wand',
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
      '',
    ].join('\n');

    expect(parseFilter(text)).toEqual({
      rules: [
        {
          action: 'Show',
          comment: 'wand',
          classNames: ['Wands'],
          baseTypes: ['Convoking Wand'],
          rarity: 'Rare',
          itemLevel: { min: 70 },
          style: {
            fontSize: 45,
            textColor: [255, 255, 255, 255],
            borderColor: [217, 178, 106],
            backgroundColor: [40, 28, 12, 255],
            alertSound: 1,
            alertVolume: 300,
            minimapIcon: { size: 1, color: 'Yellow', shape: 'Star' },
          },
        },
      ],
      issues: [],
    });
  });

  it('reads exact-match Class and BaseType lists', () => {
    const { rules, issues } = parseFilter(
      [
        'Show',
        '    Class == "Wands" "Staves"',
        '    BaseType == "Convoking Wand"',
        '',
      ].join('\n'),
    );

    expect(issues).toEqual([]);
    expect(rules).toEqual([
      {
        action: 'Show',
        classNames: ['Wands', 'Staves'],
        baseTypes: ['Convoking Wand'],
      },
    ]);
  });

  it('drops header comments and keeps the first block comment', () => {
    const text = [
      '# ========================================================================',
      '# FilterPath 0.33.2',
      '# ========================================================================',
      '',
      '# first',
      'Show',
      '    Rarity Rare',
      '',
    ].join('\n');

    const { rules, issues } = parseFilter(text);
    expect(issues).toEqual([]);
    expect(rules).toEqual([
      { action: 'Show', comment: 'first', rarity: 'Rare' },
    ]);
  });

  it('keeps ranges, booleans, continue and every style action', () => {
    const text = [
      'Hide',
      '    Rarity Normal',
      '    ItemLevel >= 1',
      '    ItemLevel <= 5',
      '    Corrupted False',
      '    Identified True',
      '    Continue',
      '    SetFontSize 40',
      '    SetTextColor 10 20 30 255',
      '    SetBorderColor 1 2 3',
      '    SetBackgroundColor 4 5 6 255',
      '    PlayAlertSound 6 300',
      '    PlayEffect Blue',
      '    MinimapIcon 1 Cyan Diamond',
      '',
    ].join('\n');

    expect(parseFilter(text)).toEqual({
      rules: [
        {
          action: 'Hide',
          rarity: 'Normal',
          itemLevel: { min: 1, max: 5 },
          corrupted: false,
          identified: true,
          continue: true,
          style: {
            fontSize: 40,
            textColor: [10, 20, 30, 255],
            borderColor: [1, 2, 3],
            backgroundColor: [4, 5, 6, 255],
            alertSound: 6,
            alertVolume: 300,
            playEffect: 'Blue',
            minimapIcon: { size: 1, color: 'Cyan', shape: 'Diamond' },
          },
        },
      ],
      issues: [],
    });
  });

  it('reports unknown keywords and bad values', () => {
    const { rules, issues } = parseFilter(
      [
        'Show',
        '    Rarity Legendary',
        '    SetMagic 5',
        '    SetTextColor 255 300 -1',
        '',
      ].join('\n'),
    );

    expect(rules).toEqual([{ action: 'Show' }]);
    expect(issues.map((issue) => issue.message)).toEqual([
      'Rarity unknown rarity "Legendary"',
      'unknown keyword "SetMagic"',
      'SetTextColor expects 3 or 4 numbers between 0 and 255',
    ]);
  });

  it('reports statements outside a block', () => {
    const { rules, issues } = parseFilter('Rarity Rare\nShow\n    Rarity Rare');

    expect(rules).toEqual([{ action: 'Show', rarity: 'Rare' }]);
    expect(issues).toEqual([
      { line: 1, message: '"Rarity" appears outside a Show/Hide block' },
    ]);
  });

  it('reports a statement that is not indented', () => {
    const { rules, issues } = parseFilter('Show\nRarity Rare');

    expect(rules).toEqual([{ action: 'Show', rarity: 'Rare' }]);
    expect(issues).toEqual([
      { line: 2, message: '"Rarity" is not indented inside a block' },
    ]);
  });

  it('reports a block action it cannot represent', () => {
    const { rules, issues } = parseFilter('Minimal\n    Rarity Rare');

    expect(rules).toEqual([]);
    expect(issues).toEqual([{ line: 1, message: 'cannot parse a Minimal block' }]);
  });
});

describe('parse-back round trip', () => {
  it('round-trips every generated filter', () => {
    for (const { label, selection } of allSelections()) {
      for (const phase of PHASES) {
        for (const strictness of STRICTNESS_ORDER) {
          const where = `${label} ${phase}/${strictness}`;
          const filter = generateFilter({ selection, phase, strictness });

          expect(filter.warnings, where).toEqual([]);

          const parsed = parseFilter(filter.text);
          expect(parsed.issues, where).toEqual([]);
          expect(parsed.rules, where).toEqual(
            filter.rules.map((rule) => comparable(rule)),
          );
        }
      }
    }
  });

  it('round-trips hostile custom rules or reports why they were left out', () => {
    const hostile: Rule[] = [
      {
        action: 'Show',
        comment: 'Café "quoted"',
        rarity: 'Rare',
      },
      {
        action: 'Hide',
        classNames: ['Rings', 'Bad"Name'],
        baseTypes: ['Gold Ring'],
        rarity: 'Normal',
      },
      {
        action: 'Hide',
        baseTypes: [],
        rarity: 'Normal',
      },
      {
        action: 'Hide',
        baseTypes: ['Not A Real Base'],
        rarity: 'Normal',
      },
      {
        action: 'Hide',
        classNames: ['Bad"Name'],
        rarity: 'Normal',
      },
      {
        action: 'Hide',
        rarity: 'Normal',
        style: {
          fontSize: 10,
          textColor: [300, 0, 0],
          borderColor: [1, 2, 3],
          alertSound: 99,
          alertVolume: 900,
          playEffect: 'NotAColor',
          minimapIcon: { size: 9, color: 'Red', shape: 'Star' },
        } as unknown as Rule['style'],
      },
      {
        action: 'Show',
        rarity: 'Rare',
        itemLevel: { min: 70, max: 80 },
        corrupted: true,
        identified: false,
        continue: true,
        hasExplicitMod: ['Veil'],
        style: {
          fontSize: 40,
          textColor: [1, 2, 3, 255],
          borderColor: [4, 5, 6],
          backgroundColor: [7, 8, 9, 255],
          alertSound: 'ShGeneral',
          alertVolume: 200,
          playEffect: 'Blue',
          minimapIcon: { size: 1, color: 'Cyan', shape: 'Diamond' },
        },
      },
      {
        action: 'Hide',
        rarity: 'Normal',
        style: {
          textColor: [1, 2, 3],
          borderColor: [4, 5, 6],
          backgroundColor: [7, 8, 9],
          alertSound: 1,
          alertVolume: 300,
          playEffect: 'Purple',
          minimapIcon: { size: 2, color: 'Pink', shape: 'Moon' },
        },
      },
    ];

    const compiled = compileFilter({
      selection: { mode: 'family', familyId: 'caster' },
      phase: 'endgame',
      strictness: 'soft',
      customRules: hostile,
    });

    expect(compiled.skippedCustomRules.map((entry) => entry.index)).toEqual([
      2, 3, 4,
    ]);
    expect(compiled.skippedCustomRules.map((entry) => entry.reason)).toEqual([
      expect.stringMatching(/Base types list is empty/),
      expect.stringMatching(/none of its base types are known/),
      expect.stringMatching(/none of its Classes values are known classes/),
    ]);

    const custom = compiled.rules.filter((rule) => rule.section === 'custom');
    expect(custom).toHaveLength(5);

    const { text, spans, rejected } = emitRulesWithSpans(custom);
    expect(rejected).toEqual([]);

    const parsed = parseFilter(text);
    expect(parsed.issues).toEqual([]);
    expect(parsed.rules).toEqual(spans.map((span) => comparable(span.rule)));
  });
});
