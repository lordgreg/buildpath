import type { AlertSound, NamedAlertSound } from '../../core/filter/types.ts';

const NAMED_FREQUENCY: Record<NamedAlertSound, number> = {
  ShAlchemy: 440,
  ShBlessed: 466,
  ShChaos: 523,
  ShDivine: 659,
  ShExalted: 587,
  ShFusing: 494,
  ShGeneral: 392,
  ShMirror: 784,
  ShRegal: 622,
  ShVaal: 554,
};

export interface AlertTone {
  frequency: number;
  duration: number;
  overtone?: number;
}

/**
 * The demo cannot ship GGG's audio files, so it synthesises a short chime.
 * Higher sound ids and the top Sh voice lines get a higher, longer tone.
 */
export function alertTone(sound: AlertSound | undefined): AlertTone | null {
  if (sound === undefined || sound === 'None') return null;
  if (typeof sound === 'string') {
    return {
      frequency: NAMED_FREQUENCY[sound] ?? 520,
      duration: 0.2,
      overtone: 1.5,
    };
  }
  return {
    frequency: 330 + Math.min(sound, 16) * 32,
    duration: sound >= 6 ? 0.16 : 0.12,
    ...(sound >= 6 ? { overtone: 1.25 } : {}),
  };
}

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    context ??= new Ctor();
    return context;
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  peak: number,
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playAlertSound(
  sound: AlertSound | undefined,
  volume = 100,
): void {
  const profile = alertTone(sound);
  if (!profile) return;
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const peak = Math.min(0.28, Math.max(0.015, (volume / 300) * 0.24));
  const start = ctx.currentTime + 0.01;
  tone(ctx, profile.frequency, start, profile.duration, peak);
  if (profile.overtone) {
    tone(
      ctx,
      profile.frequency * profile.overtone,
      start + profile.duration * 0.35,
      profile.duration * 0.8,
      peak * 0.7,
    );
  }
}

/**
 * Plays a real audio file the user supplied (their filter's CustomAlertSound).
 * Returns false when it cannot be decoded, so the caller can fall back.
 */
export async function playAlertFile(
  blob: Blob,
  volume = 100,
): Promise<boolean> {
  const ctx = audioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') void ctx.resume();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = Math.min(1, Math.max(0.05, volume / 300));
    source.connect(gain).connect(ctx.destination);
    source.start();
    return true;
  } catch {
    return false;
  }
}