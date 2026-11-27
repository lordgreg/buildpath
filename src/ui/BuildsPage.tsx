import { useEffect, useState } from 'react';
import type {
  BuildChip,
  BuildIndexEntry,
  BuildStepSummary,
} from '../core/builds/types.ts';
import { BUILDS, BUILD_VERSION } from '../meta/builds.ts';
import { APP_VERSION } from '../version.ts';
import SiteHeader from './SiteHeader.tsx';
import { MedalBadge } from './RatingPanel.tsx';
import {
  CATALOGUE_SORTS,
  DEFAULT_CATALOGUE_STATE,
  catalogueOptions,
  directionLabel,
  filterBuilds,
  keepKnown,
  readCatalogueState,
  saveCatalogueState,
  sortBuilds,
  type CatalogueSort,
  type CatalogueState,
  type CatalogueView,
} from './buildsCatalogue.ts';

const CHIP_STYLE: Record<BuildChip['kind'], string> = {
  ssf: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  defence: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  playstyle: 'border-gold-400/40 bg-gold-400/10 text-gold-200',
  note: 'border-ink-600 bg-ink-900/70 text-zinc-400',
  season: 'border-violet-400/40 bg-violet-500/10 text-violet-200',
};

const SORT_LABEL: Record<CatalogueSort, string> = {
  tier: 'Tier grade',
  dps: 'Red map DPS',
  newest: 'Newest',
};

const SORT_TITLE: Record<CatalogueSort, string> = {
  tier: 'Order by the editorial medal, S+ at the top.',
  dps: 'Order by the damage measured at the red-map checkpoint.',
  newest: 'Order by the last Path of Building verification, most recent first.',
};

function dps(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function titleCase(slug: string): string {
  return slug
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function step(entry: BuildIndexEntry, id: string): BuildStepSummary | undefined {
  return entry.gateSteps?.find((candidate) => candidate.id === id);
}

function ChipRow({ chips, bare = false }: { chips: BuildChip[]; bare?: boolean }) {
  return (
    <ul className={`flex flex-wrap gap-1.5 ${bare ? '' : 'mt-3'}`}>
      {chips.map((chip) => (
        <li key={`${chip.kind}-${chip.label}`}>
          <span
            title={chip.title}
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${CHIP_STYLE[chip.kind]}`}
          >
            {chip.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: BuildIndexEntry['status'] }) {
  return (
    <span
      className={
        status === 'verified'
          ? 'rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-emerald-300'
          : status === 'stale'
            ? 'rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-rose-300'
            : 'rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-300'
      }
    >
      {status}
    </span>
  );
}

/** The generated key art, kept quiet enough that the text stays the subject. */
function Backdrop({ build }: { build: BuildIndexEntry }) {
  return (
    <>
      <img
        src={`./builds/${build.id}.webp`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center opacity-[0.22] transition-opacity duration-300 group-hover:opacity-[0.28]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-ink-950/85 via-ink-950/65 to-ink-950/45" />
    </>
  );
}

function BuildActions({ build }: { build: BuildIndexEntry }) {
  const href = `./build.html#build=${build.id}`;
  const filterHref = `./filter.html#mode=build&build=${build.id}&phase=leveling&strictness=soft`;
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={href}
        className="rounded border border-gold-400/60 bg-gold-400/10 px-3 py-1.5 text-xs text-gold-200 hover:border-gold-300"
      >
        Open the guide
      </a>
      <a
        href={filterHref}
        className="rounded border border-ink-600 px-3 py-1.5 text-xs text-zinc-300 hover:border-ink-400 hover:text-white"
      >
        Get the filter
      </a>
    </div>
  );
}

function DamagePair({ build, compact = false }: { build: BuildIndexEntry; compact?: boolean }) {
  const red = step(build, 'maps-red');
  const pinnacle = step(build, 'pinnacle');
  if (compact) {
    return (
      <p className="text-[11px] text-zinc-500">
        red maps <span className={red?.pass ? 'text-zinc-200' : 'text-rose-300'}>{red ? dps(red.dps) : '—'}</span>
        <span className="mx-1.5 text-zinc-700">·</span>
        pinnacle{' '}
        <span className={pinnacle?.pass ? 'text-zinc-200' : 'text-rose-300'}>
          {pinnacle ? dps(pinnacle.dps) : '—'}
        </span>
      </p>
    );
  }
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-700 pt-3 text-xs">
      <div>
        <dt className="text-[10px] uppercase tracking-wide text-zinc-600">red maps</dt>
        <dd className={red?.pass ? 'text-zinc-200' : 'text-rose-300'}>
          {red ? `${dps(red.dps)} DPS` : 'not measured'}
        </dd>
      </div>
      <div>
        <dt className="text-[10px] uppercase tracking-wide text-zinc-600">pinnacle</dt>
        <dd className={pinnacle?.pass ? 'text-zinc-200' : 'text-rose-300'}>
          {pinnacle ? `${dps(pinnacle.dps)} DPS` : 'not measured'}
        </dd>
      </div>
    </dl>
  );
}

function BuildCard({ build }: { build: BuildIndexEntry }) {
  const href = `./build.html#build=${build.id}`;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900/40 p-4">
      <Backdrop build={build} />
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {build.class} / {titleCase(build.ascendancyId)}
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-tight text-white">
              <a href={href} className="underline-offset-4 hover:underline">
                {build.name}
              </a>
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">{build.mainSkill}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {build.medal && <MedalBadge medal={build.medal} small />}
            <StatusBadge status={build.status} />
          </div>
        </div>

        <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{build.summary}</p>

        {build.chips && <ChipRow chips={build.chips} />}
        {build.gateSteps && (
          <p className="mt-2 text-[10px] text-zinc-600">
            {build.gateSteps.filter((entry) => entry.pass).length}/{build.gateSteps.length} checkpoints
            passed
          </p>
        )}

        <DamagePair build={build} />

        <div className="mt-3">
          <BuildActions build={build} />
        </div>
      </div>
    </article>
  );
}

function BuildRow({ build }: { build: BuildIndexEntry }) {
  const href = `./build.html#build=${build.id}`;
  return (
    <article className="group relative overflow-hidden rounded-lg border border-ink-700 bg-ink-900/40">
      <Backdrop build={build} />
      <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 sm:w-16 sm:shrink-0">
          {build.medal && <MedalBadge medal={build.medal} small />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {build.class} / {build.mainSkill}
          </p>
          <h2 className="mt-0.5 text-base font-semibold leading-tight text-white">
            <a href={href} className="underline-offset-4 hover:underline">
              {build.name}
            </a>
          </h2>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{build.summary}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {build.chips && <ChipRow chips={build.chips} bare />}
            <DamagePair build={build} compact />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <StatusBadge status={build.status} />
          <BuildActions build={build} />
        </div>
      </div>
    </article>
  );
}

function ViewIcon({ view }: { view: CatalogueView }) {
  if (view === 'cards') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="0.7" fill="currentColor" />
        <rect x="9" y="1.5" width="5.5" height="5.5" rx="0.7" fill="currentColor" />
        <rect x="1.5" y="9" width="5.5" height="5.5" rx="0.7" fill="currentColor" />
        <rect x="9" y="9" width="5.5" height="5.5" rx="0.7" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <rect x="1.5" y="2" width="13" height="2.4" rx="0.7" fill="currentColor" />
      <rect x="1.5" y="6.8" width="13" height="2.4" rx="0.7" fill="currentColor" />
      <rect x="1.5" y="11.6" width="13" height="2.4" rx="0.7" fill="currentColor" />
    </svg>
  );
}

function DirectionIcon({ direction }: { direction: CatalogueState['direction'] }) {
  return direction === 'desc' ? (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <path d="M8 2v10M4 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <path d="M8 14V4M4 8l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TOGGLE_ON = 'border-gold-400/70 bg-gold-400/10 text-gold-200';
const TOGGLE_OFF = 'border-ink-600 bg-ink-900/60 text-zinc-400 hover:border-ink-500 hover:text-zinc-200';

function FilterRow({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline">
      <span className="w-12 shrink-0 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${active ? TOGGLE_ON : TOGGLE_OFF}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BuildsPage() {
  // A build that has not passed every checkpoint is not in the catalogue (R10);
  // its own page still shows the named failures.
  const published = BUILDS.filter((build) => build.status === 'verified');
  const stale = BUILDS.filter((build) => build.status === 'stale');
  const hidden = BUILDS.length - published.length;
  const calibrated = published.filter((build) => build.calibrated).length;
  const families = [...new Set(published.map((build) => build.family))].sort();

  const [controls, setControls] = useState<CatalogueState>(readCatalogueState);
  useEffect(() => {
    saveCatalogueState(controls);
  }, [controls]);

  const options = catalogueOptions(published);
  const classes = keepKnown(controls.classes, options.classes);
  const tags = keepKnown(controls.tags, options.tags);
  const effective: CatalogueState = { ...controls, classes, tags };
  const visible = sortBuilds(
    filterBuilds(published, effective),
    effective.sort,
    effective.direction,
  );
  const toggle = (facet: 'classes' | 'tags', value: string) => {
    setControls((current) => {
      const values = keepKnown(current[facet], options[facet === 'classes' ? 'classes' : 'tags']);
      return {
        ...current,
        [facet]: values.includes(value)
          ? values.filter((entry) => entry !== value)
          : [...values, value],
      };
    });
  };

  const reset = () => {
    setControls({ ...DEFAULT_CATALOGUE_STATE, classes: [], tags: [] });
  };

  const clearFilters = () => {
    setControls((current) => ({ ...current, classes: [], tags: [] }));
  };

  return (
    <div className="min-h-dvh">
      <SiteHeader active="builds" />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Builds</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Every build here is measured by Path of Building at six points, from
              a level-12 character to pinnacle bosses, and the gear it was
              measured in is the gear the page shows. No unique is assumed. A
              build is listed because it passed, not because it is popular —
              there is no population data, so no page claims any.
            </p>
          </div>
          <span className="rounded border border-ink-600 px-2 py-1 text-[11px] text-zinc-500">
            {published.length} verified · {calibrated} calibrated
          </span>
        </div>
      </header>

      {hidden > 0 && (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-200">
          {stale.length > 0
            ? `${stale.length} build${stale.length === 1 ? '' : 's'} ${
                stale.length === 1 ? 'is' : 'are'
              } stale or waiting for a PoB patch and ${stale.length === 1 ? 'is' : 'are'} delisted.`
            : `${hidden} build${hidden === 1 ? '' : 's'} failed verification and ${
                hidden === 1 ? 'is' : 'are'
              } not listed.`}{' '}
          The build&apos;s own page still explains why.
        </p>
      )}

      {published.length > 0 && (
        <section
          aria-label="Catalogue controls"
          className="mt-6 rounded-xl border border-ink-700 bg-ink-900/40 p-3"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                Order
              </span>
              {CATALOGUE_SORTS.map((sort) => (
                <button
                  key={sort}
                  type="button"
                  title={SORT_TITLE[sort]}
                  aria-pressed={controls.sort === sort}
                  onClick={() => setControls((current) => ({ ...current, sort }))}
                  className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                    controls.sort === sort ? TOGGLE_ON : TOGGLE_OFF
                  }`}
                >
                  {SORT_LABEL[sort]}
                </button>
              ))}
              <button
                type="button"
                title={directionLabel(controls.sort, controls.direction)}
                aria-label={`Change direction; now: ${directionLabel(controls.sort, controls.direction)}`}
                onClick={() =>
                  setControls((current) => ({
                    ...current,
                    direction: current.direction === 'desc' ? 'asc' : 'desc',
                  }))
                }
                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] transition-colors ${TOGGLE_OFF}`}
              >
                <DirectionIcon direction={controls.direction} />
                <span className="hidden sm:inline">
                  {directionLabel(controls.sort, controls.direction)}
                </span>
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">
                {visible.length}/{published.length} shown
              </span>
              <div className="flex overflow-hidden rounded border border-ink-600" role="group" aria-label="Layout">
                {(['cards', 'list'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    title={view === 'cards' ? 'Card view' : 'List view'}
                    aria-label={view === 'cards' ? 'Card view' : 'List view'}
                    aria-pressed={controls.view === view}
                    onClick={() => setControls((current) => ({ ...current, view }))}
                    className={`inline-flex items-center p-1.5 transition-colors ${
                      controls.view === view
                        ? 'bg-gold-400/15 text-gold-200'
                        : 'text-zinc-500 hover:bg-ink-800/70 hover:text-zinc-200'
                    }`}
                  >
                    <ViewIcon view={view} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={reset}
                disabled={
                  controls.classes.length === 0 &&
                  controls.tags.length === 0 &&
                  controls.view === DEFAULT_CATALOGUE_STATE.view &&
                  controls.sort === DEFAULT_CATALOGUE_STATE.sort &&
                  controls.direction === DEFAULT_CATALOGUE_STATE.direction
                }
                className="rounded border border-ink-600 px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:border-ink-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-600 disabled:hover:text-zinc-400"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2 border-t border-ink-700/80 pt-3">
            <FilterRow
              label="Class"
              options={options.classes}
              selected={classes}
              onToggle={(value) => toggle('classes', value)}
            />
            <FilterRow
              label="Tags"
              options={options.tags}
              selected={tags}
              onToggle={(value) => toggle('tags', value)}
            />
          </div>
        </section>
      )}

      {published.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-400">
          No build has passed verification yet. Run <code>npm run builds:verify</code>.
        </p>
      ) : visible.length === 0 ? (
        <div className="mt-8 rounded-xl border border-ink-700 bg-ink-900/30 px-4 py-6 text-center">
          <p className="text-sm text-zinc-400">
            No published build matches that class and tag combination.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 rounded border border-gold-400/60 bg-gold-400/10 px-3 py-1.5 text-xs text-gold-200 hover:border-gold-300"
          >
            Clear filters
          </button>
        </div>
      ) : controls.view === 'cards' ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {visible.map((build) => (
            <BuildRow key={build.id} build={build} />
          ))}
        </div>
      )}

      {published.length > 0 && (
        <section className="mt-8 rounded-xl border border-ink-700 bg-ink-900/30 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Breadth
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            Every ascendancy below has a build that passes its published gates.
            Nothing is listed because it is popular: there is no population data,
            so breadth is evidence, not a rank.
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {families.map((family) => (
              <div key={family}>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                  {family}
                </dt>
                <dd className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {published
                    .filter((build) => build.family === family)
                    .map((build) => (
                      <a
                        key={build.id}
                        href={`./build.html#build=${build.id}`}
                        className="text-zinc-300 underline-offset-2 hover:text-white hover:underline"
                      >
                        {build.name}
                      </a>
                    ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-ink-700 bg-ink-900/30 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          What a listed build means
        </h2>
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-zinc-400">
          <li>
            The numbers are what the pinned Path of Building engine returned for
            the gear and gems shown, at the enemy level of that step. The
            thresholds themselves are calibrated against must-pass and must-fail
            references before a build is called calibrated.
          </li>
          <li>
            Each build publishes its PoB code; importing it gives you the same
            character the gate measured, not a hand-written approximation.
          </li>
          <li>
            The filters are generated from the same build, so the loot you are
            shown and the build you are following cannot drift apart.
          </li>
        </ul>
      </section>

      <footer className="mt-10 border-t border-ink-700 pt-4 text-[11px] leading-relaxed text-zinc-600">
        <p>
          builds {BUILD_VERSION} · app {APP_VERSION} · presets and build data are
          committed, so a link keeps meaning the same thing.
        </p>
        <p className="mt-2">
          This product isn&apos;t affiliated with or endorsed by Grinding Gear
          Games in any way.
        </p>
      </footer>
      </div>
    </div>
  );
}
