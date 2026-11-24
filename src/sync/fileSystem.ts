import { FILTER_FORMAT_VERSION } from '../core/filter/version.ts';

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

/**
 * The comment block at the very top of the file. A FilterPath header only
 * counts there, so a foreign filter that quotes one further down is not ours.
 */
function leadingComments(text: string): string {
  const lines: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('#')) break;
    lines.push(line);
  }
  return lines.join('\n');
}

export function parseFilterHeader(text: string): FilterHeader {
  const header = leadingComments(text);
  const version = /^# FilterPath (\S+) - filter format (\d+)\s*$/m.exec(header);
  const build = /^# Build: (.+)$/m.exec(header);
  const presets = /^# Presets: (.+)$/m.exec(header);
  const selection = /^# Selection: (.+)$/m.exec(header);
  return {
    appVersion: version?.[1] ?? null,
    formatVersion: version ? Number(version[2]) : null,
    presetVersion: presets?.[1]?.trim() ?? null,
    build: build?.[1]?.trim() ?? null,
    selection: selection?.[1]?.trim() ?? null,
  };
}

/** -1, 0 or 1 for dotted numeric versions; null when either is not one. */
function compareVersions(a: string, b: string): number | null {
  const pattern = /^\d+(\.\d+)*$/;
  if (!pattern.test(a) || !pattern.test(b)) return null;
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

export type FilterUpdateKind = 'presets' | 'version' | null;

/**
 * Presets take precedence: an old preset hash means the rules are out of date.
 * Only files FilterPath wrote can be outdated, and never one written by a newer
 * or unrecognised release: an older open tab must not replace it. A different
 * preset hash within the same release cannot be ordered, so it is reported but
 * never removed in bulk (see `staleFilterPathFiles`).
 */
export function filterUpdateKind(
  file: Pick<FilterHeader, 'appVersion' | 'presetVersion'> &
    Partial<Pick<FilterHeader, 'formatVersion'>>,
  appVersion: string,
  presetVersion: string,
): FilterUpdateKind {
  if (file.appVersion === null) return null;
  if ((file.formatVersion ?? 0) > FILTER_FORMAT_VERSION) return null;
  if (file.appVersion !== appVersion) {
    const order = compareVersions(file.appVersion, appVersion);
    if (order === null || order > 0) return null;
  }
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
 * Files named like FilterPath's own. The name alone does not prove FilterPath
 * wrote the file; use `isOwnedFilterPathFile` before deleting or overwriting.
 */
export function isFilterPathFileName(name: string): boolean {
  return /^filterpath-/i.test(name);
}

/**
 * A file FilterPath wrote: its name and its leading header both say so. Only
 * these are overwritten without asking or offered for removal.
 */
export function isOwnedFilterPathFile(
  file: Pick<FilterFileInfo, 'name' | 'appVersion'>,
): boolean {
  return isFilterPathFileName(file.name) && file.appVersion !== null;
}

export function sameFileName(a: string, b: string): boolean {
  // Windows and macOS file systems ignore letter case.
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Outdated FilterPath files that may be bulk-removed: written by a strictly
 * older release, and never the current file.
 */
export function staleFilterPathFiles<
  T extends Pick<
    FilterFileInfo,
    'name' | 'appVersion' | 'presetVersion' | 'formatVersion'
  >,
>(
  files: readonly T[],
  currentName: string,
  appVersion: string,
  presetVersion: string,
): T[] {
  return files.filter(
    (file) =>
      !sameFileName(file.name, currentName) &&
      isOwnedFilterPathFile(file) &&
      compareVersions(file.appVersion!, appVersion) === -1 &&
      filterUpdateKind(file, appVersion, presetVersion) !== null,
  );
}

/** The `.bak` next to a filter holds a file FilterPath did not write. */
export class ForeignBackupError extends Error {
  readonly backup: string;

  constructor(backup: string) {
    super(
      `${backup} holds a filter FilterPath did not write. Move or rename it, then try again.`,
    );
    this.name = 'ForeignBackupError';
    this.backup = backup;
  }
}

async function readHeader(
  handle: FileSystemDirectoryHandle,
  name: string,
): Promise<(FilterHeader & { empty: boolean }) | null> {
  try {
    const file = await (await handle.getFileHandle(name)).getFile();
    const text = await file.text();
    return { ...parseFilterHeader(text), empty: text.trim() === '' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return null;
    }
    throw error;
  }
}

/** The header of a file in the folder, or null when it is not there. */
export async function readFilterHeader(
  handle: FileSystemDirectoryHandle,
  name: string,
): Promise<FilterHeader | null> {
  const header = await readHeader(handle, name);
  if (!header) return null;
  const { empty: _empty, ...rest } = header;
  return rest;
}

/** The whole text of a file in the folder, or null when it is not there. */
export async function readFilterText(
  handle: FileSystemDirectoryHandle,
  name: string,
): Promise<string | null> {
  try {
    const file = await (await handle.getFileHandle(name)).getFile();
    return await file.text();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return null;
    }
    throw error;
  }
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

/** The header lives in the leading comments; 4 KB is far more than it needs. */
const HEADER_BYTES = 4096;

async function readLeadingText(file: File): Promise<string> {
  // Reading only the start keeps the folder listing cheap for large filters.
  return typeof file.slice === 'function'
    ? file.slice(0, HEADER_BYTES).text()
    : file.text();
}

export async function listFilterFiles(
  handle: FileSystemDirectoryHandle,
): Promise<FilterFileInfo[]> {
  const files: FilterFileInfo[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue;
    if (!isFilterFileName(entry.name)) continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    const header = parseFilterHeader(await readLeadingText(file));
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
 * Removes one FilterPath file and its `.bak` copy. Throws, touching nothing,
 * when the file's header shows FilterPath did not write it; a `.bak` FilterPath
 * did not write is left in place.
 */
export async function removeFilterFile(
  handle: FileSystemDirectoryHandle,
  name: string,
): Promise<void> {
  const header = await readHeader(handle, name);
  if (!header || !isOwnedFilterPathFile({ name, appVersion: header.appVersion })) {
    throw new Error(`${name} was not written by FilterPath; not removed.`);
  }
  await handle.removeEntry(name);
  try {
    const backup = await readHeader(handle, backupName(name));
    if (backup?.appVersion) await handle.removeEntry(backupName(name));
  } catch {
    // The filter is gone; an unreadable backup is left where it is.
  }
}

/**
 * Writes a filter, keeping a single `<name>.bak` copy of the previous contents.
 * Never deletes or touches other files, and never overwrites a `.bak` that
 * FilterPath did not write (throws `ForeignBackupError` instead).
 */
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
    const previousBackup = await readHeader(handle, backupName(name));
    if (previousBackup && !previousBackup.appVersion && !previousBackup.empty) {
      throw new ForeignBackupError(backupName(name));
    }
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