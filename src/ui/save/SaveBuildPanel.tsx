import { useState } from 'react';
import type { Rule } from '../../core/filter/types.ts';
import { copyText, downloadFilter } from '../download.ts';
import {
  deleteBuild,
  listBuilds,
  saveBuild,
  updateBuild,
  type SavedBuild,
} from '../presets/storage.ts';
import type { WizardState } from '../wizardState.ts';
import {
  defaultFolderPath,
  folderPathHint,
  LINUX_WRITE_COMMAND,
  PROTON_EXTRA_LIBRARY,
  PROTON_FILTER_PATH,
  PROTON_FIND_COMMAND,
  WINDOWS_FILTER_PATH,
  writeHint,
} from '../../sync/platform.ts';
import type { FiltersFolder } from './useFiltersFolder.ts';

function PathCode({ children }: { children: string }) {
  return (
    <code className="break-all rounded bg-ink-900 px-1 text-zinc-300">
      {children}
    </code>
  );
}

function WindowsGuidance() {
  return (
    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
      Windows: filters live in <PathCode>{WINDOWS_FILTER_PATH}</PathCode>. Pick
      that folder. If it does not exist yet, launch Path of Exile once and
      change the filter in-game to create it.
    </p>
  );
}

function LinuxGuidance() {
  return (
    <>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        Linux/Proton: <PathCode>steamapps</PathCode> lives inside a Steam
        library, not your home folder. The default is{' '}
        <PathCode>{PROTON_FILTER_PATH}</PathCode>. The game reads{' '}
        <PathCode>.filter</PathCode> files directly in this folder; there is no
        required <PathCode>filters</PathCode> subfolder.
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        If PoE is on another drive, use <PathCode>{PROTON_EXTRA_LIBRARY}</PathCode>.
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        Find it automatically, then pick the folder it prints.
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void copyText(PROTON_FIND_COMMAND)}
          className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
        >
          Copy find command
        </button>
        <button
          type="button"
          onClick={() => void copyText(PROTON_FILTER_PATH)}
          className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
        >
          Copy default Proton path
        </button>
      </div>
    </>
  );
}

export default function SaveBuildPanel({
  state,
  customRules,
  fileName,
  text,
  appVersion,
  dirty,
  name,
  autoName,
  activeBuildId,
  folder,
  onNameChange,
  onLoad,
  onSaved,
  onUpdated,
  onDeleted,
}: {
  state: WizardState;
  customRules?: Rule[];
  fileName: string;
  text: string;
  appVersion: string;
  dirty: boolean;
  name: string;
  autoName: string;
  activeBuildId: string | null;
  folder: FiltersFolder;
  onNameChange: (name: string) => void;
  onLoad: (build: SavedBuild) => void;
  onSaved: (build: SavedBuild) => void;
  onUpdated: (build: SavedBuild) => void;
  onDeleted: (id: string) => void;
}) {
  const [builds, setBuilds] = useState<SavedBuild[]>(() => listBuilds());
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pathNote, setPathNote] = useState<string>(() => {
    try {
      return localStorage.getItem('filterpath.folder-path.v1') ?? '';
    } catch {
      return '';
    }
  });

  const resolvedName = name.trim() || autoName;
  const platform = folder.platform;
  const showBothPaths = platform !== 'windows' && platform !== 'linux';
  const platformLabel =
    platform === 'windows'
      ? 'Windows'
      : platform === 'linux'
        ? 'Linux / Proton'
        : platform === 'mac'
          ? 'macOS'
          : 'OS unknown';
  const suggestedPath = defaultFolderPath(platform);
  const pathIssue = folderPathHint(pathNote);
  const pickerStep =
    platform === 'windows'
      ? 'paste the path into the picker\u2019s address bar'
      : platform === 'mac'
        ? 'press Cmd+Shift+G in the picker and paste the path'
        : 'press Ctrl+L in the picker and paste the path';

  const changePathNote = (value: string) => {
    setPathNote(value);
    try {
      localStorage.setItem('filterpath.folder-path.v1', value);
    } catch {
      // Ignore blocked storage.
    }
  };

  const writeToFolder = async (): Promise<string> => {
    if (!folder.handle) return '';
    const result = await folder.write(fileName, text, true);
    return result.message;
  };

  const save = async () => {
    setBusy(true);
    try {
      const build = saveBuild(resolvedName, state, customRules);
      setBuilds(listBuilds());
      onSaved(build);

      let message = 'Build saved locally.';
      if (folder.handle) {
        message = `${message} ${await writeToFolder()}`;
      } else if (folder.supported) {
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

  const updateActive = async () => {
    if (!activeBuildId) return;
    setBusy(true);
    try {
      const build = updateBuild(
        activeBuildId,
        resolvedName,
        state,
        customRules,
      );
      if (!build) {
        setStatus('That saved build no longer exists.');
        return;
      }
      setBuilds(listBuilds());
      onUpdated(build);
      let message = `Updated ${build.name}.`;
      if (folder.handle) {
        message = `${message} ${await writeToFolder()}`;
      }
      setStatus(message);
    } catch {
      setStatus('Could not update the saved build.');
    } finally {
      setBusy(false);
    }
  };

  const saveFile = async () => {
    if (!folder.handle) return;
    const message = await writeToFolder();
    setStatus(message);
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
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={`${autoName} (auto)`}
          className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-zinc-200"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || folder.busy}
          className="rounded bg-gold-400 px-3 py-1.5 text-xs font-semibold text-ink-950 disabled:opacity-40"
        >
          {busy ? 'Saving…' : activeBuildId ? 'Save as copy' : 'Save build'}
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        Saves the selection and any advanced rules locally. Leave the name empty
        to use <span className="text-zinc-400">{autoName}</span>.
      </p>
      <p className="mt-1 break-words text-[10px] text-zinc-600">
        Writes <span className="text-zinc-400">{fileName}</span>
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
                {build.id === activeBuildId && (
                  <span className="ml-2 rounded bg-gold-400/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-gold-300">
                    editing
                  </span>
                )}
              </span>
              <span className="text-[10px] text-zinc-600">
                {build.customRules?.length
                  ? `${build.customRules.length} custom rules`
                  : 'preset only'}
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
              {build.id === activeBuildId && (
                <button
                  type="button"
                  onClick={() => void updateActive()}
                  disabled={busy || folder.busy}
                  className="rounded border border-gold-400/50 px-2 py-0.5 text-gold-300 disabled:opacity-40"
                >
                  Update
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  deleteBuild(build.id);
                  setBuilds(listBuilds());
                  onDeleted(build.id);
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
          <span className="rounded-full border border-ink-600 px-2 py-0.5 text-[10px] text-zinc-600">
            Detected: {platformLabel}
          </span>
          <span className="rounded-full border border-ink-600 px-2 py-0.5 text-[10px] text-zinc-500">
            {!folder.supported
              ? 'download only'
              : !folder.handle
                ? 'not connected'
                : folder.permission !== 'granted'
                  ? `${folder.handle.name} - permission needed`
                  : folder.probe === 'read-only'
                    ? `${folder.handle.name} - read only`
                    : `${folder.handle.name} - read/write`}
          </span>
          {folder.supported && (
            <button
              type="button"
              onClick={() => void folder.choose()}
              disabled={folder.busy}
              className="rounded border border-ink-600 px-2 py-1 text-[11px] text-zinc-300 disabled:opacity-40"
            >
              {folder.handle ? 'Change folder' : 'Choose folder'}
            </button>
          )}
          {folder.supported && folder.handle && folder.permission !== 'granted' && (
            <button
              type="button"
              onClick={() => void folder.grant()}
              disabled={folder.busy}
              className="rounded border border-gold-400/50 px-2 py-1 text-[11px] text-gold-300 disabled:opacity-40"
            >
              Grant access
            </button>
          )}
          {folder.supported && folder.handle && (
            <>
              <button
                type="button"
                onClick={() => void folder.test()}
                disabled={folder.busy}
                className="rounded border border-ink-600 px-2 py-1 text-[11px] text-zinc-300 disabled:opacity-40"
              >
                Test access
              </button>
              <button
                type="button"
                onClick={() => void saveFile()}
                disabled={folder.busy}
                className="rounded border border-ink-600 px-2 py-1 text-[11px] text-zinc-300 disabled:opacity-40"
              >
                Write file now
              </button>
              <button
                type="button"
                onClick={() => void folder.forget()}
                className="rounded border border-ink-600 px-2 py-1 text-[11px] text-zinc-500"
              >
                Forget
              </button>
            </>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-ink-700 bg-ink-900/40 p-3">
          <label className="block text-[10px] uppercase tracking-wide text-zinc-500">
            Folder path (reference)
            <input
              value={pathNote}
              onChange={(event) => changePathNote(event.target.value)}
              placeholder={suggestedPath || 'Paste the filters folder path'}
              className="mt-1 block w-full rounded border border-ink-600 bg-ink-800 px-2 py-1.5 font-mono text-[11px] normal-case text-zinc-200"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyText(pathNote || suggestedPath)}
              className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
            >
              Copy path
            </button>
            {suggestedPath && (
              <button
                type="button"
                onClick={() => changePathNote(suggestedPath)}
                className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
              >
                Use suggested path
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            {folder.supported ? (
              <>
                Reference only: browsers cannot open a typed path. Use{' '}
                <span className="text-zinc-300">Choose folder</span> to grant
                access; then {pickerStep}, and open{' '}
                <span className="text-zinc-300">My Games/Path of Exile</span>{' '}
                inside it.
              </>
            ) : (
              <>
                Reference only: this browser cannot write to folders. Use{' '}
                <span className="text-zinc-300">Download .filter</span> and save
                it into this path.
              </>
            )}
          </p>
          {pathIssue && (
            <p className="mt-1 text-[10px] text-amber-300">{pathIssue}</p>
          )}
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Any folder works; pick the one the game reads. The browser only learns
          the folder name, not its full path.
        </p>

        {showBothPaths && (
          <>
            <WindowsGuidance />
            <LinuxGuidance />
          </>
        )}
        {platform === 'windows' && <WindowsGuidance />}
        {platform === 'linux' && <LinuxGuidance />}

        {showBothPaths && (
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            macOS/other: Path of Exile under Wine or CrossOver uses a prefix
            similar to the Proton path; choose that folder.
          </p>
        )}

        {!showBothPaths && (
          <details className="mt-2">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-zinc-600">
              Other platform
            </summary>
            {platform === 'windows' ? <LinuxGuidance /> : <WindowsGuidance />}
          </details>
        )}

        {folder.handle &&
          folder.permission === 'granted' &&
          folder.probe !== 'ok' && (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
              <p>{writeHint(platform)}</p>
              {platform !== 'windows' && (
                <button
                  type="button"
                  onClick={() => void copyText(LINUX_WRITE_COMMAND)}
                  className="mt-1 text-[10px] underline underline-offset-2"
                >
                  Copy Linux command
                </button>
              )}
            </div>
          )}

        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadFilter(fileName, text)}
            className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
          >
            Download .filter instead
          </button>
        </div>

        {folder.files.length > 0 && (
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
                {folder.files.map((file) => (
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

      {folder.status && (
        <p className="mt-3 text-xs text-zinc-400">{folder.status}</p>
      )}
      {status && <p className="mt-1 text-xs text-zinc-400">{status}</p>}
    </details>
  );
}