import type { BuildIndexEntry, BuildStepSummary } from '../core/builds/types.ts';
import { BUILDS, BUILD_VERSION } from '../meta/builds.ts';
import { APP_VERSION } from '../version.ts';

/** Human labels for the machine-facing checkpoint ids. */
const STEP_LABEL: Record<string, string> = {
  'until-12': 'lv 12',
  'until-28': 'lv 28',
  'until-68': 'lv 68',
  'maps-early': 'early maps',
  'maps-red': 'red maps',
  pinnacle: 'pinnacle',
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
  return entry.steps?.find((candidate) => candidate.id === id);
}

function StepStrip({ steps }: { steps: BuildStepSummary[] }) {
  return (
    <ol className="mt-3 flex flex-wrap gap-1.5">
      {steps.map((step) => (
        <li key={step.id}>
          <span
            title={`${step.id}: ${step.pass ? 'passes' : 'fails'} at level ${step.level} · ${dps(step.dps)} DPS`}
            className={
              step.pass
                ? 'inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/5 px-1.5 py-0.5 text-[10px] text-emerald-300'
                : 'inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/5 px-1.5 py-0.5 text-[10px] text-rose-300'
            }
          >
            <span aria-hidden>{step.pass ? '●' : '○'}</span>
            {STEP_LABEL[step.id] ?? step.id}
          </span>
        </li>
      ))}
    </ol>
  );
}

function BuildCard({ build }: { build: BuildIndexEntry }) {
  const red = step(build, 'maps-red');
  const pinnacle = step(build, 'pinnacle');
  const href = `./build.html#build=${build.id}`;
  const filterHref = `./index.html#mode=build&build=${build.id}&phase=leveling&strictness=soft`;

  return (
    <article className="flex flex-col rounded-xl border border-ink-700 bg-ink-900/40 p-4">
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
        <span
          className={
            build.status === 'verified'
              ? 'shrink-0 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-emerald-300'
              : 'shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-300'
          }
        >
          {build.status}
        </span>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{build.summary}</p>

      {build.steps && <StepStrip steps={build.steps} />}

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

      <div className="mt-3 flex flex-wrap gap-2">
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
    </article>
  );
}

export default function BuildsPage() {
  const published = BUILDS.filter((build) => build.status !== 'rejected');
  const hidden = BUILDS.length - published.length;

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-5 py-10 sm:px-8">
      <header>
        <nav className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <a href="./index.html" className="underline underline-offset-2 hover:text-zinc-300">
            Filter
          </a>
          <span aria-hidden>·</span>
          <span className="text-zinc-300">Builds</span>
          <span aria-hidden>·</span>
          <a href="./demo.html" className="underline underline-offset-2 hover:text-zinc-300">
            Loot simulator
          </a>
          <span aria-hidden>·</span>
          <a href="./tests.html" className="underline underline-offset-2 hover:text-zinc-300">
            Behaviour audit
          </a>
          <span aria-hidden>·</span>
          <a href="./changelog.html" className="underline underline-offset-2 hover:text-zinc-300">
            Changelog
          </a>
        </nav>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
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
            {published.length} verified
          </span>
        </div>
      </header>

      {hidden > 0 && (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-200">
          {hidden} build{hidden === 1 ? '' : 's'} failed verification and{' '}
          {hidden === 1 ? 'is' : 'are'} not listed. The report still names every
          failed gate on the build&apos;s own page.
        </p>
      )}

      {published.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-400">
          No build has passed verification yet. Run <code>npm run builds:verify</code>.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {published.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      )}

      <section className="mt-8 rounded-xl border border-ink-700 bg-ink-900/30 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          What a listed build means
        </h2>
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-zinc-400">
          <li>
            The numbers are what the pinned Path of Building engine returned for
            the gear and gems shown, at the enemy level of that step.
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
  );
}
