import { useEffect, useState } from 'react';
import {
  ensurePermission,
  listFilterFiles,
  pickFiltersDirectory,
  supportsDirectoryPicker,
  writeFilter,
  type FilterFileInfo,
} from '../../sync/fileSystem.ts';
import {
  clearDirectoryHandle,
  loadDirectoryHandle,
  saveDirectoryHandle,
} from '../../sync/handles.ts';

export default function FolderSync({
  fileName,
  text,
  appVersion,
}: {
  fileName: string;
  text: string;
  appVersion: string;
}) {
  const [supported] = useState(supportsDirectoryPicker);
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [permission, setPermission] = useState<PermissionState | 'unknown'>(
    'unknown',
  );
  const [files, setFiles] = useState<FilterFileInfo[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadDirectoryHandle();
      if (!stored || cancelled) return;
      setHandle(stored);
      const current = await ensurePermission(stored, false);
      if (cancelled) return;
      setPermission(current);
      if (current === 'granted') {
        try {
          setFiles(await listFilterFiles(stored));
        } catch {
          setStatus('Could not read the folder. Pick it again.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = async () => {
    try {
      const directory = await pickFiltersDirectory();
      const current = await ensurePermission(directory);
      await saveDirectoryHandle(directory);
      setHandle(directory);
      setPermission(current);
      setStatus(`Using ${directory.name}.`);
      setFiles(current === 'granted' ? await listFilterFiles(directory) : []);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus('Could not open that folder.');
    }
  };

  const save = async () => {
    if (!handle) return;
    setBusy(true);
    try {
      const current = await ensurePermission(handle);
      setPermission(current);
      if (current !== 'granted') {
        setStatus('Write permission was not granted.');
        return;
      }
      const exists = files.some((file) => file.name === fileName);
      if (
        exists &&
        !window.confirm(
          `Overwrite ${fileName}? The previous version is kept as ${fileName}.bak.`,
        )
      ) {
        return;
      }
      const { backup } = await writeFilter(handle, fileName, text);
      setStatus(
        backup
          ? `Saved ${fileName}. Previous version copied to ${backup}.`
          : `Saved ${fileName}.`,
      );
      setFiles(await listFilterFiles(handle));
    } catch {
      setStatus('Could not write the filter. Check folder permissions.');
    } finally {
      setBusy(false);
    }
  };

  const forget = async () => {
    await clearDirectoryHandle();
    setHandle(null);
    setFiles([]);
    setPermission('unknown');
    setStatus('Folder forgotten.');
  };

  return (
    <details className="rounded-xl border border-ink-700 bg-ink-800/40 p-4 text-sm">
      <summary className="cursor-pointer text-zinc-200">
        Save directly to your filters folder
      </summary>

      {!supported && (
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Directory sync needs Chrome or Edge. Use the Download button on other
          browsers, then drop the file into{' '}
          <code className="rounded bg-ink-900 px-1 py-0.5 text-zinc-300">
            Documents/My Games/Path of Exile
          </code>
          .
        </p>
      )}

      {supported && !handle && (
        <>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Pick{' '}
            <code className="rounded bg-ink-900 px-1 py-0.5 text-zinc-300">
              Documents/My Games/Path of Exile
            </code>{' '}
            once. On Linux/Proton it is inside the game's compatdata prefix. The
            handle is remembered in this browser.
          </p>
          <button
            type="button"
            onClick={() => void choose()}
            className="mt-3 rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-zinc-200 hover:border-ink-500"
          >
            Choose filters folder
          </button>
        </>
      )}

      {supported && handle && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-300">{handle.name}</span>
            <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-500">
              {permission === 'granted' ? 'write access' : 'permission needed'}
            </span>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="rounded-lg bg-gold-400 px-3 py-1.5 text-xs font-semibold text-ink-950 disabled:opacity-40"
            >
              {busy ? 'Saving…' : `Save ${fileName}`}
            </button>
            <button
              type="button"
              onClick={() => void choose()}
              className="rounded border border-ink-600 px-2 py-1 text-zinc-300"
            >
              Change folder
            </button>
            <button
              type="button"
              onClick={() => void forget()}
              className="rounded border border-ink-600 px-2 py-1 text-zinc-400"
            >
              Forget
            </button>
          </div>

          {files.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[11px] text-zinc-400">
                <thead className="text-[10px] uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="py-1 pr-3">File</th>
                    <th className="py-1 pr-3">Version</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.name} className="border-t border-ink-800">
                      <td className="py-1 pr-3 text-zinc-300">{file.name}</td>
                      <td className="py-1 pr-3">{file.appVersion ?? '—'}</td>
                      <td className="py-1">
                        {file.name === fileName && (
                          <span className="mr-2 rounded bg-gold-400/15 px-1.5 py-0.5 text-gold-300">
                            current
                          </span>
                        )}
                        {file.appVersion && file.appVersion !== appVersion && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">
                            stale
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-xs text-zinc-600">
              No .filter files found in this folder yet.
            </p>
          )}
        </>
      )}

      {status && <p className="mt-3 text-xs text-zinc-400">{status}</p>}
    </details>
  );
}