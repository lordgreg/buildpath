import { describe, expect, it } from 'vitest';
import type { Rule } from '../filter/types.ts';
import { rebaseRules } from './delta.ts';

const rule = (id: string, comment: string): Rule => ({
  id,
  section: 'custom',
  action: 'Hide',
  comment,
  baseTypes: [`${id} base`],
});

describe('rule rebase', () => {
  it('uses the latest base when nothing changed', () => {
    const base = [rule('gear-0', 'old')];
    expect(rebaseRules({ base, edited: base }, [rule('gear-0', 'new')])).toEqual([
      rule('gear-0', 'new'),
    ]);
  });

  it('keeps edited rules and drops deleted base rules', () => {
    const base = [rule('gear-0', 'a'), rule('gear-1', 'b')];
    const edited = [
      { ...rule('gear-0', 'a'), comment: 'mine' },
      rule('custom-1', 'extra'),
    ];
    const latest = [
      rule('gear-0', 'a2'),
      rule('gear-1', 'b2'),
      rule('gear-2', 'new upstream'),
    ];

    expect(rebaseRules({ base, edited }, latest)).toEqual([
      { ...rule('gear-0', 'a2'), comment: 'mine' },
      rule('custom-1', 'extra'),
      rule('gear-2', 'new upstream'),
    ]);
  });

  it('returns the latest base when there is no saved edit', () => {
    const latest = [rule('gear-0', 'new')];
    expect(rebaseRules(undefined, latest)).toEqual(latest);
  });
});