import { describe, expect, it } from 'vitest';
import type { Rule } from '../filter/types.ts';
import { emittedRuleOrder } from './order.ts';

const rule = (comment: string, section?: Rule['section']): Rule => ({
  action: 'Show',
  comment,
  section,
});

describe('emittedRuleOrder', () => {
  it('puts the always-on blocks first and My rules before the preset', () => {
    const base = [
      rule('quest', 'quest'),
      rule('veiled', 'veiled'),
      rule('gear', 'gear'),
      rule('currency', 'currency'),
    ];
    const custom = [rule('mine', 'custom')];

    expect(emittedRuleOrder(base, custom).map((entry) => entry.comment)).toEqual(
      ['quest', 'veiled', 'mine', 'gear', 'currency'],
    );
  });

  it('keeps generated rules without a section after My rules', () => {
    const base = [rule('scratch base', 'custom'), rule('gear', 'gear')];
    expect(
      emittedRuleOrder(base, [rule('mine', 'custom')]).map(
        (entry) => entry.comment,
      ),
    ).toEqual(['mine', 'scratch base', 'gear']);
  });
});
