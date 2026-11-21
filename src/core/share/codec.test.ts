import { describe, expect, it } from 'vitest';
import type { Rule } from '../filter/types.ts';
import {
  decodeShare,
  encodeShare,
  SHARE_CODE_LIMIT,
  type SharePayload,
} from './codec.ts';

const rules: Rule[] = [
  {
    action: 'Hide',
    comment: 'DEX head',
    baseTypes: ['Hubris Circlet', 'Iron Hat'],
    rarity: 'Rare',
    itemLevel: { min: 80 },
  },
];

describe('share codes', () => {
  it('round-trips a payload', async () => {
    const payload: SharePayload = {
      v: 1,
      label: 'Minion',
      presetVersion: 'abc',
      rules,
    };
    const { code, tooLarge } = await encodeShare(payload);
    expect(code.startsWith('d1.') || code.startsWith('r1.')).toBe(true);
    expect(tooLarge).toBe(false);
    expect(await decodeShare(code)).toEqual(payload);
  });

  it('marks large payloads as too large', async () => {
    const payload: SharePayload = {
      v: 1,
      label: 'Huge',
      presetVersion: 'abc',
      rules: [
        {
          action: 'Hide',
          baseTypes: Array.from({ length: 4000 }, (_, index) => `Base ${index}`),
        },
      ],
    };
    const { code, tooLarge } = await encodeShare(payload);
    expect(code.length).toBeGreaterThan(SHARE_CODE_LIMIT);
    expect(tooLarge).toBe(true);
  });

  it('rejects unknown formats', async () => {
    await expect(decodeShare('nope')).rejects.toThrow('Unknown share code');
  });
});