import { useEffect, useMemo, useState } from 'react';
import type {
  Build,
  BuildIndexEntry,
  GateResult,
  GemAvailability,
} from '../core/builds/types.ts';
import { BUILD_VERSION, BUILDS } from '../meta/builds.ts';
import { GUIDE_SECTIONS, type GuideSection } from '../core/builds/guide.ts';
import { levelingPlan } from '../core/builds/leveling.ts';
import { BANDITS } from '../meta/pantheon.ts';
import { getPobLink } from '../meta/pob-links.ts';
import AscendancyPanel from './AscendancyPanel.tsx';
import InventoryPanel from './InventoryPanel.tsx';
import PantheonPanel from './PantheonPanel.tsx';
import RatingPanel from './RatingPanel.tsx';
import SiteHeader from './SiteHeader.tsx';
import TreeThumbnail from './TreeThumbnail.tsx';
import WickermanPanel, { wickermanPhase } from './WickermanPanel.tsx';
import StepPlanPanel from './StepPlanPanel.tsx';
import { copyText } from './download.ts';
import { APP_VERSION } from '../version.ts';

const builds = import.meta.glob<{ default: Build }>(
  '../generated/builds/*.json',
  { eager: true },
);

function buildById(id: string): Build | undefined {
  return builds[`../generated/builds/${id}.json`]?.default;
}

function hashParam(name: string): string | null {
  return new URLSearchParams(window.location.hash.replace(/^#/, '')).get(name);
}

function currentId(): string {
  const wanted = hashParam('build');
  return wanted && buildById(wanted) ? wanted : (BUILDS[0]?.id ?? '');
}

/** Keeps the step in the hash so a refresh lands on the same step, shareably. */
function writeStep(id: string, step: string) {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  params.set('build', id);
  params.set('step', step);
  window.history.replaceState(null, '', `#${params.toString()}`);
}

/** Flask column for a checkpoint: leveling, maps, or endgame. */
function flaskStep(checkpoint: string): 'leveling' | 'maps' | 'endgame' {
  if (checkpoint === 'until-12' || checkpoint === 'until-28' || checkpoint === 'until-68') {
    return 'leveling';
  }
  if (checkpoint === 'pinnacle') return 'endgame';
  return 'maps';
}

function wikiUrl(name: string): string {
  return `https://www.poewiki.net/wiki/${encodeURIComponent(name.replaceAll(' ', '_'))}`;
}



/** PoE gem colours: strength red, dexterity green, intelligence blue, universal white. */
const GEM_COLOURS: Record<string, string> = {
  r: '#ff8a8a',
  g: '#8fe08f',
  b: '#8fb4ff',
  w: '#e6e6e6',
};

function gemColour(colour: string | null | undefined): string {
  return GEM_COLOURS[colour ?? 'w'] ?? GEM_COLOURS.w;
}

/** A gem name that links to its wiki page and carries the gem's socket colour. */
function GemLink({
  name,
  colour,
  strong = false,
}: {
  name: string;
  colour: string | null | undefined;
  strong?: boolean;
}) {
  return (
    <a
      href={wikiUrl(name)}
      target="_blank"
      rel="noreferrer noopener"
      className={strong ? 'font-semibold underline-offset-2 hover:underline' : 'underline-offset-2 hover:underline'}
      style={{ color: gemColour(colour) }}
    >
      {name}
    </a>
  );
}

/** One line saying how this class obtains the gem. */
function gemSourceLabel(info: GemAvailability | undefined): string | null {
  if (!info) return null;
  const { kind, act, quest } = info.source;
  const actPart = act === null ? null : `Act ${act}`;
  if (kind === 'reward') return ['Quest reward', actPart, quest].filter(Boolean).join(' · ');
  if (kind === 'vendor') {
    return ['Vendor', actPart, quest ? `after ${quest}` : null].filter(Boolean).join(' · ');
  }
  if (kind === 'siosa') return 'Siosa · Act 3 Library, after A Fixture of Fate';
  if (kind === 'lilly') return 'Lilly Roth · Act 6, after Fallen from Grace';
  if (kind === 'divine-font') return 'Divine Font · end of any Labyrinth, or trade';
  return `Buy it at level ${info.requiredLevel}`;
}

function n(value: number): string {
  return value.toLocaleString('en-US');
}

function gateRows(gate: GateResult): { label: string; value: string; rule: string }[] {
  const t = gate.thresholds ?? {};
  const resists =
    t.resists === false
      ? 'not required'
      : `≥ ${typeof t.resistanceFloor === 'number' ? t.resistanceFloor : 75}%`;
  const chaos = typeof t.chaosResist === 'number' ? `≥ ${t.chaosResist}%` : '—';
  return [
    {
      label: 'Damage',
      value: dps(gate.metrics.dps),
      rule: typeof t.dps === 'number' ? `≥ ${dps(t.dps)}` : '—',
    },
    {
      label: 'Life',
      value: n(gate.metrics.life),
      rule: typeof t.life === 'number' ? `≥ ${n(t.life)}` : '—',
    },
    {
      label: 'EHP',
      value: n(gate.metrics.ehp),
      rule: typeof t.ehp === 'number' ? `≥ ${n(t.ehp)}` : '—',
    },
    {
      label: 'Physical max hit',
      value: n(gate.metrics.maxHit),
      rule: typeof t.maxHit === 'number' ? `≥ ${n(t.maxHit)}` : '—',
    },
    {
      label: 'Elemental resists',
      value: gate.metrics.resists.map((value) => `${value}%`).join(' / '),
      rule: resists,
    },
    { label: 'Chaos resist', value: `${gate.metrics.chaosResist ?? -100}%`, rule: chaos },
    { label: 'Passive points', value: n(gate.metrics.nodes), rule: '—' },
    { label: 'Jewel sockets', value: n(gate.metrics.sockets ?? 0), rule: '—' },
    { label: 'Ascendancy nodes', value: n(gate.metrics.ascendancy), rule: '—' },
  ];
}

function dps(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function statusLabel(status: BuildIndexEntry['status']): string {
  return status === 'verified'
    ? 'verified'
    : status === 'rejected'
      ? 'rejected'
      : status === 'stale'
        ? 'stale'
        : 'draft';
}

const GUIDE_LABEL: Record<(typeof GUIDE_SECTIONS)[number], string> = {
  summary: 'Summary',
  leveling: 'Leveling',
  maps: 'Maps',
  bossing: 'Bossing',
};

const STATUS_HELP: Record<GuideSection['status'], string> = {
  signed: 'Reviewed and signed by the maintainer.',
  'auto-breadth': 'Generated breadth copy that passed the checks but was not signed.',
  'auto-retry': 'Generated from declared facts and passing checks, but not signed; treated as a draft.',
  stale: 'The declared facts moved after sign-off; the section is not published until re-signed.',
};

function GuideStatus({ section }: { section: GuideSection }) {
  const colour =
    section.status === 'signed'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : section.status === 'auto-breadth'
        ? 'border-gold-400/40 bg-gold-400/10 text-gold-200'
        : section.status === 'stale'
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  return (
    <span
      title={STATUS_HELP[section.status]}
      className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${colour}`}
    >
      {section.status}
    </span>
  );
}

function GuideBlock({
  id,
  section,
}: {
  id: (typeof GUIDE_SECTIONS)[number];
  section: GuideSection;
}) {
  return (
    <article className="rounded-lg border border-ink-700 bg-ink-900/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          {GUIDE_LABEL[id]}
        </h3>
        <GuideStatus section={section} />
      </div>
      <div className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-zinc-400">
        {section.text.split(/\n{2,}/).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <p className="mt-2 text-[9px] text-zinc-700">
        facts {section.factsHash}
        {section.signed ? ` · signed ${section.signed.by}` : ''}
      </p>
    </article>
  );
}

function tradeoffClass(kind: 'pro' | 'con', weight: number): string {
  if (kind === 'pro') {
    if (weight >= 3) return 'font-semibold text-emerald-200';
    if (weight === 2) return 'text-emerald-300/90';
    return 'text-emerald-400/70';
  }
  if (weight >= 3) return 'font-semibold text-rose-200';
  if (weight === 2) return 'text-rose-300/90';
  return 'text-rose-400/70';
}

function Tooltip({
  children,
  label,
  placement = 'above',
  align = 'left',
}: {
  children: React.ReactNode;
  label: React.ReactNode;
  placement?: 'above' | 'below';
  align?: 'left' | 'right';
}) {
  // Rendered above by default: a tooltip hanging below the last row made the
  // page grow, which produced scrollbars and pushed the tooltip out of view.
  // `align` keeps a tooltip in the right-hand table column from overflowing the
  // viewport, which is what produced the horizontal scrollbar on the last gem.
  const position =
    placement === 'above'
      ? 'bottom-full mb-1'
      : 'top-full mt-1';
  const side = align === 'right' ? 'right-0' : 'left-0';
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${side} z-30 hidden max-h-80 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-ink-600 bg-ink-950/95 p-2 text-left text-[11px] leading-snug text-zinc-300 shadow-xl group-hover:block group-focus-within:block ${position}`}
      >
        {label}
      </span>
    </span>
  );
}

/**
 * The published code is the `maps-red` gear set the gate measured (D24), so a
 * reader can open PoB and see the same numbers. It is copied, never downloaded:
 * no `.xml` file (D19), and no network call from this page.
 */
function PobCode({
  buildId,
  pob,
  step,
}: {
  buildId: string;
  pob: NonNullable<Build['pob']>;
  step: string;
}) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  // pobb.in shows the tree, gear and gems in the code it is given. The release
  // publisher stores one paste per guide step, so the link follows the step.
  const code = pob.byStep?.[step] ?? pob.code;
  const link = getPobLink(buildId, step) ?? getPobLink(buildId, pob.checkpoint);
  return (
    <section aria-labelledby="pob">
      <h2
        id="pob"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
      >
        Path of Building
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
        This code is the {step} gear set, generated by PoB {pob.ref} — the same
        items and tree the gate report above was measured on. Open the published
        copy on pobb.in, or paste the code into Path of Building&apos;s{' '}
        <span className="text-zinc-400">Import/Export Build</span>.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={async () => setCopied((await copyText(code)) ? 'ok' : 'fail')}
          className="rounded border border-ink-600 bg-ink-800/60 px-3 py-1.5 text-xs text-zinc-200 hover:border-gold-400 hover:text-gold-200"
        >
          {copied === 'ok' ? 'Copied' : copied === 'fail' ? 'Copy failed' : 'Copy PoB code'}
        </button>
        {link ? (
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded border border-ink-700 px-3 py-1.5 text-xs text-zinc-400 underline-offset-2 hover:border-ink-500 hover:underline"
          >
            Open build on pobb.in
          </a>
        ) : (
          <span className="text-[10px] text-zinc-600">
            PoB paste not published yet; copy the code instead.
          </span>
        )}
        <span className="text-[10px] text-zinc-600">{(code.length / 1024).toFixed(1)} KB</span>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
          show the code
        </summary>
        <textarea
          readOnly
          value={code}
          rows={4}
          spellCheck={false}
          className="mt-2 w-full resize-y rounded border border-ink-700 bg-ink-950/60 p-2 font-mono text-[10px] leading-snug text-zinc-400"
          aria-label="Path of Building code"
        />
      </details>
    </section>
  );
}

export default function BuildPage() {
  const [id, setId] = useState(currentId);
  const [stepOverride, setStepOverride] = useState<string | null>(
    () => hashParam('step'),
  );

  useEffect(() => {
    const onHash = () => {
      setId(currentId());
      setStepOverride(hashParam('step'));
    };
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
  // The step drives every number on the page: tree, gear, gems, budgets.
  const step = gates.some(([key]) => key === stepOverride)
    ? stepOverride!
    : (gates[0]?.[0] ?? '');
  const gate = build.gates?.[step];
  const pipeline = build.pipeline;
  const builderHash = `#mode=build&build=${build.id}&phase=leveling&strictness=soft`;
  const filterLinks = [
    { label: 'Leveling · Soft', href: `${builderHash}` },
    { label: 'Early maps · Strict', href: `#mode=build&build=${build.id}&phase=leveling&strictness=strict` },
    { label: 'Endgame · Strict', href: `#mode=build&build=${build.id}&phase=endgame&strictness=strict` },
    { label: 'Bossing · Uber', href: `#mode=build&build=${build.id}&phase=endgame&strictness=uber` },
  ];
  const showFlasks = gate?.flasks ?? build.flasks?.[flaskStep(step)];
  // Quality and Vaal corruption are endgame investments. The only exception is
  // a guide that is explicitly built around a Vaal gem from the start.
  const showGemQuality =
    step === 'maps-red' || step === 'pinnacle' || build.gemQualityFrom === 'leveling';
  // A guide step is a leveling bracket: show the gems you level with at that
  // step, so there is no separate "leveling" section repeating the same thing.
  // A map step is not a leveling step, and a step that introduces no gem the
  // reader has not already been told about and has no swap has nothing left to
  // say, so it is hidden too.
  const leveling = levelingPlan(
    build.leveling,
    Object.entries(build.gates ?? {}).map(([id, entry]) => ({ id, level: entry.level })),
    (gem) => build.gemInfo?.[gem]?.requiredLevel,
  ).find((entry) => entry.id === step);
  const showLeveling = Boolean(leveling && !leveling.redundant);

  return (
    <div className="min-h-dvh">
      <SiteHeader active="build" />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="lg:grid lg:grid-cols-[1fr_13rem] lg:gap-8">
      <div className="flex flex-col gap-8">
      <header>
        <figure className="relative mb-4 overflow-hidden rounded-xl border border-ink-700 bg-ink-900/50">
          <img
            src={`./builds/${build.id}.webp`}
            alt={`${build.name} key art`}
            className="h-48 w-full object-cover object-center sm:h-64"
            loading="eager"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950/80 via-ink-950/20 to-transparent" />
          <figcaption className="absolute bottom-3 left-4 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            {build.mainSkill} · generated key art
          </figcaption>
        </figure>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              {build.class} / {build.mainSkill}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">{build.name}</h1>
              {build.season && (
                <span
                  title={`Created for, or last updated for, the ${build.season.name} league.`}
                  className="rounded border border-violet-400/40 bg-violet-500/10 px-2 py-1 text-[10px] uppercase tracking-wide text-violet-200"
                >
                  {build.season.name}
                </span>
              )}
            </div>
          </div>
          <span
            className={
              build.status === 'verified'
                ? 'rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300'
                : build.status === 'stale'
                  ? 'rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-300'
                  : 'rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300'
            }
          >
            {statusLabel(build.status)} · {passed}/{gates.length} checkpoints
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{build.summary}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <section
            aria-labelledby="pros"
            className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.04] p-3"
          >
            <h2
              id="pros"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300"
            >
              Pros
            </h2>
            <ul className="mt-1.5 space-y-1 text-xs leading-snug">
              {build.pros.map((entry) => (
                <li key={entry.text} className={tradeoffClass('pro', entry.weight)}>
                  <span aria-hidden className="mr-1.5">
                    +
                  </span>
                  {entry.text}
                </li>
              ))}
            </ul>
          </section>
          <section
            aria-labelledby="cons"
            className="rounded-lg border border-rose-500/25 bg-rose-500/[0.04] p-3"
          >
            <h2
              id="cons"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300"
            >
              Cons
            </h2>
            <ul className="mt-1.5 space-y-1 text-xs leading-snug">
              {build.cons.map((entry) => (
                <li key={entry.text} className={tradeoffClass('con', entry.weight)}>
                  <span aria-hidden className="mr-1.5">
                    −
                  </span>
                  {entry.text}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="mt-1 text-[10px] text-zinc-600">
          Stronger colour is a bigger factor. Weighted by the guide, not by a popularity poll.
        </p>

        {build.ratings && build.medal && (
          <div className="mt-4">
            <RatingPanel ratings={build.ratings} medal={build.medal} />
          </div>
        )}
      </header>

      {build.guide && (
        <section aria-labelledby="guide">
          <h2 id="guide" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Guide
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            Prose states numbers only through checked placeholders. A signed
            summary is required to publish; the other sections may be unsigned
            retries.
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
            <span className="mr-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-1 text-emerald-300">
              signed
            </span>{' '}
            reviewed by the maintainer ·{' '}
            <span className="mr-1 rounded border border-amber-500/40 bg-amber-500/10 px-1 text-amber-300">
              auto-retry
            </span>{' '}
            generated from declared facts and passing checks, but not signed; a
            draft ·{' '}
            <span className="mr-1 rounded border border-gold-400/40 bg-gold-400/10 px-1 text-gold-200">
              auto-breadth
            </span>{' '}
            unsigned breadth copy that passed the checks ·{' '}
            <span className="mr-1 rounded border border-rose-500/40 bg-rose-500/10 px-1 text-rose-300">
              stale
            </span>{' '}
            facts moved after sign-off, so it is not published.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {GUIDE_SECTIONS.map((id) => (
              <GuideBlock key={id} id={id} section={build.guide![id]} />
            ))}
          </div>
        </section>
      )}

      {build.stale ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs leading-relaxed text-rose-200">
          This build is delisted ({build.stale.status}): {build.stale.reason}
        </p>
      ) : (
        build.status !== 'verified' && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-200">
            This build does not pass its gates yet, so it is not published as a
            guide. The numbers below are what Path of Building measured; the
            failures are named rather than hidden.
          </p>
        )
      )}

      <section aria-labelledby="steps">
        <h2 id="steps" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Step
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
          Everything below follows the step you pick: tree, gems, gear and the
          numbers the gate measured.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {gates.map(([checkpoint]) => (
            <button
              key={checkpoint}
              type="button"
              aria-pressed={checkpoint === step}
              onClick={() => {
                setStepOverride(checkpoint);
                writeStep(build.id, checkpoint);
              }}
              className={
                checkpoint === step
                  ? 'rounded border border-gold-400 bg-gold-400/10 px-2 py-1 text-[11px] text-gold-200'
                  : 'rounded border border-ink-700 bg-ink-800/40 px-2 py-1 text-[11px] text-zinc-400 hover:border-ink-500'
              }
            >
              {checkpoint}
              <span className="ml-1 text-zinc-500">lv {build.gates?.[checkpoint]?.level}</span>
            </button>
          ))}
        </div>
      </section>

      {build.stepPlans?.[step] && (
        <section aria-labelledby="step-plan">
          <h2
            id="step-plan"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
          >
            Step plan
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            What to prioritise at this step, the modifiers worth paying for on
            each slot, and the crafting recipes that are actually available now.
          </p>
          <div className="mt-2">
            <StepPlanPanel plan={build.stepPlans[step]} step={step} />
          </div>
        </section>
      )}

      {gate && (
        <section aria-labelledby="gates">
          <h2 id="gates" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Gate report
          </h2>
          <p className="mt-1 text-[11px] text-zinc-600">
            {pipeline?.calibrated ? 'Calibrated gates' : 'Gates are not calibrated yet'} · PoB{' '}
            {pipeline?.pobRef ?? 'unknown'} · tree {pipeline?.treeVersion ?? 'unknown'}
            {pipeline && !pipeline.calibrated && (
              <span className="ml-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                uncalibrated thresholds
              </span>
            )}
          </p>
          <article
            className={
              gate.pass
                ? 'mt-3 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04]'
                : 'mt-3 overflow-hidden rounded-lg border border-rose-500/30 bg-rose-500/[0.04]'
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700/80 px-3 py-2">
              <p className="text-[11px] text-zinc-400">
                level {gate.level} · {gate.budget}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {gate.gateProfile === 'dad' && (
                  <span
                    title="Dad profile: the defensive gates are unchanged, but the damage floor is lower for a low-APM/DoT/totem build."
                    className="rounded border border-fuchsia-500/40 bg-fuchsia-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-fuchsia-300"
                  >
                    Dad profile
                  </span>
                )}
                <span
                  className={
                    gate.pass
                      ? 'rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300'
                      : 'rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-rose-300'
                  }
                >
                  {gate.pass ? 'pass' : 'fail'}
                </span>
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                  <th className="px-3 py-1.5 font-normal">Metric</th>
                  <th className="px-3 py-1.5 font-normal">Measured</th>
                  <th className="px-3 py-1.5 font-normal">Gate</th>
                </tr>
              </thead>
              <tbody>
                {gateRows(gate).map((row) => (
                  <tr key={row.label} className="border-t border-ink-800/80">
                    <td className="px-3 py-1 text-zinc-500">{row.label}</td>
                    <td className="px-3 py-1 text-zinc-200">{row.value}</td>
                    <td className="px-3 py-1 text-zinc-500">{row.rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {gate.failures.length > 0 && (
              <ul className="space-y-0.5 border-t border-rose-500/20 bg-rose-500/[0.04] px-3 py-2 text-[11px] text-rose-200">
                {gate.failures.map((failure) => (
                  <li key={failure}>{failure}</li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}

      {build.pob && <PobCode buildId={build.id} pob={build.pob} step={step} />}

      <section aria-labelledby="filter">
        <h2 id="filter" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Filter
        </h2>
        <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-zinc-600">
          The filter is generated from this build object, not from a family tag:
          the bases, gems and tiers are the ones measured above. Pick the phase
          that matches where you are.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {filterLinks.map((entry) => (
            <a
              key={entry.label}
              href={`./filter.html${entry.href}`}
              className="rounded-lg border border-ink-700 bg-ink-900/40 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-gold-400/60 hover:text-gold-200"
            >
              {entry.label}
              <span className="mt-0.5 block text-[10px] text-zinc-600">
                open in the filter builder
              </span>
            </a>
          ))}
        </div>
      </section>

      {gate?.repair && gate.repair.nodeDelta > 0 && (
        <section aria-labelledby="repair">
          <h2
            id="repair"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
          >
            Seed vs repaired
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            Bounded repair changed {gate.repair.nodeDelta} node
            {gate.repair.nodeDelta === 1 ? '' : 's'} at this step in{' '}
            {gate.repair.evals} Path of Building evaluation
            {gate.repair.evals === 1 ? '' : 's'} ({gate.repair.status}). The
            seed tree is shown next to the tree the gate measured, so nothing is
            passed off as the original.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {gate.repair.seedTree && (
              <TreeThumbnail tree={gate.repair.seedTree} label={`${step} seed`} />
            )}
            {gate.tree && <TreeThumbnail tree={gate.tree} label={`${step} repaired`} />}
          </div>
        </section>
      )}

      {gate?.tree && (
        <section aria-labelledby="tree">
          <h2 id="tree" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Passive tree at {step}
          </h2>
          <div className="mt-3">
            <TreeThumbnail tree={gate.tree} label={step} />
          </div>
        </section>
      )}

      {gate?.gear && (
        <section aria-labelledby="gear">
          <h2 id="gear" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Gear at {step}
          </h2>
          <p className="mt-1 text-[11px] text-zinc-600">
            Budget gear, not hand-picked items: the gate was measured on exactly
            these. Colours follow item rarity — blue magic, yellow rare. Hover a
            slot for its mods; the five flasks and any socketed jewels are part
            of the same sheet, and endgame armour shows its Eldritch implicits.
          </p>
          <div className="mt-3">
            <InventoryPanel gear={gate.gear} flasks={showFlasks ?? []} />
          </div>
        </section>
      )}

      {showLeveling && leveling && (
        <section aria-labelledby="leveling">
          <h2
            id="leveling"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
          >
            Leveling this step
          </h2>
          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Levels {leveling.from}–{leveling.until}
          </p>
          {leveling.startSkills.length > 0 ? (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Use</p>
              <ul className="mt-1 grid gap-1">
                {leveling.startSkills.map((skill) => {
                  const info = build.gemInfo?.[skill];
                  const source = gemSourceLabel(info);
                  return (
                    <li key={skill} className="text-sm text-zinc-300">
                      <GemLink name={skill} colour={info?.color} />
                      {source && (
                        <span className="text-[11px] text-zinc-500"> — {source}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-300">
              Nothing is listed for these levels yet — use your class&apos;s
              starting gem.
            </p>
          )}
          {leveling.until <= 28 &&
            leveling.startSkills.some(
              (skill) => build.gemInfo?.[skill]?.source?.kind === 'divine-font',
            ) && (
              <p className="mt-2 text-[11px] leading-relaxed text-amber-300">
                A transfigured gem only comes from the Divine Font at the end of a
                Labyrinth, or from another player, so it is not a league-start gem
                at this level.
              </p>
            )}
          {leveling.upgrades.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {leveling.upgrades.map((upgrade) => {
                const info = build.gemInfo?.[upgrade.gem];
                const source = gemSourceLabel(info);
                return (
                  <li
                    key={upgrade.gem}
                    className="rounded-md border border-gold-400/30 bg-gold-400/[0.06] px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="rounded bg-gold-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-gold-200">
                        {upgrade.replaces ? 'Swap' : 'Add'}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {upgrade.atBoundary ? 'At' : 'From'} level{' '}
                        <span className="font-semibold text-zinc-200">{upgrade.fromLevel}</span>
                        {upgrade.untilLevel !== undefined && (
                          <>
                            <span className="mx-1 text-zinc-600">·</span>
                            until level{' '}
                            <span className="font-semibold text-zinc-200">
                              {upgrade.untilLevel}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      {upgrade.replaces && (
                        <>
                          <GemLink
                            name={upgrade.replaces}
                            colour={build.gemInfo?.[upgrade.replaces]?.color}
                          />
                          <span aria-hidden className="text-zinc-500">
                            →
                          </span>
                        </>
                      )}
                      <GemLink name={upgrade.gem} colour={info?.color} strong />
                    </p>
                    {source && <p className="mt-1 text-[10px] text-zinc-500">{source}</p>}
                    {upgrade.note && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
                        {upgrade.note}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            <a
              href={`./filter.html${builderHash}`}
              className="text-gold-300 underline underline-offset-2"
            >
              Open the leveling filter for this build
            </a>{' '}
            — it highlights this build&apos;s bases and hides the rest.
          </p>
        </section>
      )}

      {gate?.gems && (
        <section aria-labelledby="gems">
          <h2 id="gems" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Gems at {step}
          </h2>
          {!showGemQuality && (
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
              Quality and Vaal corruption are not assumed at this step; they are
              endgame investments from red maps on.
            </p>
          )}
          <div className="mt-3">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                  <th className="py-1 pr-4 font-normal">Gear slot</th>
                  <th className="py-1 font-normal">Gems, main first</th>
                </tr>
              </thead>
              <tbody>
                {gate.gems.map((group) => (
                  <tr key={group.slot} className="border-t border-ink-700 align-top">
                    <td className="py-2 pr-4 whitespace-nowrap text-zinc-400">{group.slot}</td>
                    <td className="py-2">
                      {group.gems.map((gem, index) => (
                        <span key={gem.name}>
                          {index > 0 && <span className="text-zinc-600"> · </span>}
                          <Tooltip
                            align="right"
                            label={
                              <>
                                <strong className="block text-gold-200">{gem.name}</strong>
                                <span className="block text-zinc-500">
                                  level {gem.level}
                                  {gem.quality ? ` · ${gem.quality}% quality` : ''} ·{' '}
                                  {index === 0 ? 'main skill' : 'support'}
                                </span>
                                {build.gemInfo?.[gem.name]?.description && (
                                  <span className="mt-1 block leading-snug text-zinc-400">
                                    {build.gemInfo[gem.name].description}
                                  </span>
                                )}
                                {build.gemInfo?.[gem.name]?.support && (
                                  <span className="mt-1 block text-[10px] uppercase tracking-wide text-zinc-600">
                                    Support gem
                                  </span>
                                )}
                                {build.gemInfo?.[gem.name]?.effect?.length ? (
                                  <span className="mt-2 block border-t border-ink-700 pt-1.5">
                                    <span className="block text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                                      What it does
                                    </span>
                                    {build.gemInfo[gem.name].effect?.map((line) => (
                                      <span key={line} className="block text-zinc-300">
                                        {line}
                                      </span>
                                    ))}
                                  </span>
                                ) : null}
                                {build.gemInfo?.[gem.name]?.tags?.length ? (
                                  <span className="mt-1 block text-[10px] text-zinc-600">
                                    Tags: {build.gemInfo[gem.name].tags?.join(', ')}
                                  </span>
                                ) : null}
                                {showGemQuality && (
                                  <span className="mt-1 block text-zinc-500">
                                    {build.gemInfo?.[gem.name]?.qualityWorth === 'none'
                                      ? '20% quality: no effect.'
                                      : build.gemInfo?.[gem.name]?.qualityEffect
                                        ? `20% quality: ${build.gemInfo[gem.name].qualityEffect}`
                                        : '20% quality: optional.'}
                                  </span>
                                )}
                                {showGemQuality && gem.level > 20 && (
                                  <span className="mt-1 block text-amber-300">
                                    Vaaled: level 21+ requires a Vaal Orb.
                                  </span>
                                )}
                                {gem.maxLevel && (
                                  <span className="mt-1 block text-amber-300">
                                    Do not level above {gem.maxLevel}.
                                    {gem.note ? ` ${gem.note}` : ''}
                                  </span>
                                )}
                                {gemSourceLabel(build.gemInfo?.[gem.name]) && (
                                  <span className="mt-1 block text-zinc-500">
                                    {gemSourceLabel(build.gemInfo?.[gem.name])}
                                  </span>
                                )}
                                <span className="mt-1 block text-zinc-500">
                                  click for the wiki page
                                </span>
                              </>
                            }
                          >
                            <a
                              href={wikiUrl(gem.name)}
                              target="_blank"
                              rel="noreferrer noopener"
                              className={
                                index === 0
                                  ? 'font-semibold underline-offset-2 hover:underline'
                                  : 'underline-offset-2 hover:underline'
                              }
                              style={{ color: gemColour(build.gemInfo?.[gem.name]?.color) }}
                            >
                              {gem.name}
                              <span className="ml-1 text-[10px] text-zinc-500">{gem.level}</span>
                              {showGemQuality && gem.level > 20 && (
                                <span className="ml-1 rounded bg-amber-500/20 px-1 text-[9px] uppercase tracking-wide text-amber-300">
                                  Vaaled
                                </span>
                              )}
                              {gem.maxLevel && (
                                <span className="ml-1 text-[9px] text-amber-300">
                                  max {gem.maxLevel}
                                </span>
                              )}
                              {showGemQuality &&
                                build.gemInfo?.[gem.name]?.qualityWorth === 'recommended' && (
                                  <span className="ml-1 rounded bg-emerald-500/20 px-1 text-[9px] uppercase tracking-wide text-emerald-300">
                                    20q
                                  </span>
                                )}
                              {showGemQuality &&
                                build.gemInfo?.[gem.name]?.qualityWorth === 'optional' && (
                                  <span className="ml-1 rounded bg-ink-700 px-1 text-[9px] uppercase tracking-wide text-zinc-400">
                                    20q?
                                  </span>
                                )}
                              {showGemQuality &&
                                build.gemInfo?.[gem.name]?.qualityWorth === 'none' && (
                                  <span className="ml-1 rounded bg-zinc-700/40 px-1 text-[9px] uppercase tracking-wide text-zinc-500">
                                    no 20q
                                  </span>
                                )}
                            </a>
                          </Tooltip>
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="ascendancy">
        <h2 id="ascendancy" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Ascendancy
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
          The full ascendancy, with every notable and path passive. Gold nodes
          are the four this build takes; the lab cards under the circle say when
          each one becomes available.
        </p>
        <div className="mt-3">
          <AscendancyPanel
            ascendancyId={build.ascendancyId}
            selected={build.ascendancyOrder}
          />
        </div>
      </section>

      <section aria-labelledby="pantheon">
        <h2 id="pantheon" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Pantheon
        </h2>
        <div className="mt-3">
          <PantheonPanel
            major={build.pantheon.major}
            minor={build.pantheon.minor}
            note={build.pantheon.note}
          />
        </div>
      </section>

      <section aria-labelledby="bandit">
        <h2 id="bandit" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Bandit
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(BANDITS).map(([id, choice]) => (
            <article
              key={id}
              className={
                id === build.bandit
                  ? 'rounded-lg border border-gold-400/60 bg-gold-400/10 p-3'
                  : 'rounded-lg border border-ink-700 bg-ink-900/40 p-3 opacity-70'
              }
            >
              <p className="text-sm text-zinc-200">{choice.name}</p>
              <p className="mt-1 text-[11px] leading-snug text-zinc-500">{choice.effect}</p>
              {id === build.bandit && (
                <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-gold-300">
                  selected
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {build.wickerman && (
        <section aria-labelledby="wickerman">
          <h2
            id="wickerman"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
          >
            Wickerman
          </h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-zinc-600">
            The Covens league mechanic. Four Viscera slots give permanent
            benefits; the recommendation follows the selected step, so the
            leveling, mapping and bossing sets are all shown on the same guide.
          </p>
          <div className="mt-3">
            <WickermanPanel wickerman={build.wickerman} phase={wickermanPhase(step)} />
          </div>
        </section>
      )}

      {build.changelog && build.changelog.length > 0 && (
        <section aria-labelledby="changelog">
          <h2
            id="changelog"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
          >
            Build changelog
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            What changed in this guide, newest first. The season tag at the top of
            the page follows the newest entry.
          </p>
          <ol className="mt-3 space-y-3">
            {[...build.changelog].reverse().map((entry) => (
              <li
                key={`${entry.season}-${entry.date}`}
                className="rounded-lg border border-ink-700 bg-ink-900/40 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-violet-400/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-violet-200">
                    {entry.seasonName ?? entry.season}
                  </span>
                  <time dateTime={entry.date} className="text-[10px] text-zinc-500">
                    {entry.date}
                  </time>
                </div>
                <ul className="mt-1.5 space-y-0.5 text-xs leading-snug text-zinc-400">
                  {entry.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
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

      <aside className="order-first mb-6 lg:order-none lg:mb-0">
        <nav
          aria-label="On this page"
          className="lg:sticky lg:top-8 lg:mt-2 text-xs text-zinc-500"
        >
          {/* Kept in the sticky menu so a reader can move between checkpoints
              while reading gems or gear, without returning to the step block
              at the top of the page. Rows follow the site nav instead of
              nesting bordered chips inside a second bordered box, so the
              picker reads as part of the same menu as the page links. */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              Step
            </p>
            <ul className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
              {gates.map(([checkpoint, entry]) => {
                const current = checkpoint === step;
                return (
                  <li key={checkpoint} className="lg:w-full">
                    <button
                      type="button"
                      aria-pressed={current}
                      aria-label={`Read the ${checkpoint} step, level ${entry.level}`}
                      onClick={() => {
                        setStepOverride(checkpoint);
                        writeStep(build.id, checkpoint);
                      }}
                      className={
                        current
                          ? 'flex w-full items-center justify-between gap-2 rounded-md border border-gold-400/40 bg-gold-400/10 px-2 py-1 text-left text-[11px] font-medium text-gold-200 lg:px-2.5 lg:py-1.5'
                          : 'flex w-full items-center justify-between gap-2 rounded-md border border-ink-700 bg-ink-800/40 px-2 py-1 text-left text-[11px] text-zinc-500 transition-colors hover:border-ink-500 hover:text-zinc-200 lg:border-transparent lg:bg-transparent lg:px-2.5 lg:py-1.5 lg:hover:bg-ink-800/70'
                      }
                    >
                      <span className="truncate">{checkpoint}</span>
                      <span
                        className={
                          current
                            ? 'text-[10px] tabular-nums text-gold-300/80'
                            : 'text-[10px] tabular-nums text-zinc-600'
                        }
                      >
                        lv {entry.level}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            On this page
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 lg:flex-col lg:gap-y-2">
            {[
              ['ratings', 'Ratings'],
              ['guide', 'Guide'],
              ['steps', 'Step'],
              ['step-plan', 'Step plan'],
              ['gates', 'Gate report'],
              ['pob', 'Path of Building'],
              ['filter', 'Filter'],
              ...(gate?.repair && gate.repair.nodeDelta > 0
                ? ([['repair', 'Seed vs repaired']] as [string, string][])
                : []),
              ['tree', 'Passive tree'],
              ['gear', 'Gear'],
              ['gems', 'Gems'],
              ...(showLeveling ? ([['leveling', 'Leveling this step']] as [string, string][]) : []),
              ['ascendancy', 'Ascendancy'],
              ['pantheon', 'Pantheon'],
              ['bandit', 'Bandit'],
              ['wickerman', 'Wickerman'],
              ['changelog', 'Build changelog'],
            ].map(([anchor, label]) => (
              <li key={anchor}>
                <a
                  href={`#${anchor}`}
                  onClick={(event) => {
                    // Hash links must not clobber the build/step state.
                    event.preventDefault();
                    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="underline-offset-2 hover:text-zinc-300 hover:underline"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      </div>
      </div>
    </div>
  );
}
