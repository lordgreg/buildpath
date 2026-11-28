import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BUILDS } from '../meta/builds.ts';
import { searchSite, type SearchResult } from './search.ts';

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ResultRow({
  result,
  active,
  onSelect,
}: {
  result: SearchResult;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <a
      href={result.href}
      onClick={onSelect}
      className={
        active
          ? 'block rounded-lg border border-gold-400/40 bg-gold-400/10 px-3 py-2'
          : 'block rounded-lg border border-transparent px-3 py-2 hover:bg-ink-800/70'
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-zinc-100">{result.title}</span>
        <span className="text-[9px] uppercase tracking-wide text-zinc-600">
          {result.kind === 'build' ? 'Build' : 'Page'}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-zinc-500">{result.subtitle}</p>
      {result.chips && result.chips.length > 0 && (
        <p className="mt-1 text-[10px] text-zinc-600">{result.chips.join(' · ')}</p>
      )}
    </a>
  );
}

/** Global search: Ctrl/Cmd+K, title/skill/ascendancy/tag matches and site pages. */
export default function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchSite(query, BUILDS), [query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focus = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(focus);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const move = (delta: number) => {
    if (results.length === 0) return;
    setActive((index) => (index + delta + results.length) % results.length);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Search (Ctrl+K)"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-zinc-500 transition-colors hover:bg-ink-800/70 hover:text-zinc-200"
      >
        <SearchIcon />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-ink-700 bg-ink-900 px-1 py-0.5 text-[9px] text-zinc-600 sm:inline">
          Ctrl K
        </kbd>
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/80 px-4 pt-[12vh] backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              className="w-full max-w-2xl overflow-hidden rounded-xl border border-ink-600 bg-ink-900 shadow-2xl"
            >
              <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-2.5">
                <span className="text-zinc-500">
                  <SearchIcon />
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      move(1);
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      move(-1);
                    } else if (event.key === 'Enter' && results[active]) {
                      event.preventDefault();
                      window.location.href = results[active]!.href;
                    }
                  }}
                  placeholder="Search builds, ascendancies, pages…"
                  aria-label="Search"
                  className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={close}
                  className="rounded border border-ink-700 px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-200"
                >
                  Esc
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-zinc-500">
                    No builds or pages match “{query}”.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <div key={`${result.kind}-${result.id}`}>
                        {(index === 0 || results[index - 1]!.kind !== result.kind) && (
                          <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                            {result.kind === 'build' ? 'Builds' : 'Pages'}
                          </p>
                        )}
                        <ResultRow
                          result={result}
                          active={index === active}
                          onSelect={close}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 border-t border-ink-700 px-3 py-2 text-[10px] text-zinc-600">
                <span>↑↓ to move</span>
                <span>Enter to open</span>
                <span>Esc to close</span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
