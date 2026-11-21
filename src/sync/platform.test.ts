import { describe, expect, it } from 'vitest';
import {
  defaultFolderPath,
  detectPlatform,
  folderPathHint,
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

  it('suggests a folder path per platform', () => {
    expect(defaultFolderPath('windows')).toContain('My Games');
    expect(defaultFolderPath('linux')).toContain('compatdata/238960');
    expect(defaultFolderPath('mac')).toBe('');
  });

  it('flags common pasted-path mistakes', () => {
    expect(folderPathHint('relative/path')).toContain('absolute');
    expect(
      folderPathHint(
        '/mnt/Secondary/SteamLibrary/steamapps/compatdata/238960/pfx/drive_c/users/steamuser/Documents',
      ),
    ).toContain('My Games/Path of Exile');
    expect(
      folderPathHint(
        '/mnt/Secondary/SteamLibrary/steamapps/compatdata/238960/pfx/drive_c/users/steamuser/Documents/My Games/Path of Exile/',
      ),
    ).toBeNull();
    expect(folderPathHint('C:\\Users\\me\\Documents\\My Games\\Path of Exile')).toBeNull();
    expect(
      folderPathHint(
        '~/.local/share/Steam/steamapps/compatdata/238960/pfx/drive_c/users/steamuser/Documents/My Games/Path of Exile',
      ),
    ).toBeNull();
  });
});