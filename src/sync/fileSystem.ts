export interface FilterFileInfo {
  name: string;
  size: number;
  modified: number;
  appVersion: string | null;
  formatVersion: number | null;
  presetVersion: string | null;
  build: string | null;
  /** The build query string from the `Selection:` header line, if present. */
  selection: string | null;
}

export interface FilterHeader {
  appVersion: string | null;
  formatVersion: number | null;
  presetVersion: string | null;
  build: string | null;
  selection: string | null;
}

export function parseFilterHeader(text: string): FilterHeader {
  const version = /^# FilterPath (\S+) - filter format (\d+)\s*$/m.exec(text);
  const build = /^# Build: (.+)$/m.exec(text);
  const presets = /^# Presets: (.+)$/m.exec(text);
  const selection = /^# Selection: (.+)$/m.exec(text);
  return {
    appVersion: version?.[1] ?? null,
    formatVersion: version ? Number(version[2]) : null,
    presetVersion: presets?.[1]?.trim() ?? null,
    build: build?.[1]?.trim() ?? null,
    selection: selection?.[1]?.trim() ?? null,
  };
}

export type FilterUpdateKind = 'presets' | 'version' | null;

/** Presets take precedence: an old preset hash means the rules are out of date. */
export function filterUpdateKind(
  file: Pick<FilterHeader, 'appVersion' | 'presetVersion'>,
  appVersion: string,
  presetVersion: string,
): FilterUpdateKind {
  if (file.presetVersion !== presetVersion) return 'presets';
  if (file.appVersion !== appVersion) return 'version';
  return null;
}

export function backupName(name: string): string {
  return `${name}.bak`;
}

export function isFilterFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.filter');
}

/**
 * Files FilterPath writes itself. They are safe to overwrite without asking:
 * every write keeps the previous contents as `<name>.bak`.
 */
export function isFilterPathFileName(name: string): boolean {
  return /^filterpath-/i.test(name);
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickFiltersDirectory(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker({
    mode: 'readwrite',
    startIn: 'documents',
  });
}

export async function ensurePermission(
  handle: FileSystemDirectoryHandle,
  request = true,
): Promise<PermissionState> {
  const descriptor = { mode: 'readwrite' as const };
  const current = (await handle.queryPermission?.(descriptor)) ?? 'granted';
  if (current === 'granted') return current;
  if (!request) return current;
  return (await handle.requestPermission?.(descriptor)) ?? 'denied';
}

export type WriteProbe = 'ok' | 'read-only' | 'error';

export interface DirectoryProbe {
  read: boolean;
  write: WriteProbe;
}

/** Writes and removes a temporary file to prove the folder is writable. */
export async function probeFilterDirectory(
  handle: FileSystemDirectoryHandle,
): Promise<DirectoryProbe> {
  let readable = true;
  try {
    await listFilterFiles(handle);
  } catch {
    readable = false;
  }

  const probeName = `.filterpath-write-test-${Date.now()}`;
  try {
    const file = await handle.getFileHandle(probeName, { create: true });
    const stream = await file.createWritable();
    await stream.write('FilterPath write test');
    await stream.close();
  } catch {
    return { read: readable, write: readable ? 'read-only' : 'error' };
  }

  try {
    await handle.removeEntry(probeName);
  } catch {
    // A leftover probe file is harmless; the important part was the write.
  }
  return { read: readable, write: 'ok' };
}

export async function listFilterFiles(
  handle: FileSystemDirectoryHandle,
): Promise<FilterFileInfo[]> {
  const files: FilterFileInfo[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue;
    if (!isFilterFileName(entry.name)) continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    const header = parseFilterHeader(await file.text());
    files.push({
      name: entry.name,
      size: file.size,
      modified: file.lastModified,
      ...header,
    });
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Writes a filter, keeping a single `<name>.filter.bak` copy of the previous
 * contents. Never deletes or touches other files.
 */
/**
 * Removes one FilterPath file and its `.bak` copy. Callers must only pass names
 * that came from `listFilterFiles`, so unrelated files are never touched.
 */
export async function removeFilterFile(
  handle: FileSystemDirectoryHandle,
  name: string,
): Promise<void> {
  await handle.removeEntry(name);
  try {
    await handle.removeEntry(backupName(name));
  } catch {
    // No backup to remove.
  }
}

export async function writeFilter(
  handle: FileSystemDirectoryHandle,
  name: string,
  text: string,
): Promise<{ backup: string | null }> {
  let backup: string | null = null;

  try {
    const existing = await handle.getFileHandle(name);
    const file = await existing.getFile();
    const previous = await file.text();
    backup = backupName(name);
    const backupHandle = await handle.getFileHandle(backup, { create: true });
    const backupStream = await backupHandle.createWritable();
    await backupStream.write(previous);
    await backupStream.close();
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'NotFoundError') {
      throw error;
    }
  }

  const target = await handle.getFileHandle(name, { create: true });
  const stream = await target.createWritable();
  await stream.write(text);
  await stream.close();
  return { backup };
}