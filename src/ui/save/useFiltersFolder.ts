import { useCallback, useEffect, useState } from 'react';
import {
  ensurePermission,
  listFilterFiles,
  pickFiltersDirectory,
  probeFilterDirectory,
  removeFilterFile,
  supportsDirectoryPicker,
  writeFilter,
  type FilterFileInfo,
  type WriteProbe,
} from '../../sync/fileSystem.ts';
import {
  clearDirectoryHandle,
  loadDirectoryHandle,
  saveDirectoryHandle,
} from '../../sync/handles.ts';
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
    confirmOverwrite?: boolean,
  ) => Promise<WriteResult>;
  /** Removes FilterPath files (and their `.bak` copies) from the folder. */
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadDirectoryHandle();
      if (!stored || cancelled) return;
      setHandle(stored);
      const current = await ensurePermission(stored, false);
      if (cancelled) return;
      setPermission(current);
      if (current === 'granted') await refreshFiles(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshFiles]);

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
      confirmOverwrite = true,
    ): Promise<WriteResult> => {
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
        const exists = currentFiles.some((file) => file.name === name);
        if (
          exists &&
          confirmOverwrite &&
          !window.confirm(
            `Overwrite ${name}? The previous version is kept as ${name}.bak.`,
          )
        ) {
          return { ok: false, message: 'File not overwritten.', cancelled: true };
        }
        const { backup } = await writeFilter(handle, name, text);
        setFiles(await listFilterFiles(handle));
        setProbe('ok');
        return {
          ok: true,
          message: backup
            ? `Filter written. Previous version copied to ${backup}.`
            : `Filter written to ${handle.name}.`,
        };
      } catch {
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

  const remove = useCallback(
    async (names: string[]) => {
      if (!handle || names.length === 0) return;
      setBusy(true);
      try {
        for (const name of names) await removeFilterFile(handle, name);
        await refreshFiles(handle);
        setStatus(
          names.length === 1
            ? `Removed ${names[0]}.`
            : `Removed ${names.length} old filters.`,
        );
      } catch {
        setStatus('Could not remove every filter.');
      } finally {
        setBusy(false);
      }
    },
    [handle, refreshFiles],
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
    remove,
    forget,
  };
}