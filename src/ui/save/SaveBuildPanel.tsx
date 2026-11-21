import { useEffect, useState } from 'react';
import type { SavedRules } from '../../core/rules/delta.ts';
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
import { copyText, downloadFilter } from '../download.ts';
import {
  deleteBuild,
  listBuilds,
  saveBuild,
  type SavedBuild,
} from '../presets/storage.ts';
import type { WizardState } from '../wizardState.ts';

const WINDOWS_PATH = 'Documents\\My Games\\Path of Exile';
const PROTON_DEFAULT_PATH =
  '~/.local/share/Steam/steamapps/compatdata/238960/pfx/drive_c/users/steamuser/Documents/My Games/Path of Exile';
const PROTON_FIND_COMMAND =
  'find ~ /mnt /media -path "*compatdata/238960*" -type d -name "Path of Exile" 2>/dev/null';

export default function SaveBuildPanel({
  state,
  rules,
  fileName,
  text,
  appVersion,
  dirty,
  onLoad,
  onSaved,
}: {
  state: WizardState;
  rules?: SavedRules;
  fileName: string;
  text: string;
  appVersion: string;
  dirty: boolean;
  onLoad: (build: SavedBuild) => void;
  onSaved: () => void;
}) {
  const [builds, setBuilds] = useState<SavedBuild[]>(() => listBuilds());
  const [name, setName] = useState('');
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
          setStatus('Could not read the folder. Choose it again.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const writeCurrentFile = async (
    directory: FileSystemDirectoryHandle,
  ): Promise<{ message: string; wrote: boolean }> => {
    const current = await ensurePermission(directory);
    setPermission(current);
    if (current !== 'granted') {
      return { message: 'Folder write permission was not granted.', wrote: false };
    }
    const currentFiles = await listFilterFiles(directory);
    setFiles(currentFiles);
    const exists = currentFiles.some((file) => file.name === fileName);
    if (
      exists &&
      !window.confirm(
        `Overwrite ${fileName}? The previous version is kept as ${fileName}.bak.`,
      )
    ) {
      return { message: 'File not overwritten.', wrote: false };
    }
    const { backup } = await writeFilter(directory, fileName, text);
    setFiles(await listFilterFiles(directory));
    return {
      message: backup
        ? `Filter written. Previous version copied to ${backup}.`
        : 'Filter written to the folder.',
      wrote: true,
    };
  };

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      saveBuild(name, state, rules);
      setBuilds(listBuilds());
      setName('');
      onSaved();

      let message = 'Build saved locally.';
      if (supported && handle) {
        const result = await writeCurrentFile(handle);
        message = `${message} ${result.message}`;
      } else if (supported) {
        message += ' Choose a filters folder below to also write the .filter file.';
      } else {
        message += ' This browser cannot write the folder; use Download.';
      }
      setStatus(message);
    } catch {
      setStatus('Could not save the build or write the filter.');
    } finally {
      setBusy(false);
    }
  };

  const chooseFolder = async () => {
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

  const saveFile = async () => {
    if (!handle) return;
    setBusy(true);
    try {
      const result = await writeCurrentFile(handle);
      setStatus(result.message);
    } catch {
      setStatus('Could not write the filter. Check folder permissions.');
    } finally {
      setBusy(false);
    }
  };

  const forgetFolder = async () => {
    await clearDirectoryHandle();
    setHandle(null);
    setFiles([]);
    setPermission('unknown');
    setStatus('Folder forgotten.');
  };

  return (
    <details
      open
      className="rounded-xl border border-ink-700 bg-ink-800/40 p-4 text-sm"
    >
      <summary className="flex cursor-pointer items-center gap-2 text-zinc-200">
        Save build and filters folder
        {dirty && (
          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
            unsaved changes
          </span>
        )}
      </summary>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="build name"
          className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-zinc-200"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={!name.trim() || busy}
          className="rounded bg-gold-400 px-3 py-1.5 text-xs font-semibold text-ink-950 disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Save build'}
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        Saves the selection and any advanced rules locally. If a filters folder
        is connected, the .filter file is written too.
      </p>

      {builds.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {builds.map((build) => (
            <li
              key={build.id}
              className="flex flex-wrap items-center gap-2 rounded border border-ink-700 bg-ink-900/50 px-2 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1 truncate text-zinc-300">
                {build.name}
              </span>
              <span className="text-[10px] text-zinc-600">
                {build.rules ? 'custom rules' : 'preset'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onLoad(build);
                  setStatus(`Loaded ${build.name}.`);
                }}
                className="rounded border border-ink-600 px-2 py-0.5 text-zinc-300"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBuild(build.id);
                  setBuilds(listBuilds());
                }}
                className="rounded border border-ink-600 px-2 py-0.5 text-red-300"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-ink-700 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
            Filters folder
          </h3>
          <span className="rounded-full border border-ink-600 px-2 py-0.5 text-[10px] text-zinc-500">
            {!supported
              ? 'download only'
              : !handle
                ? 'not connected'
                : permission === 'granted'
                  ? `${handle.name} - write access`
                  : `${handle.name} - permission needed`}
          </span>
          {supported && (
            <button
              type="button"
              onClick={() => void chooseFolder()}
              className="rounded border border-ink-600 px-2 py-1 text-[11px] text-zinc-300"
            >
              {handle ? 'Change folder' : 'Choose folder'}
            </button>
          )}
          {supported && handle && (
            <>
              <button
                type="button"
                onClick={() => void saveFile()}
                className="rounded border border-ink-600 px-2 py-1 text-[11px] text-zinc-300"
              >
                Write file now
              </button>
              <button
                type="button"
                onClick={() => void forgetFolder()}
                className="rounded border border-ink-600 px-2 py-1 text-[11px] text-zinc-500"
              >
                Forget
              </button>
            </>
          )}
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Any folder works; pick the one the game reads. Windows:{' '}
          <code className="rounded bg-ink-900 px-1 text-zinc-300">
            {WINDOWS_PATH}
          </code>
          .
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          Linux/Proton: <code className="rounded bg-ink-900 px-1 text-zinc-300">steamapps</code>{' '}
          lives inside a Steam library, not your home folder. The default is{' '}
          <code className="break-all rounded bg-ink-900 px-1 text-zinc-300">
            {PROTON_DEFAULT_PATH}
          </code>
          . If PoE is installed on another drive, use that library root instead,
          e.g. <code className="break-all rounded bg-ink-900 px-1 text-zinc-300">/path/to/SteamLibrary/steamapps/compatdata/238960/pfx/drive_c/users/steamuser/Documents/My Games/Path of Exile</code>.
          The game reads `.filter` files directly in this folder; there is no
          required `filters` subfolder.
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          Find it automatically: run this in a terminal, then pick the folder it
          prints.
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyText(PROTON_FIND_COMMAND)}
            className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
          >
            Copy find command
          </button>
          <button
            type="button"
            onClick={() => void copyText(PROTON_DEFAULT_PATH)}
            className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
          >
            Copy default Proton path
          </button>
          <button
            type="button"
            onClick={() => downloadFilter(fileName, text)}
            className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
          >
            Download .filter instead
          </button>
        </div>

        {files.length > 0 && (
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
        )}
      </div>

      {status && <p className="mt-3 text-xs text-zinc-400">{status}</p>}
    </details>
  );
}