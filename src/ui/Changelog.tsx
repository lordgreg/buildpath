import {
  commitUrl,
  compareUrl,
  releaseUrl,
  RELEASES,
} from '../changelog.ts';
import SiteHeader from './SiteHeader.tsx';

export default function Changelog() {
  return (
    <div className="min-h-dvh">
      <SiteHeader active="changelog" />
      <div className="mx-auto flex max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-400">
          Path of Exile 1
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Changelog
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-400">
          Releases and the commits behind them. Every filter records the version
          that generated it.
        </p>
      </header>

      <main className="mt-8 space-y-4">
        {RELEASES.map((release) => (
          <article
            key={release.version}
            className="rounded-xl border border-ink-700 bg-ink-800/50 p-5"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-lg font-semibold text-white">
                <span className="mr-2 text-gold-400">v{release.version}</span>
                {release.title}
              </h2>
              <time
                dateTime={release.date}
                className="text-xs text-zinc-500"
              >
                {release.date}
              </time>
            </header>

            <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-zinc-400">
              {release.notes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span aria-hidden="true" className="text-zinc-600">
                    -
                  </span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>

            {release.commits.length > 0 && (
              <div className="mt-4">
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
                  Commits
                </h3>
                <ul className="mt-2 space-y-1 text-xs">
                  {release.commits.map((commit) => (
                    <li key={commit.sha}>
                      <a
                        href={commitUrl(commit.sha)}
                        className="group flex flex-wrap items-baseline gap-2 text-zinc-400 hover:text-zinc-200"
                      >
                        <code className="rounded bg-ink-900 px-1.5 py-0.5 text-[11px] text-gold-400 group-hover:text-gold-300">
                          {commit.sha}
                        </code>
                        <span>{commit.message}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <footer className="mt-4 flex flex-wrap gap-4 text-xs">
              {release.compare && (
                <a
                  href={compareUrl(release.compare)}
                  className="text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
                >
                  Compare {release.compare}
                </a>
              )}
              <a
                href={releaseUrl(release.version)}
                className="text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
              >
                Release on GitHub
              </a>
            </footer>
          </article>
        ))}
      </main>

      <footer className="mt-10 border-t border-ink-700 pt-5 text-xs leading-relaxed text-zinc-500">
        <p>
          This product isn't affiliated with or endorsed by Grinding Gear Games
          in any way.
        </p>
      </footer>
      </div>
    </div>
  );
}