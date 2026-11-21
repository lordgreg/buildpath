import { describe, expect, it } from 'vitest';
import {
  detectPlatform,
  platformFrom,
  PROTON_FILTER_PATH,
  WINDOWS_FILTER_PATH,
  writeHint,
} from './platform.ts';

describe('platform guidance', () => {
  it('recognises desktop platforms from UA hints', () => {
    expect(platformFrom('Windows')).toBe('windows');
    expect(platformFrom('Win32')).toBe('windows');
    expect(platformFrom('Linux x86_64')).toBe('linux');
    expect(platformFrom('X11; Linux x86_64')).toBe('linux');
    expect(platformFrom('macOS')).toBe('mac');
    expect(platformFrom('MacIntel')).toBe('mac');
    expect(platformFrom('')).toBe('unknown');
  });

  it('detects the current environment without throwing', () => {
    expect(['windows', 'linux', 'mac', 'unknown']).toContain(
      detectPlatform(),
    );
  });

  it('points at the game filter folders', () => {
    expect(WINDOWS_FILTER_PATH).toContain('My Games');
    expect(PROTON_FILTER_PATH).toContain('compatdata/238960');
    expect(writeHint('linux')).toContain('chmod u+w');
    expect(writeHint('windows')).toContain('Properties');
  });
});