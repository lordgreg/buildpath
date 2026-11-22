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
export const BRAVE_FILE_ACCESS_FLAG = 'brave://flags/#file-system-access-api';

export type BrowserKind =
  | 'brave'
  | 'chromium'
  | 'firefox'
  | 'safari'
  | 'unknown';

export function isBraveNavigator(nav: Navigator | undefined): boolean {
  return !!nav && 'brave' in nav;
}

/**
 * Best-effort browser family for folder-writing guidance. iOS browsers all use
 * WebKit and cannot write folders, even when their UA looks like Chrome/Edge.
 */
export function browserKindFrom(ua: string, brave: boolean): BrowserKind {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'safari';
  if (brave) return 'brave';
  if (/CriOS\/|FxiOS\/|EdgiOS\/|OPiOS\//i.test(ua)) return 'safari';
  if (/Firefox\//i.test(ua)) return 'firefox';
  if (/Edg\/|EdgA\/|OPR\/|Opera\/|Chrome\/|Chromium\/|Vivaldi\//i.test(ua)) {
    return 'chromium';
  }
  if (/Safari\/|AppleWebKit\//i.test(ua)) return 'safari';
  return 'unknown';
}

export function browserKind(): BrowserKind {
  if (typeof navigator === 'undefined') return 'unknown';
  return browserKindFrom(navigator.userAgent ?? '', 'brave' in navigator);
}

/** Brave exposes a `brave` object; the File System Access API is off by default. */
export function isBrave(): boolean {
  return browserKind() === 'brave';
}
