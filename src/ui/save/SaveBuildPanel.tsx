import { useEffect, useState } from 'react';
import type { Rule } from '../../core/filter/types.ts';
import { PRESET_VERSION } from '../../meta/index.ts';
import {
  filterUpdateKind,
  isOwnedFilterPathFile,
  staleFilterPathFiles,
  type FilterFileInfo,
} from '../../sync/fileSystem.ts';
import { copyText, downloadFilter } from '../download.ts';
import {
  deleteBuild,
  listBuilds,
  saveBuild,
  updateBuild,
  type SavedBuild,
} from '../presets/storage.ts';
import type { WizardState } from '../wizardState.ts';
import { asSelected } from '../wizardState.ts';
import {
  BRAVE_FILE_ACCESS_FLAG,
  browserKind,
  LINUX_WRITE_COMMAND,
  writeHint,
} from '../../sync/platform.ts';
import type { FiltersFolder, WriteResult } from './useFiltersFolder.ts';

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
  onLoadFile,
  onSaved,
  onUpdated,
  onWritten,
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
  /** Loads a FilterPath filter from the connected folder into the builder. */
  onLoadFile: (file: FilterFileInfo) => void;
  onSaved: (build: SavedBuild) => void;
  onUpdated: (build: SavedBuild) => void;
  /** Called after the .filter file is written to the folder. */
  onWritten: () => void;
  onDeleted: (id: string) => void;
}) {
  const [builds, setBuilds] = useState<SavedBuild[]>(() => listBuilds());
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The name feeds the generated text and file name, so a local draft keeps the
  // whole filter from regenerating on every keystroke.
  const [nameDraft, setNameDraft] = useState(name);
  const browser = browserKind();

  useEffect(() => {
    setNameDraft(name);
  }, [name]);

  const commitName = () => {
    if (nameDraft !== name) onNameChange(nameDraft);
  };

  const resolvedName = name.trim() || autoName;
  const platform = folder.platform;
  const platformLabel =
    platform === 'windows'
      ? 'Windows'
      : platform === 'linux'
        ? 'Linux / Proton'
        : platform === 'mac'
          ? 'macOS'
          : 'OS unknown';
  const staleFiles = staleFilterPathFiles(
    folder.files,
    fileName,
    appVersion,
    PRESET_VERSION,
  );

  const writeToFolder = async (): Promise<WriteResult> => {
    if (!folder.handle) return { ok: false, message: '' };
    return folder.write(fileName, text, {
      confirmOverwrite: true,
      source: { selection: asSelected(state), rules: customRules ?? [] },
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      const build = saveBuild(resolvedName, state, customRules);
      setBuilds(listBuilds());
      onSaved(build);

      let message = 'Build saved locally.';
      if (folder.handle) {
        const result = await writeToFolder();
        message = `${message} ${result.message}`;
        if (result.ok) onWritten();
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
        const result = await writeToFolder();
        message = `${message} ${result.message}`;
        if (result.ok) onWritten();
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
    const result = await writeToFolder();
    setStatus(result.message);
    if (result.ok) onWritten();
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
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitName();
              event.currentTarget.blur();
            }
          }}
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

        {!folder.supported && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
            {browser === 'brave' && (
              <>
                <p>
                  Brave disables folder writing by default. Open{' '}
                  <code className="break-all rounded bg-ink-900 px-1">
                    {BRAVE_FILE_ACCESS_FLAG}
                  </code>
                  , set <strong>File System Access API</strong> to{' '}
                  <strong>Enabled</strong>, relaunch Brave, then reload this
                  page.
                </p>
                <div className="mt-1 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void copyText(BRAVE_FILE_ACCESS_FLAG)}
                    className="text-[10px] underline underline-offset-2"
                  >
                    Copy brave:// flag
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="text-[10px] underline underline-offset-2"
                  >
                    Reload after enabling
                  </button>
                </div>
              </>
            )}
            {browser === 'chromium' && (
              <p>
                This Chromium browser should support folder writing, but the API
                is missing. Check that the site is on HTTPS and that an
                extension or enterprise policy is not blocking it. Chrome,
                Chromium and Edge support folder writing by default.
              </p>
            )}
            {browser === 'firefox' && (
              <p>
                Firefox does not implement the File System Access API. Use
                Chrome, Chromium or Edge for folder writing, or use the download
                flow.
              </p>
            )}
            {browser === 'safari' && (
              <p>
                Safari and other WebKit browsers do not implement the File
                System Access API. Use Chrome, Chromium or Edge for folder
                writing, or use the download flow.
              </p>
            )}
            {browser === 'unknown' && (
              <>
                <p>
                  This browser cannot write to folders. Brave needs{' '}
                  <code className="break-all rounded bg-ink-900 px-1">
                    {BRAVE_FILE_ACCESS_FLAG}
                  </code>
                  ; Chrome, Chromium and Edge support it by default; Firefox
                  and Safari do not.
                </p>
                <div className="mt-1 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void copyText(BRAVE_FILE_ACCESS_FLAG)}
                    className="text-[10px] underline underline-offset-2"
                  >
                    Copy brave:// flag
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="text-[10px] underline underline-offset-2"
                  >
                    Reload after enabling
                  </button>
                </div>
              </>
            )}
          </div>
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
          {staleFiles.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Remove ${staleFiles.length} outdated FilterPath filter${
                      staleFiles.length === 1 ? '' : 's'
                    }? Their FilterPath .bak copies go too.\n\n${staleFiles
                      .map((file) => file.name)
                      .join('\n')}`,
                  )
                ) {
                  void folder.remove(staleFiles.map((file) => file.name));
                }
              }}
              disabled={folder.busy}
              className="text-[10px] text-red-300 underline underline-offset-2 hover:text-red-200 disabled:opacity-40"
            >
              Remove {staleFiles.length} outdated
            </button>
          )}
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
                {folder.files.map((file) => {
                  const updateKind = filterUpdateKind(
                    file,
                    appVersion,
                    PRESET_VERSION,
                  );
                  return (
                    <tr key={file.name} className="border-t border-ink-800">
                      <td className="py-1 pr-3 text-zinc-300">{file.name}</td>
                      <td className="py-1 pr-3">{file.appVersion ?? '—'}</td>
                      <td className="py-1">
                        {file.selection && file.name !== fileName && (
                          <button
                            type="button"
                            onClick={() => onLoadFile(file)}
                            className="mr-2 rounded border border-ink-600 px-1.5 py-0.5 text-zinc-300 transition-colors hover:border-ink-500"
                          >
                            Load
                          </button>
                        )}
                        {isOwnedFilterPathFile(file) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove ${file.name} and its FilterPath .bak copy from ${folder.handle?.name}?`,
                                )
                              ) {
                                void folder.remove([file.name]);
                              }
                            }}
                            disabled={folder.busy}
                            className="mr-2 rounded border border-ink-600 px-1.5 py-0.5 text-red-300 transition-colors hover:border-ink-500 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        )}
                        {file.name === fileName && (
                          <span className="mr-2 rounded bg-gold-400/15 px-1.5 py-0.5 text-gold-300">
                            current
                          </span>
                        )}
                        {updateKind === 'version' && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">
                            stale
                          </span>
                        )}
                        {updateKind === 'presets' && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">
                            old presets
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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