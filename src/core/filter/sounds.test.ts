import { describe, expect, it } from 'vitest';
import {
  applySoundPack,
  coerceSoundPackId,
  DEFAULT_SOUND_PACK,
  isSoundPackId,
  SOUND_SLOTS,
  soundFileName,
} from './sounds.ts';
import { emitRules } from './emit.ts';
import { generateFilter } from './generate.ts';
import type { Rule } from './types.ts';

const alerted: Rule = {
  action: 'Show',
  section: 'gear',
  style: { alertSound: 1, alertVolume: 300 },
};
const named: Rule = {
  action: 'Show',
  section: 'currency',
  style: { alertSound: 'ShDivine' },
};
const silent: Rule = {
  action: 'Show',
  section: 'gear',
  style: { fontSize: 40 },
};

describe('sound packs', () => {
  it('leaves rules untouched for the default pack', () => {
    const [rule] = applySoundPack([alerted], DEFAULT_SOUND_PACK);
    expect(rule).toEqual(alerted);
  });

  it('points alerted rules at the pack file and keeps the built-in sound', () => {
    const [rule] = applySoundPack([alerted], 'mario');
    expect(rule?.style?.customAlertSound).toBe('fp-mario-1.mp3');
    expect(rule?.style?.alertSound).toBe(1);
  });

  it('lowercases named voice lines in the file name', () => {
    const [rule] = applySoundPack([named], 'sf');
    expect(rule?.style?.customAlertSound).toBe('fp-sf-shdivine.mp3');
  });

  it('skips rules without an alert', () => {
    const [rule] = applySoundPack([silent], 'c64');
    expect(rule?.style?.customAlertSound).toBeUndefined();
  });

  it('emits a custom alert instead of the built-in sound', () => {
    const text = emitRules(applySoundPack([alerted], 'mario'));
    expect(text).toContain('CustomAlertSoundOptional "fp-mario-1.mp3"');
    expect(text).not.toContain('PlayAlertSound');
  });

  it('covers every alert slot FilterPath emits', () => {
    expect(SOUND_SLOTS).toHaveLength(11);
    expect(soundFileName('loom', 'ShMirror')).toBe('fp-loom-shmirror.mp3');
  });

  it('validates and coerces ids', () => {
    expect(isSoundPackId('c64')).toBe(true);
    expect(isSoundPackId('nintendo')).toBe(false);
    expect(coerceSoundPackId('nope')).toBe('default');
    expect(coerceSoundPackId('loom')).toBe('loom');
  });

  it('threads the pack through a generated filter', () => {
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'caster' },
      phase: 'leveling',
      strictness: 'soft',
      soundPack: 'c64',
    });
    expect(filter.soundPack).toBe('c64');
    expect(filter.text).toContain('CustomAlertSoundOptional "fp-c64-');
    expect(filter.warnings).toEqual([]);
  });
});
