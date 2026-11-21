import { describe, expect, it } from 'vitest';
import {
  BRAVE_FILE_ACCESS_FLAG,
  browserKindFrom,
  defaultFolderPath,
  detectPlatform,
  folderPathHint,
  isBraveNavigator,
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

  it('recognises Brave and exposes the flag url', () => {
    expect(isBraveNavigator({ brave: {} } as unknown as Navigator)).toBe(true);
    expect(isBraveNavigator({} as Navigator)).toBe(false);
    expect(BRAVE_FILE_ACCESS_FLAG).toBe(
      'brave://flags/#file-system-access-api',
    );
  });

  it('separates browser families for folder guidance', () => {
    const chrome =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
    const edge =
      'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0';
    const firefox =
      'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0';
    const safari =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
    const iosChrome =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/131.0 Mobile/15E148 Safari/604.1';

    expect(browserKindFrom(chrome, false)).toBe('chromium');
    expect(browserKindFrom(edge, false)).toBe('chromium');
    expect(browserKindFrom(firefox, false)).toBe('firefox');
    expect(browserKindFrom(safari, false)).toBe('safari');
    expect(browserKindFrom(iosChrome, false)).toBe('safari');
    expect(browserKindFrom(iosChrome, true)).toBe('safari');
    expect(browserKindFrom(chrome, true)).toBe('brave');
    expect(browserKindFrom('', false)).toBe('unknown');
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