import { useCallback, useEffect, useState } from 'react';
import {
  ensurePermission,
  ForeignBackupError,
  isOwnedFilterPathFile,
  listFilterFiles,
  pickFiltersDirectory,
  probeFilterDirectory,
  readFilterHeader,
  readFilterText,
  removeFilterFile,
  sameFileName,
  supportsDirectoryPicker,
  writeFilter,
  type FilterFileInfo,
  type WriteProbe,
} from '../../sync/fileSystem.ts';
import {
  clearDirectoryHandle,
  clearWriteSnapshot,
  loadDirectoryHandle,
  loadWriteSnapshot,
  saveDirectoryHandle,
  saveWriteSnapshot,
} from '../../sync/handles.ts';
import { autoWriteVerified, snapshotFor, type AutoWriteResult } from '../../sync/snapshot.ts';
import { FILTER_FORMAT_VERSION } from '../../core/filter/version.ts';
import { PRESET_VERSION } from '../../meta/index.ts';
import type { BuildSelection } from '../../meta/types.ts';
import type { Rule } from '../../core/filter/types.ts';
import { APP_VERSION } from '../../version.ts';
import {
  detectPlatform,
  writeHint,
  type Platform,
} from '../../sync/platform.ts';

export interface WriteResult {
  ok: boolean;
  message: string;
  /** The user declined to overwrite an existing filter. */
  cancelled?: boolean;
}

/** The build a written file belongs to, stored for verified rewrites. */
export interface WriteSource {
  selection: BuildSelection;
  rules: Rule[];
}

export interface WriteOptions {
  /** Ask before overwriting a file FilterPath did not write. */
  confirmOverwrite?: boolean;
  /** Records what was written, enabling a later verified rewrite. */
  source?: WriteSource;
}

export interface AutoWriteInput {
  fileName: string;
  text: string;
  selection: BuildSelection;
  rules: Rule[];
  dirty: boolean;
  imported: boolean;
}

export interface FiltersFolder {
  supported: boolean;
  platform: Platform;
  handle: FileSystemDirectoryHandle | null;
  permission: PermissionState | 'unknown';
  files: FilterFileInfo[];
  status: string | null;
  probe: WriteProbe | null;
  busy: boolean;
  choose: () => Promise<void>;
  grant: () => Promise<void>;
  test: () => Promise<void>;
  write: (
    name: string,
    text: string,
    options?: WriteOptions,
  ) => Promise<WriteResult>;
  /** Rewrites an outdated filter only when the write is proven safe. */
  autoWrite: (input: AutoWriteInput) => Promise<AutoWriteResult>;
  /** Removes FilterPath-written files (and their own `.bak` copies). */
  remove: (names: string[]) => Promise<void>;
  forget: () => Promise<void>;
}

export function useFiltersFolder(): FiltersFolder {
  const [supported] = useState(supportsDirectoryPicker);
  const [platform] = useState<Platform>(detectPlatform);
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [permission, setPermission] = useState<PermissionState | 'unknown'>(
    'unknown',
  );
  const [files, setFiles] = useState<FilterFileInfo[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [probe, setProbe] = useState<WriteProbe | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshFiles = useCallback(
    async (directory: FileSystemDirectoryHandle) => {
      try {
        setFiles(await listFilterFiles(directory));
      } catch {
        setFiles([]);
        setStatus('The folder could not be read. Choose it again.');
      }
    },
    [],
  );

  const runProbe = useCallback(
    async (directory: FileSystemDirectoryHandle) => {
      setBusy(true);
      try {
        const result = await probeFilterDirectory(directory);
        setProbe(result.write);
        await refreshFiles(directory);
        if (!result.read) {
          setStatus('The folder could not be read. Choose it again.');
        } else if (result.write === 'ok') {
          setStatus(`Using ${directory.name}: read/write OK.`);
        } else {
          setStatus(`Using ${directory.name}: read only. ${writeHint(platform)}`);
        }
      } catch {
        setProbe('error');
        setStatus(`Could not test ${directory.name}. ${writeHint(platform)}`);
      } finally {
        setBusy(false);
      }
    },
    [platform, refreshFiles],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadDirectoryHandle();
      if (!stored || cancelled) return;
      setHandle(stored);
      const current = await ensurePermission(stored, false);
      if (cancelled) return;
      setPermission(current);
      if (current === 'granted') await runProbe(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [runProbe]);

  const choose = useCallback(async () => {
    if (!supported) return;
    try {
      const directory = await pickFiltersDirectory();
      const current = await ensurePermission(directory);
      setHandle(directory);
      setPermission(current);
      try {
        await saveDirectoryHandle(directory);
      } catch {
        setStatus('The folder works now, but could not be remembered.');
      }
      if (current === 'granted') {
        await runProbe(directory);
      } else {
        setProbe(null);
        setStatus('Folder selected, but write permission was not granted.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus('Could not open that folder.');
    }
  }, [runProbe, supported]);

  const grant = useCallback(async () => {
    if (!handle) return;
    setBusy(true);
    try {
      const current = await ensurePermission(handle);
      setPermission(current);
      if (current === 'granted') {
        await runProbe(handle);
      } else {
        setStatus('Write permission was not granted.');
      }
    } finally {
      setBusy(false);
    }
  }, [handle, runProbe]);

  const test = useCallback(async () => {
    if (!handle) return;
    if (permission !== 'granted') {
      await grant();
      return;
    }
    await runProbe(handle);
  }, [grant, handle, permission, runProbe]);

  const write = useCallback(
    async (
      name: string,
      text: string,
      options: WriteOptions = {},
    ): Promise<WriteResult> => {
      const confirmOverwrite = options.confirmOverwrite ?? true;
      if (!handle) {
        return { ok: false, message: 'No filters folder is connected.' };
      }
      setBusy(true);
      try {
        const current = await ensurePermission(handle);
        setPermission(current);
        if (current !== 'granted') {
          return {
            ok: false,
            message: `Folder write permission was not granted. ${writeHint(platform)}`,
          };
        }
        const currentFiles = await listFilterFiles(handle);
        setFiles(currentFiles);
        const existing = currentFiles.find((file) => sameFileName(file.name, name));
        // Files FilterPath wrote keep a `.bak` and are safe to overwrite, so
        // they never prompt. Any other file with the same name still asks.
        if (
          existing &&
          confirmOverwrite &&
          !isOwnedFilterPathFile(existing) &&
          !window.confirm(
            `Overwrite ${name}? The previous version is kept as ${name}.bak.`,
          )
        ) {
          return { ok: false, message: 'File not overwritten.', cancelled: true };
        }
        const { backup } = await writeFilter(handle, name, text);
        if (options.source) {
          await saveWriteSnapshot(
            snapshotFor({
              fileName: name,
              selection: options.source.selection,
              rules: options.source.rules,
              text,
              appVersion: APP_VERSION,
              presetVersion: PRESET_VERSION,
              formatVersion: FILTER_FORMAT_VERSION,
            }),
          );
        }
        setFiles(await listFilterFiles(handle));
        setProbe('ok');
        return {
          ok: true,
          message: backup
            ? `Filter written. Previous version copied to ${backup}.`
            : `Filter written to ${handle.name}.`,
        };
      } catch (error) {
        if (error instanceof ForeignBackupError) {
          return { ok: false, message: error.message };
        }
        return {
          ok: false,
          message: `Could not write the filter. ${writeHint(platform)}`,
        };
      } finally {
        setBusy(false);
      }
    },
    [handle, platform],
  );

  /**
   * Rewrites an outdated file without asking, but only when the stored
   * snapshot proves it is the same build and the file is still the one
   * FilterPath wrote. Anything else is left alone for the user to check.
   */
  const autoWrite = useCallback(
    async (input: AutoWriteInput): Promise<AutoWriteResult> => {
      if (!handle) return { ok: false, reason: 'missing-file' };

      const current = await ensurePermission(handle, false);
      setPermission(current);
      if (current !== 'granted') return { ok: false, reason: 'write-failed' };

      setBusy(true);
      try {
        const result = await autoWriteVerified(
          {
            readText: (name) => readFilterText(handle, name),
            readHeader: (name) => readFilterHeader(handle, name),
            write: async (name, text) => {
              await writeFilter(handle, name, text);
            },
          },
          { load: loadWriteSnapshot, save: saveWriteSnapshot },
          {
            ...input,
            appVersion: APP_VERSION,
            presetVersion: PRESET_VERSION,
            formatVersion: FILTER_FORMAT_VERSION,
          },
        );
        if (result.ok) {
          setFiles(await listFilterFiles(handle));
          setProbe('ok');
        }
        return result;
      } finally {
        setBusy(false);
      }
    },
    [handle],
  );

  const remove = useCallback(
    async (names: string[]) => {
      if (!handle || names.length === 0) return;
      setBusy(true);
      try {
        const current = await ensurePermission(handle);
        setPermission(current);
        if (current !== 'granted') {
          setStatus(`Folder write permission was not granted. ${writeHint(platform)}`);
          return;
        }
        // removeFilterFile re-checks each header, so a file FilterPath did not
        // write is skipped even if the listing was stale.
        let removed = 0;
        for (const name of names) {
          try {
            await removeFilterFile(handle, name);
            await clearWriteSnapshot(name);
            removed += 1;
          } catch {
            // Reported below; keep going with the rest.
          }
        }
        await refreshFiles(handle);
        setStatus(
          removed < names.length
            ? `Removed ${removed} of ${names.length}; the rest were not FilterPath filters or could not be removed.`
            : names.length === 1
              ? `Removed ${names[0]}.`
              : `Removed ${names.length} old filters.`,
        );
      } finally {
        setBusy(false);
      }
    },
    [handle, platform, refreshFiles],
  );

  const forget = useCallback(async () => {
    await clearDirectoryHandle();
    setHandle(null);
    setFiles([]);
    setPermission('unknown');
    setProbe(null);
    setStatus('Folder forgotten.');
  }, []);

  return {
    supported,
    platform,
    handle,
    permission,
    files,
    status,
    probe,
    busy,
    choose,
    grant,
    test,
    write,
    autoWrite,
    remove,
    forget,
  };
}