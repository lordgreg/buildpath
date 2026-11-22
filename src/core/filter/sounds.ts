import type { AlertSound, Rule } from './types.ts';

/**
 * Sound packs only change how the *demo* preview sounds and which file the
 * emitted filter points at via CustomAlertSound. FilterPath ships no audio:
 * a pack is a set of file names the user places next to their filter.
 */
export type SoundPackId = 'default' | 'mario' | 'sf' | 'loom' | 'c64';

export interface SoundPackDefinition {
  id: SoundPackId;
  label: string;
  hint: string;
}

export const SOUND_PACKS: SoundPackDefinition[] = [
  { id: 'default', label: 'Default', hint: "The game's built-in alert sounds" },
  { id: 'mario', label: 'Super Mario', hint: 'Coin and 1-Up chiptune jingles' },
  { id: 'sf', label: 'Street Fighter', hint: 'Hit and KO stingers' },
  { id: 'loom', label: 'Loom', hint: 'LucasArts flute draft tones' },
  { id: 'c64', label: 'Commodore 64', hint: 'SID-chip retro beats' },
];

export const DEFAULT_SOUND_PACK: SoundPackId = 'default';

const SOUND_PACK_IDS = SOUND_PACKS.map((pack) => pack.id);

export function isSoundPackId(value: unknown): value is SoundPackId {
  return (
    typeof value === 'string' &&
    (SOUND_PACK_IDS as readonly string[]).includes(value)
  );
}

export function coerceSoundPackId(value: unknown): SoundPackId {
  return isSoundPackId(value) ? value : DEFAULT_SOUND_PACK;
}

/**
 * Every alert slot FilterPath emits, so one pack covers a whole filter. Ids are
 * the built-in PlayAlertSound numbers plus the named Sh voice lines.
 */
export const SOUND_SLOTS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '8',
  'shmirror',
  'shdivine',
  'shexalted',
  'shchaos',
] as const;

function slotFor(sound: AlertSound | undefined): string | null {
  if (sound === undefined || sound === 'None') return null;
  return (typeof sound === 'string' ? sound : String(sound)).toLowerCase();
}

/** Stable file name a pack supplies for one alert slot. */
export function soundFileName(pack: SoundPackId, slot: string): string {
  return `fp-${pack}-${slot.toLowerCase()}.mp3`;
}

/**
 * Points every alert rule at the pack's file. The built-in `alertSound` stays in
 * place so the demo can fall back to a synthesised chime when a file is missing.
 */
export function applySoundPack(
  rules: readonly Rule[],
  pack: SoundPackId,
): Rule[] {
  if (pack === DEFAULT_SOUND_PACK) return rules.map((rule) => rule);

  return rules.map((rule) => {
    if (!rule.style) return rule;
    const slot = slotFor(rule.style.alertSound);
    if (!slot) return rule;
    return {
      ...rule,
      style: { ...rule.style, customAlertSound: soundFileName(pack, slot) },
    };
  });
}
