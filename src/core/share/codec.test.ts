import { describe, expect, it } from 'vitest';
import type { Rule } from '../filter/types.ts';
import {
  decodeShare,
  encodeShare,
  MAX_CODE_LENGTH,
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

  it('round-trips a full build payload', async () => {
    const payload: SharePayload = {
      v: 1,
      label: 'Build',
      presetVersion: 'abc',
      state: { mode: 'family', familyId: 'minion' },
      baseRules: rules,
      editedRules: rules,
    };
    const { code, tooLarge } = await encodeShare(payload);
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

  it('rejects a code longer than the builder can produce', async () => {
    const code = `r1.${'A'.repeat(MAX_CODE_LENGTH)}`;
    await expect(decodeShare(code)).rejects.toThrow('too large');
  });

  it('rejects a decompression bomb instead of decoding it', async () => {
    const payload: SharePayload = {
      v: 1,
      label: 'Bomb',
      presetVersion: 'abc',
      state: { filler: 'A'.repeat(1_000_000) },
    };
    const { code } = await encodeShare(payload);
    expect(code.length).toBeLessThan(SHARE_CODE_LIMIT);
    await expect(decodeShare(code)).rejects.toThrow('too large');
  });

  it('repairs malformed rules instead of throwing', async () => {
    const broken = {
      v: 1,
      label: 'Broken',
      presetVersion: 'abc',
      customRules: [
        { action: 'Hide', baseTypes: 'Leather Belt' },
        'not a rule',
        { action: 'Hide', itemLevel: { min: 'nope' } },
      ],
    } as unknown as SharePayload;
    const { code } = await encodeShare(broken);

    const payload = await decodeShare(code);
    expect(payload.customRules).toEqual([
      { action: 'Hide', baseTypes: ['Leather Belt'] },
      { action: 'Hide', disabled: true },
    ]);
  });

  it('treats a non-array rule field as no rules', async () => {
    const broken = {
      v: 1,
      label: 'Broken',
      presetVersion: 'abc',
      state: { mode: 'family', familyId: 'minion' },
      customRules: 'nope',
    } as unknown as SharePayload;
    const { code } = await encodeShare(broken);

    const payload = await decodeShare(code);
    expect(payload.customRules).toEqual([]);
    expect(payload.state).toEqual({ mode: 'family', familyId: 'minion' });
  });

  it('rejects a payload without a version or contents', async () => {
    const { code } = await encodeShare({ label: 'x' } as unknown as SharePayload);
    await expect(decodeShare(code)).rejects.toThrow('Invalid share code');
  });
});