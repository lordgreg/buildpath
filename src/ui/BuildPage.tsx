import { useEffect, useMemo, useState } from 'react';
import type {
  Build,
  GemAvailability,
} from '../core/builds/types.ts';
import { BUILDS, BUILD_VERSION, getBuildEntry } from '../meta/builds.ts';
import { GUIDE_SECTIONS, type GuideSection } from '../core/builds/guide.ts';
import { levelingPlan } from '../core/builds/leveling.ts';
import {
  currentStep,
  measuredFallback,
  resolveStepId,
  stepView,
} from '../core/builds/stepView.ts';
import { BANDITS } from '../meta/pantheon.ts';
import AscendancyPanel from './AscendancyPanel.tsx';
import InventoryPanel from './InventoryPanel.tsx';
import PantheonPanel from './PantheonPanel.tsx';
import RatingPanel from './RatingPanel.tsx';
import SiteHeader from './SiteHeader.tsx';
import TreeThumbnail from './TreeThumbnail.tsx';
import WickermanPanel, { wickermanPhase } from './WickermanPanel.tsx';
import StepPlanPanel from './StepPlanPanel.tsx';
import FeedbackPanel from './FeedbackPanel.tsx';
import BuildChips from './build/BuildChips.tsx';
import BuildChangelog from './build/BuildChangelog.tsx';
import GateReport from './build/GateReport.tsx';
import PobCode from './build/PobCode.tsx';
import StepPicker from './build/StepPicker.tsx';
import { catalogueStep } from './buildsCatalogue.ts';
import { buildGuideTitle } from './buildTitle.ts';
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

/**
 * Flask column for a step. The root the step is grouped under is the phase, so a
 * migrated seed with its own step ids needs no table.
 */
function flaskStep(
  step: { root: 'leveling' | 'maps' | 'endgame' } | undefined,
  id: string,
): 'leveling' | 'maps' | 'endgame' {
  if (step) return step.root;
  if (id === 'until-12' || id === 'until-28' || id === 'until-68') return 'leveling';
  if (id === 'pinnacle') return 'endgame';
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

function dps(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

const GUIDE_LABEL: Record<(typeof GUIDE_SECTIONS)[number], string> = {
  summary: 'Summary',
  leveling: 'Leveling',
  maps: 'Maps',
  bossing: 'Bossing',
};

const SECTION_IDS = [
  'introduction',
  'guide',
  'tree',
  'gear',
  'gems',
  'ascendancy',
  'pantheon',
  'bandits',
  'wickerman',
  'pob',
  'filter',
  'changelog',
] as const;

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
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          {GUIDE_LABEL[id]}
        </h4>
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
  const position = placement === 'above' ? 'bottom-full mb-1' : 'top-full mt-1';
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

export default function BuildPage() {
  const [id, setId] = useState(currentId);
  const [stepOverride, setStepOverride] = useState<string | null>(
    () => hashParam('step'),
  );
  const [activeSection, setActiveSection] = useState<string>('introduction');

  useEffect(() => {
    const onHash = () => {
      setId(currentId());
      setStepOverride(hashParam('step'));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const build = useMemo(() => buildById(id), [id]);

  useEffect(() => {
    document.title = buildGuideTitle(build?.name);
  }, [build]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      let current: string = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const element = document.getElementById(id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= 120) current = id;
        else break;
      }
      setActiveSection((previous) => (previous === current ? previous : current));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [build?.id]);

  if (!build) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-zinc-400">
          No build has been compiled yet. Run <code>npm run builds:build</code>.
        </p>
      </main>
    );
  }

  const roots = stepView(build);
  const step = resolveStepId(roots, stepOverride);
  const current = currentStep(roots, step);
  const measuredStep = build.gates?.[step] ? current : measuredFallback(roots, step);
  const gateKey = measuredStep?.gateKey ?? step;
  const gate = build.gates?.[gateKey];
  const pipeline = build.pipeline;
  const catalogueEntry = getBuildEntry(build.id);
  const red = catalogueEntry ? catalogueStep(catalogueEntry, 'maps-red') : undefined;
  const pinnacle = catalogueEntry ? catalogueStep(catalogueEntry, 'pinnacle') : undefined;
  const flatSteps = roots.flatMap((root) => root.steps);
  const stepIndex = flatSteps.findIndex((entry) => entry.id === step);
  const nextStep = stepIndex >= 0 ? flatSteps[stepIndex + 1] : undefined;
  const builderHash = `#mode=build&build=${build.id}&phase=leveling&strictness=soft`;
  const filterLinks = [
    { label: 'Leveling · Soft', href: `${builderHash}` },
    { label: 'Early maps · Strict', href: `#mode=build&build=${build.id}&phase=leveling&strictness=strict` },
    { label: 'Endgame · Strict', href: `#mode=build&build=${build.id}&phase=endgame&strictness=strict` },
    { label: 'Bossing · Uber', href: `#mode=build&build=${build.id}&phase=endgame&strictness=uber` },
  ];
  const showFlasks = gate?.flasks ?? build.flasks?.[flaskStep(current, step)];
  const showGemQuality =
    build.gemQualityFrom === 'leveling' ||
    Boolean(gate?.gems?.some((group) => group.gems.some((gem) => (gem.quality ?? 0) > 0)));
  const leveling = build.leveling
    ? levelingPlan(
        build.leveling,
        Object.entries(build.gates ?? {}).map(([id, entry]) => ({ id, level: entry.level })),
        (gem) => build.gemInfo?.[gem]?.requiredLevel,
      ).find((entry) => entry.id === step)
    : undefined;
  const showLeveling = Boolean(leveling && !leveling.redundant);
  const showChanges = showLeveling || Boolean(current?.watch);

  const selectStep = (next: string) => {
    setStepOverride(next);
    writeStep(build.id, next);
  };

  return (
    <div className="min-h-dvh">
      <SiteHeader active="build" />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="lg:grid lg:grid-cols-[1fr_13rem] lg:gap-8">
          <div className="flex flex-col gap-10">
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
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  {build.class} / {build.mainSkill}
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-white">{build.name}</h1>
                {catalogueEntry?.chips && <BuildChips chips={catalogueEntry.chips} />}
                {(red || pinnacle) && (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    red maps{' '}
                    <span className={red?.pass ? 'text-zinc-200' : 'text-rose-300'}>
                      {red ? `${dps(red.dps)} DPS` : 'not measured'}
                    </span>
                    <span className="mx-1.5 text-zinc-700">·</span>
                    pinnacle{' '}
                    <span className={pinnacle?.pass ? 'text-zinc-200' : 'text-rose-300'}>
                      {pinnacle ? `${dps(pinnacle.dps)} DPS` : 'not measured'}
                    </span>
                  </p>
                )}
              </header>

              <section id="introduction" aria-labelledby="introduction-title" className="flex flex-col gap-4">
                <h2
                  id="introduction-title"
                  className="text-lg font-semibold tracking-tight text-white"
                >
                  Introduction
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">{build.summary}</p>

                <div className="grid gap-3 md:grid-cols-2">
                  <section
                    aria-labelledby="pros"
                    className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.04] p-3"
                  >
                    <h3
                      id="pros"
                      className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300"
                    >
                      Pros
                    </h3>
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
                    <h3
                      id="cons"
                      className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300"
                    >
                      Cons
                    </h3>
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

              <FeedbackPanel buildId={build.id} />

              {build.guide && (
                <section aria-labelledby="overview">
                  <h3
                    id="overview"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    Overview
                  </h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {GUIDE_SECTIONS.map((id) => (
                      <GuideBlock key={id} id={id} section={build.guide![id]} />
                    ))}
                  </div>
                </section>
              )}
            </section>

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

            <section id="guide" aria-labelledby="guide-title" className="flex flex-col gap-6">
              <div>
                <h2
                  id="guide-title"
                  className="text-lg font-semibold tracking-tight text-white"
                >
                  Guide
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                  Pick a root step, then a sub-step. Everything below follows that choice:
                  tree, gems, gear and the numbers the gate measured.
                </p>
              </div>

              <StepPicker roots={roots} step={step} onSelect={selectStep} />

              {build.stepPlans?.[step] && (
                <section aria-labelledby="step-plan">
                  <h3
                    id="step-plan"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    This step
                  </h3>
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
                <GateReport
                  gate={gate}
                  pipeline={pipeline}
                  current={current}
                  measuredStep={measuredStep}
                />
              )}

              {gate?.repair && gate.repair.nodeDelta > 0 && (
                <section aria-labelledby="repair">
                  <h3
                    id="repair"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    Seed vs repaired
                  </h3>
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
                  <h3
                    id="tree"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    Passive Tree at level {gate.level}
                  </h3>
                  <div className="mt-3">
                    <TreeThumbnail tree={gate.tree} label={step} />
                  </div>
                </section>
              )}

              {gate?.gear && (
                <section aria-labelledby="gear">
                  <h3
                    id="gear"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    Gear at level {gate.level}
                  </h3>
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

              {gate?.gems && (
                <section aria-labelledby="gems">
                  <h3
                    id="gems"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    Gems at level {gate.level}
                  </h3>
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

              {showChanges && (
                <section aria-labelledby="changes">
                  <h3
                    id="changes"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    {nextStep ? `Until you reach level ${nextStep.level}` : 'What changes here'}
                  </h3>
                  {current?.watch && (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">
                      {current.watch}
                    </p>
                  )}
                  {current && !current.measured && current.reason && (
                    <p className="mt-2 rounded border border-amber-500/30 bg-amber-500/[0.06] px-2 py-1.5 text-[11px] leading-relaxed text-amber-200">
                      Not measured: {current.reason} The gate numbers above are the last
                      measured step&apos;s.
                    </p>
                  )}
                  {leveling && (
                    <>
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
                                    {upgrade.kind === 'support'
                                      ? 'Support'
                                      : upgrade.replaces
                                        ? 'Swap'
                                        : 'Add'}
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
                    </>
                  )}
                </section>
              )}

              <section aria-labelledby="ascendancy">
                <h3
                  id="ascendancy"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                >
                  Ascendancy
                </h3>
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
                <h3
                  id="pantheon"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                >
                  Pantheon
                </h3>
                <div className="mt-3">
                  <PantheonPanel
                    major={build.pantheon.major}
                    minor={build.pantheon.minor}
                    note={build.pantheon.note}
                  />
                </div>
              </section>

              <section aria-labelledby="bandits">
                <h3
                  id="bandits"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                >
                  Bandits
                </h3>
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
                  <h3
                    id="wickerman"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    Wickerman
                  </h3>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                    {build.patch ? `${build.patch.split('.').slice(0, 2).join('.')} ` : ''}
                    {build.season?.name ?? 'Covens'} league mechanic
                  </p>
                  <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-zinc-600">
                    Four Viscera slots give permanent benefits; the recommendation
                    follows the selected step.
                  </p>
                  <div className="mt-3">
                    <WickermanPanel wickerman={build.wickerman} phase={wickermanPhase(step)} />
                  </div>
                </section>
              )}

              {build.pob && <PobCode buildId={build.id} pob={build.pob} />}

              <section aria-labelledby="filter">
                <h3
                  id="filter"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                >
                  Filter
                </h3>
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
            </section>

            {build.changelog && build.changelog.length > 0 && (
              <BuildChangelog changelog={build.changelog} />
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
              aria-label="Contents"
              className="lg:sticky lg:top-20 lg:mt-2 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto text-xs text-zinc-500"
            >
              <div className="mb-5">
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                  Your step
                </p>
                <StepPicker
                  roots={roots}
                  step={step}
                  onSelect={selectStep}
                  variant="menu"
                />
              </div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Contents
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-1 lg:flex-col lg:gap-y-2">
                {[
                  ['introduction', 'Introduction', false],
                  ['guide', 'Guide', false],
                  ['tree', 'Passive Tree', true],
                  ['gear', 'Gear', true],
                  ['gems', 'Gems', true],
                  ['ascendancy', 'Ascendancy', true],
                  ['pantheon', 'Pantheon', true],
                  ['bandits', 'Bandits', true],
                  ['wickerman', 'Wickerman', true],
                  ['pob', 'Path of Building', false],
                  ['filter', 'Filter', false],
                  ['changelog', 'Changelog', false],
                ].map(([anchor, label, nested]) => {
                  const active = activeSection === anchor;
                  return (
                    <li key={anchor as string} className={nested ? 'lg:pl-3' : ''}>
                      <a
                        href={`#${anchor}`}
                        aria-current={active ? 'location' : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          document.getElementById(anchor as string)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={
                          active
                            ? 'font-medium text-gold-200 underline-offset-2'
                            : 'underline-offset-2 hover:text-zinc-300 hover:underline'
                        }
                      >
                        {label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      </div>
    </div>
  );
}
