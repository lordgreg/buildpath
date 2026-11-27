import { APP_VERSION } from '../version.ts';

export type SitePage = 'filter' | 'builds' | 'build' | 'demo' | 'changelog' | 'tests';

const LINKS: { id: SitePage; href: string; label: string }[] = [
  { id: 'builds', href: './', label: 'Builds' },
  { id: 'filter', href: './filter.html', label: 'Filter' },
];

// The loot simulator and the behaviour audit are tools for the filter, not
// sibling destinations, so they live one level below it instead of in the top
// nav. They stay visible from the builder itself, which is where a reader
// needs them.
const FILTER_TOOLS: { id: SitePage; href: string; label: string }[] = [
  { id: 'filter', href: './filter.html', label: 'Builder' },
  { id: 'demo', href: './demo.html', label: 'Loot simulator' },
  { id: 'tests', href: './tests.html', label: 'Behaviour audit' },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

/**
 * One header for every page. It carries the product name, the page nav and the
 * build version, so the filter builder and the build guide read as one site
 * instead of two applications that happen to share a palette.
 *
 * The version badge is the changelog link: a release history is not a
 * destination people browse, it is the answer to "what changed in this
 * version".
 */
export default function SiteHeader({ active }: { active: SitePage }) {
  const showTools = active === 'filter' || active === 'demo' || active === 'tests';
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/80 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 sm:px-8">
        <a
          href="./"
          className="group flex items-baseline gap-3"
          aria-label="BuildPath home"
        >
          <span className="text-lg font-semibold tracking-tight text-white transition-colors group-hover:text-gold-200">
            BuildPath
          </span>
          <span className="hidden text-[9px] font-semibold uppercase tracking-[0.24em] text-gold-400/90 sm:inline">
            Path of Exile 1
          </span>
        </a>

        <nav
          aria-label="Site"
          className="order-3 flex w-full flex-wrap items-center gap-1 border-t border-ink-800/80 pt-2 text-xs sm:order-none sm:ml-auto sm:w-auto sm:border-0 sm:pt-0"
        >
          {LINKS.map((link) => {
            const current =
              link.id === active ||
              (active === 'build' && link.id === 'builds') ||
              // The loot simulator and the audit are sub-pages of Filter, so the
              // parent nav entry stays lit while one of them is open.
              ((active === 'demo' || active === 'tests') && link.id === 'filter');
            return (
              <a
                key={link.id}
                href={link.href}
                aria-current={current ? 'page' : undefined}
                className={
                  current
                    ? 'rounded-md border border-gold-400/40 bg-gold-400/10 px-2.5 py-1.5 font-medium text-gold-200'
                    : 'rounded-md px-2.5 py-1.5 text-zinc-500 transition-colors hover:bg-ink-800/70 hover:text-zinc-200'
                }
              >
                {link.label}
              </a>
            );
          })}
          <a
            href="https://github.com/lordgreg/buildpath"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="BuildPath on GitHub"
            title="BuildPath on GitHub"
            className="rounded-md px-2.5 py-1.5 text-zinc-500 transition-colors hover:bg-ink-800/70 hover:text-zinc-200"
          >
            <GitHubIcon />
          </a>
        </nav>

        <a
          href="./changelog.html"
          title="Changelog"
          aria-current={active === 'changelog' ? 'page' : undefined}
          className={
            active === 'changelog'
              ? 'ml-auto rounded border border-gold-400/40 bg-gold-400/10 px-2 py-0.5 text-[10px] text-gold-200 sm:ml-0'
              : 'ml-auto rounded border border-ink-700 px-2 py-0.5 text-[10px] text-zinc-600 transition-colors hover:border-ink-500 hover:text-zinc-300 sm:ml-0'
          }
        >
          v{APP_VERSION}
        </a>
      </div>

      {showTools && (
        <div className="border-t border-ink-800/80">
          <nav
            aria-label="Filter tools"
            className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-1 px-5 py-1.5 text-[11px] sm:px-8"
          >
            <span className="mr-2 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
              Filter tools
            </span>
            {FILTER_TOOLS.map((tool) => {
              const current = tool.id === active;
              return (
                <a
                  key={tool.id}
                  href={tool.href}
                  aria-current={current ? 'page' : undefined}
                  className={
                    current
                      ? 'rounded px-2 py-0.5 font-medium text-gold-200'
                      : 'rounded px-2 py-0.5 text-zinc-500 transition-colors hover:bg-ink-800/70 hover:text-zinc-200'
                  }
                >
                  {tool.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
