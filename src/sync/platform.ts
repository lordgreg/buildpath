export type Platform = 'windows' | 'linux' | 'mac' | 'unknown';

export const WINDOWS_FILTER_PATH = 'Documents\\My Games\\Path of Exile';
export const PROTON_FILTER_PATH =
  '~/.local/share/Steam/steamapps/compatdata/238960/pfx/drive_c/users/steamuser/Documents/My Games/Path of Exile';
export const PROTON_EXTRA_LIBRARY =
  '/path/to/SteamLibrary/steamapps/compatdata/238960/pfx/drive_c/users/steamuser/Documents/My Games/Path of Exile';
export const PROTON_FIND_COMMAND =
  'find ~ /mnt /media -path "*compatdata/238960*" -type d -name "Path of Exile" 2>/dev/null';
export const LINUX_WRITE_COMMAND = 'chmod u+w "/path/to/Path of Exile"';

export function platformFrom(value: string): Platform {
  if (/windows|win32|win64/i.test(value)) return 'windows';
  if (/linux|x11/i.test(value)) return 'linux';
  if (/mac|darwin/i.test(value)) return 'mac';
  return 'unknown';
}

/** Best-effort: browsers expose a platform hint, not a reliable OS name. */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const value =
    nav.userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent ??
    '';
  return platformFrom(value);
}

export function writeHint(platform: Platform): string {
  if (platform === 'windows') {
    return 'Windows: right-click the folder, open Properties → Security, and give your user Modify permission.';
  }
  if (platform === 'mac') {
    return 'macOS: open Finder → Get Info → Sharing & Permissions and allow your user to read and write.';
  }
  return `Linux/Proton: make the folder writable for your user, e.g. ${LINUX_WRITE_COMMAND}.`;
}