import type { Rule } from '../core/filter/types.ts';
import type { BuildSelection } from '../meta/types.ts';
import type { FilterHeader } from './fileSystem.ts';

/**
 * What BuildPath wrote to one file, kept next to the directory handle. It
 * records the exact state the file came from, so an automatic rewrite can only
 * happen when the builder still holds that state and the file is untouched.
 */
export interface WriteSnapshot {
  fileName: string;
  selection: BuildSelection;
  /** The exact My rules the file was written with. */
  rules: Rule[];
  /** FNV-1a hash of the file text at write time. */
  textHash: string;
  appVersion: string;
  presetVersion: string;
  formatVersion: number;
}

/** FNV-1a, 32-bit. Enough to notice a file changed, not a security hash. */
export function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** JSON with sorted keys, so two equal values always stringify the same. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function selectionKey(selection: BuildSelection): string {
  return stableStringify(selection);
}

export function rulesKey(rules: readonly Rule[]): string {
  return stableStringify(rules);
}

export function snapshotFor(input: {
  fileName: string;
  selection: BuildSelection;
  rules: readonly Rule[];
  text: string;
  appVersion: string;
  presetVersion: string;
  formatVersion: number;
}): WriteSnapshot {
  return {
    fileName: input.fileName,
    selection: input.selection,
    rules: [...input.rules],
    textHash: hashText(input.text),
    appVersion: input.appVersion,
    presetVersion: input.presetVersion,
    formatVersion: input.formatVersion,
  };
}

/** The stored header still describes the file on disk. */
export function headerMatchesSnapshot(
  snapshot: WriteSnapshot,
  header: FilterHeader | null,
): boolean {
  if (!header) return false;
  return (
    header.appVersion === snapshot.appVersion &&
    header.presetVersion === snapshot.presetVersion &&
    header.formatVersion === snapshot.formatVersion
  );
}

/** The file was written from the build the builder still holds. */
export function snapshotMatchesState(
  snapshot: WriteSnapshot,
  selection: BuildSelection,
  rules: readonly Rule[],
): boolean {
  return (
    selectionKey(snapshot.selection) === selectionKey(selection) &&
    rulesKey(snapshot.rules) === rulesKey(rules)
  );
}

export type AutoWriteReason =
  | 'imported'
  | 'dirty'
  | 'no-snapshot'
  | 'state-changed'
  | 'missing-file'
  | 'file-changed'
  | 'header-mismatch'
  | 'write-failed';

export type AutoWriteResult =
  | { ok: true }
  | { ok: false; reason: AutoWriteReason };

export interface AutoWriteRequest {
  fileName: string;
  /** The text to write, generated from `selection` and `rules`. */
  text: string;
  selection: BuildSelection;
  rules: readonly Rule[];
  /** Unsaved edits in the builder, which may belong to another build. */
  dirty: boolean;
  /** The build arrived from a share code in this session. */
  imported: boolean;
  appVersion: string;
  presetVersion: string;
  formatVersion: number;
}

export interface SnapshotStore {
  load(fileName: string): Promise<WriteSnapshot | null>;
  save(snapshot: WriteSnapshot): Promise<void>;
}

export interface AutoWriteFiles {
  readText(name: string): Promise<string | null>;
  readHeader(name: string): Promise<FilterHeader | null>;
  write(name: string, text: string): Promise<void>;
}

/**
 * Rewrites an outdated filter, but only when the write is proven to be the same
 * build: the stored snapshot matches the live selection and My rules, the file
 * on disk is byte-for-byte what BuildPath wrote, and the new header reads back
 * as expected. Anything else leaves the file alone.
 */
export async function autoWriteVerified(
  files: AutoWriteFiles,
  store: SnapshotStore,
  request: AutoWriteRequest,
): Promise<AutoWriteResult> {
  if (request.imported) return { ok: false, reason: 'imported' };
  if (request.dirty) return { ok: false, reason: 'dirty' };

  const snapshot = await store.load(request.fileName);
  if (!snapshot) return { ok: false, reason: 'no-snapshot' };
  if (!snapshotMatchesState(snapshot, request.selection, request.rules)) {
    return { ok: false, reason: 'state-changed' };
  }

  const current = await files.readText(request.fileName);
  if (current === null) return { ok: false, reason: 'missing-file' };
  if (hashText(current) !== snapshot.textHash) {
    return { ok: false, reason: 'file-changed' };
  }
  if (!headerMatchesSnapshot(snapshot, await files.readHeader(request.fileName))) {
    return { ok: false, reason: 'header-mismatch' };
  }

  try {
    await files.write(request.fileName, request.text);
  } catch {
    return { ok: false, reason: 'write-failed' };
  }

  const header = await files.readHeader(request.fileName);
  if (
    !header ||
    header.appVersion !== request.appVersion ||
    header.presetVersion !== request.presetVersion ||
    header.formatVersion !== request.formatVersion
  ) {
    return { ok: false, reason: 'header-mismatch' };
  }

  await store.save(
    snapshotFor({
      fileName: request.fileName,
      selection: request.selection,
      rules: request.rules,
      text: request.text,
      appVersion: request.appVersion,
      presetVersion: request.presetVersion,
      formatVersion: request.formatVersion,
    }),
  );
  return { ok: true };
}
