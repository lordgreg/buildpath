import { useState } from 'react';
import type { FilterFileInfo } from '../../sync/fileSystem.ts';
import { listBuilds, type SavedBuild } from '../presets/storage.ts';
import type { FiltersFolder } from './useFiltersFolder.ts';

/**
 * Shown on an empty builder when local filters already exist: saved builds in
 * this browser, or `.filter` files in a folder the user connected earlier.
 */
export default function ResumePanel({
  folder,
  onLoadBuild,
  onLoadFile,
}: {
  folder: FiltersFolder;
  onLoadBuild: (build: SavedBuild) => void;
  onLoadFile: (file: FilterFileInfo) => void;
}) {
  const [builds] = useState<SavedBuild[]>(() => listBuilds());
  const handle = folder.handle;
  const needsPermission =
    folder.supported && handle !== null && folder.permission !== 'granted';
  const loadableFiles =
    handle && folder.permission === 'granted'
      ? folder.files.filter((file) => file.selection)
      : [];

  if (builds.length === 0 && loadableFiles.length === 0 && !needsPermission) {
    return null;
  }

  const available = builds.length + loadableFiles.length;

  return (
    <details
      open
      className="rounded-xl border border-ink-700 bg-ink-800/40 p-4 text-sm"
    >
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 text-zinc-200">
        Resume a saved filter
        {available > 0 && (
          <span className="text-[11px] text-zinc-500">
            {available} available
          </span>
        )}
      </summary>

      {builds.length > 0 && (
        <div className="mt-3">
          <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
            Saved in this browser
          </h3>
          <ul className="mt-2 space-y-1.5">
            {builds.map((build) => (
              <li
                key={build.id}
                className="flex flex-wrap items-center gap-2 rounded border border-ink-700 bg-ink-900/50 px-2 py-1.5 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-zinc-300">
                  {build.name}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {(build.updatedAt ?? build.createdAt).slice(0, 10)}
                </span>
                <button
                  type="button"
                  onClick={() => onLoadBuild(build)}
                  className="rounded border border-ink-600 px-2 py-0.5 text-zinc-300 transition-colors hover:border-ink-500"
                >
                  Load
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(loadableFiles.length > 0 || needsPermission) && (
        <div className="mt-3">
          <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
            Filters folder
          </h3>
          {needsPermission ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="min-w-0 break-words">
                {handle?.name} — grant access to list the filters saved there.
              </span>
              <button
                type="button"
                onClick={() => void folder.grant()}
                disabled={folder.busy}
                className="rounded border border-gold-400/50 px-2 py-1 text-[11px] text-gold-300 disabled:opacity-40"
              >
                Grant access
              </button>
            </div>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {loadableFiles.map((file) => (
                <li
                  key={file.name}
                  className="flex flex-wrap items-center gap-2 rounded border border-ink-700 bg-ink-900/50 px-2 py-1.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-zinc-300">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onLoadFile(file)}
                    className="rounded border border-ink-600 px-2 py-0.5 text-zinc-300 transition-colors hover:border-ink-500"
                  >
                    Load
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </details>
  );
}
