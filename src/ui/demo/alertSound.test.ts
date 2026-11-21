import { describe, expect, it } from 'vitest';
import { alertTone } from './alertSound.ts';

describe('demo alert tones', () => {
  it('has no tone for missing or disabled alerts', () => {
    expect(alertTone(undefined)).toBeNull();
    expect(alertTone('None')).toBeNull();
  });

  it('makes higher sound ids more intense', () => {
    const one = alertTone(1);
    const six = alertTone(6);
    expect(one?.frequency).toBeLessThan(six!.frequency);
    expect(one?.duration).toBeLessThan(six!.duration);
    expect(one?.overtone).toBeUndefined();
    expect(six?.overtone).toBeGreaterThan(1);
  });

  it('gives the named orb voices distinct tones', () => {
    const chaos = alertTone('ShChaos');
    const divine = alertTone('ShDivine');
    const mirror = alertTone('ShMirror');
    expect(chaos?.frequency).toBeLessThan(divine!.frequency);
    expect(divine?.frequency).toBeLessThan(mirror!.frequency);
    expect(mirror?.overtone).toBeGreaterThan(1);
  });
});