import { useEffect, useMemo, useState } from 'react';
import type {
  Build,
  BuildIndexEntry,
  GateResult,
} from '../core/builds/types.ts';
import { BUILD_VERSION, BUILDS } from '../meta/builds.ts';
import { APP_VERSION } from '../version.ts';

const builds = import.meta.glob<{ default: Build }>(
  '../generated/builds/*.json',
  { eager: true },
);

function buildById(id: string): Build | undefined {
  const key = `../generated/builds/${id}.json`;
  return builds[key]?.default;
}

function currentId(): string {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const wanted = params.get('build');
  if (wanted && buildById(wanted)) return wanted;
  return BUILDS[0]?.id ?? '';
}

function statusLabel(status: BuildIndexEntry['status']): string {
  if (status === 'verified') return 'verified';
  if (status === 'rejected') return 'rejected';
  return 'draft';
}

function n(value: number): string {
  return value.toLocaleString('en-US');
}

function dps(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export default function BuildPage() {
  const [id, setId] = useState(currentId);

  useEffect(() => {
    const onHash = () => setId(currentId());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const build = useMemo(() => buildById(id), [id]);
  if (!build) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-zinc-400">
          No build has been compiled yet. Run <code>npm run builds:build</code>.
        </p>
      </main>
    );
  }

  const gates = Object.entries(build.gates ?? {}) as [string, GateResult][];
  const passed = gates.filter(([, gate]) => gate.pass).length;
  const pipeline = build.pipeline;
  const builderHash = `#mode=build&build=${build.id}&phase=leveling&strictness=soft`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-8 px-5 py-10 sm:px-8">
      <header>
        <nav className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <a href="./index.html" className="underline underline-offset-2 hover:text-zinc-300">
            Builder
          </a>
          <span aria-hidden>·</span>
          <a href="./demo.html" className="underline underline-offset-2 hover:text-zinc-300">
            Loot simulator
          </a>
          <span aria-hidden>·</span>
          <a href="./changelog.html" className="underline underline-offset-2 hover:text-zinc-300">
            Changelog
          </a>
        </nav>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              {build.class} / {build.mainSkill}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{build.name}</h1>
          </div>
          <span
            className={
              build.status === 'verified'
                ? 'rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300'
                : 'rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300'
            }
          >
            {statusLabel(build.status)} · {passed}/{gates.length} checkpoints
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{build.summary}</p>
      </header>

      {build.status !== 'verified' && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-200">
          This build does not pass its gates yet, so it is not published as a
          guide. The numbers below are what Path of Building measured; the
          failures are named rather than hidden.
        </p>
      )}

      <section aria-labelledby="gates">
        <h2 id="gates" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Gate report
        </h2>
        <p className="mt-1 text-[11px] text-zinc-600">
          {pipeline?.calibrated ? 'Calibrated gates' : 'Gates are not calibrated yet'} ·
          PoB {pipeline?.pobRef ?? 'unknown'} · tree {pipeline?.treeVersion ?? 'unknown'}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {gates.map(([checkpoint, gate]) => (
            <article
              key={checkpoint}
              className={
                gate.pass
                  ? 'rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3'
                  : 'rounded-lg border border-rose-500/30 bg-rose-500/5 p-3'
              }
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium text-white">{checkpoint}</h3>
                <span className="text-[11px] text-zinc-400">
                  level {gate.level} · {gate.budget}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                <div>
                  <dt className="inline text-zinc-500">damage </dt>
                  <dd className="inline">{dps(gate.metrics.dps)}</dd>
                </div>
                <div>
                  <dt className="inline text-zinc-500">life </dt>
                  <dd className="inline">{n(gate.metrics.life)}</dd>
                </div>
                <div>
                  <dt className="inline text-zinc-500">EHP </dt>
                  <dd className="inline">{n(gate.metrics.ehp)}</dd>
                </div>
                <div>
                  <dt className="inline text-zinc-500">max hit </dt>
                  <dd className="inline">{n(gate.metrics.maxHit)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="inline text-zinc-500">resists </dt>
                  <dd className="inline">
                    {gate.metrics.resists.map((value: number) => `${value}%`).join(' / ')}
                  </dd>
                </div>
              </dl>
              {gate.failures.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-[11px] text-rose-200">
                  {gate.failures.map((failure) => (
                    <li key={failure}>{failure}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="leveling">
        <h2 id="leveling" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Leveling
        </h2>
        <ul className="mt-3 space-y-2">
          {build.leveling.brackets.map((bracket) => (
            <li key={bracket.until} className="rounded-lg border border-ink-700 bg-ink-900/40 px-3 py-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                until level {bracket.until}
              </span>
              <p className="mt-1 text-sm text-zinc-300">{bracket.skills.join(' · ')}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          <a href={`./index.html${builderHash}`} className="text-gold-300 underline underline-offset-2">
            Open the leveling filter for this build
          </a>{' '}
          — it highlights this build&apos;s bases and hides the rest.
        </p>
      </section>

      <section aria-labelledby="ascendancy">
        <h2 id="ascendancy" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Ascendancy, bandit, pantheon
        </h2>
        <ol className="mt-3 space-y-1 text-sm text-zinc-300">
          {build.ascendancyOrder.map((point) => (
            <li key={point.node}>
              <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                lab {point.lab}
              </span>{' '}
              {point.node.replaceAll('-', ' ')}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-zinc-400">
          Bandit: <span className="text-zinc-200">{build.bandit}</span> · Pantheon:{' '}
          <span className="text-zinc-200">
            {build.pantheon.major} / {build.pantheon.minor}
          </span>
        </p>
        {build.pantheon.note && (
          <p className="mt-1 text-xs text-zinc-500">{build.pantheon.note}</p>
        )}
      </section>

      <section aria-labelledby="gems">
        <h2 id="gems" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Links
        </h2>
        {build.skillGroups.map((group) => (
          <p key={group.slot} className="mt-2 text-sm text-zinc-300">
            <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              {group.slot}:
            </span>{' '}
            {group.gems.join(' · ')}
          </p>
        ))}
      </section>

      <footer className="mt-auto border-t border-ink-700 pt-4 text-[11px] leading-relaxed text-zinc-600">
        <p>
          Provenance: seed <code>{build.seedHash}</code> · builds {BUILD_VERSION} · app{' '}
          {APP_VERSION}
          {build.pipeline?.checkedAt ? ` · checked ${build.pipeline.checkedAt.slice(0, 10)}` : ''}
        </p>
        <p className="mt-2">
          This product isn&apos;t affiliated with or endorsed by Grinding Gear Games
          in any way.
        </p>
      </footer>
    </div>
  );
}
