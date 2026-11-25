import { useEffect, useMemo, useState } from 'react';
import type {
  Build,
  BuildIndexEntry,
  GateResult,
} from '../core/builds/types.ts';
import { BUILD_VERSION, BUILDS } from '../meta/builds.ts';
import TreeThumbnail from './TreeThumbnail.tsx';
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
  const [treeStep, setTreeStep] = useState<string | null>(null);

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

      <section aria-labelledby="tree">
        <h2 id="tree" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Passive tree
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
          One plan per checkpoint, pruned from the endgame tree. Respec at act 10
          if you follow the map spec instead of the act spec.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {gates
            .filter(([, gate]) => gate.tree)
            .map(([checkpoint]) => (
              <button
                key={checkpoint}
                type="button"
                aria-pressed={(treeStep ?? checkpoint) === checkpoint}
                onClick={() => setTreeStep(checkpoint)}
                className={
                  (treeStep ?? checkpoint) === checkpoint
                    ? 'rounded border border-gold-400 bg-gold-400/10 px-2 py-1 text-[11px] text-gold-200'
                    : 'rounded border border-ink-700 bg-ink-800/40 px-2 py-1 text-[11px] text-zinc-400 hover:border-ink-500'
                }
              >
                {checkpoint}
              </button>
            ))}
        </div>
        {(() => {
          const entries = gates.filter(([, gate]) => gate.tree);
          if (entries.length === 0) return null;
          const [checkpoint, gate] = entries.find(
            ([key]) => key === (treeStep ?? entries[entries.length - 1]![0]),
          )!;
          return (
            <div className="mt-3">
              <TreeThumbnail tree={gate.tree!} label={checkpoint} />
            </div>
          );
        })()}
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
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                <th className="py-1 pr-4 font-normal">Gear slot</th>
                <th className="py-1 font-normal">Gems</th>
              </tr>
            </thead>
            <tbody>
              {build.skillGroups.map((group) => (
                <tr key={group.slot} className="border-t border-ink-700 align-top">
                  <td className="py-2 pr-4 whitespace-nowrap text-zinc-400">{group.slot}</td>
                  <td className="py-2">
                    {group.gems.map((gem, index) => (
                      <span key={gem}>
                        {index > 0 && <span className="text-zinc-600"> · </span>}
                        <span className={index === 0 ? 'text-white' : undefined}>{gem}</span>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-zinc-600">
          Levels per checkpoint are in the gate report above: the main gem and
          its supports scale together with the budget.
        </p>
      </section>

      {build.flasks && (
        <section aria-labelledby="flasks">
          <h2 id="flasks" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Flasks
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {(['leveling', 'maps', 'endgame'] as const).map((step) => {
              const flasks = build.flasks?.[step];
              if (!flasks) return null;
              return (
                <article key={step} className="rounded-lg border border-ink-700 bg-ink-900/40 p-3">
                  <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                    {step}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                    {flasks.map((flask) => (
                      <li key={flask.name}>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                          {flask.slot}
                        </span>{' '}
                        {flask.name}
                        {flask.note && (
                          <span className="block text-[11px] leading-tight text-zinc-500">
                            {flask.note}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      )}

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
