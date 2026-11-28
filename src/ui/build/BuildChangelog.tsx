import type { BuildChangelogEntry } from '../../core/builds/types.ts';
import CollapsibleSection from './CollapsibleSection.tsx';

/** The guide changelog: collapsed, and one line per change. */
export default function BuildChangelog({ changelog }: { changelog: BuildChangelogEntry[] }) {
  const newest = changelog.at(-1);
  return (
    <CollapsibleSection
      id="changelog"
      title="Changelog"
      storageKey="build-changelog-open"
      summary={
        <span className="text-[10px] text-zinc-600">
          {newest ? `${newest.date} - ${changelog.length} updates` : 'no updates'}
        </span>
      }
    >
      <ol className="mt-3 space-y-3">
        {[...changelog].reverse().map((entry) => (
          <li key={`${entry.season}-${entry.date}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-violet-400/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-violet-200">
                {entry.seasonName ?? entry.season}
              </span>
              <time dateTime={entry.date} className="text-[10px] text-zinc-500">
                {entry.date}
              </time>
            </div>
            <ul className="mt-1 space-y-0.5 text-xs leading-snug text-zinc-400">
              {entry.notes.map((note) => (
                <li key={note} className="flex gap-1.5">
                  <span aria-hidden className="text-zinc-600">
                    -
                  </span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </CollapsibleSection>
  );
}
