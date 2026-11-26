import { APP_VERSION } from '../version.ts';

export type SitePage = 'filter' | 'builds' | 'build' | 'demo' | 'changelog' | 'tests';

const LINKS: { id: SitePage; href: string; label: string }[] = [
  { id: 'builds', href: './', label: 'Builds' },
  { id: 'filter', href: './filter.html', label: 'Filter' },
  { id: 'demo', href: './demo.html', label: 'Loot simulator' },
  { id: 'changelog', href: './changelog.html', label: 'Changelog' },
  { id: 'tests', href: './tests.html', label: 'Audit' },
];

/**
 * One header for every page. It carries the product name, the page nav and the
 * build version, so the filter builder and the build guide read as one site
 * instead of two applications that happen to share a palette.
 */
export default function SiteHeader({ active }: { active: SitePage }) {
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
            const current = link.id === active || (active === 'build' && link.id === 'builds');
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
            className="rounded-md px-2.5 py-1.5 text-zinc-500 transition-colors hover:bg-ink-800/70 hover:text-zinc-200"
          >
            GitHub
          </a>
        </nav>

        <span className="ml-auto rounded border border-ink-700 px-2 py-0.5 text-[10px] text-zinc-600 sm:ml-0">
          v{APP_VERSION}
        </span>
      </div>
    </header>
  );
}
