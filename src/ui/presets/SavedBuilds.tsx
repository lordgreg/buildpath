import { useState } from 'react';
import type { WizardState } from '../wizardState.ts';
import {
  deleteBuild,
  listBuilds,
  saveBuild,
  type SavedBuild,
} from './storage.ts';

export default function SavedBuilds({
  state,
  onLoad,
}: {
  state: WizardState;
  onLoad: (state: WizardState) => void;
}) {
  const [builds, setBuilds] = useState<SavedBuild[]>(() => listBuilds());
  const [name, setName] = useState('');

  const save = () => {
    if (!name.trim()) return;
    saveBuild(name, state);
    setBuilds(listBuilds());
    setName('');
  };

  const remove = (id: string) => {
    deleteBuild(id);
    setBuilds(listBuilds());
  };

  return (
    <details className="rounded-xl border border-ink-700 bg-ink-800/40 p-4">
      <summary className="cursor-pointer text-xs text-zinc-400">
        Saved builds ({builds.length})
      </summary>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="name this build"
          className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-zinc-200"
        />
        <button
          type="button"
          onClick={save}
          disabled={!name.trim()}
          className="rounded bg-gold-400 px-3 py-1.5 text-xs font-semibold text-ink-950 disabled:opacity-40"
        >
          Save
        </button>
      </div>
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
              <button
                type="button"
                onClick={() => onLoad(build.state)}
                className="rounded border border-ink-600 px-2 py-0.5 text-zinc-300 hover:border-ink-500"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => remove(build.id)}
                className="rounded border border-ink-600 px-2 py-0.5 text-red-300 hover:border-red-400/50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}