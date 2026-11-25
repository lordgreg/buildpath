import { useEffect, useMemo, useState } from 'react';
import type {
  Build,
  BuildIndexEntry,
  FlaskChoice,
  GateResult,
} from '../core/builds/types.ts';
import { BUILD_VERSION, BUILDS } from '../meta/builds.ts';
import InventoryPanel from './InventoryPanel.tsx';
import TreeThumbnail from './TreeThumbnail.tsx';
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
  if (checkpoint === 'act5' || checkpoint === 'act10') return 'leveling';
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

function n(value: number): string {
  return value.toLocaleString('en-US');
}

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

function statusLabel(status: BuildIndexEntry['status']): string {
  return status === 'verified' ? 'verified' : status === 'rejected' ? 'rejected' : 'draft';
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
        className={`pointer-events-none absolute ${side} z-30 hidden w-64 max-w-[calc(100vw-2rem)] rounded-md border border-ink-600 bg-ink-950/95 p-2 text-left text-[11px] leading-snug text-zinc-300 shadow-xl group-hover:block group-focus-within:block ${position}`}
      >
        {label}
      </span>
    </span>
  );
}

function Flasks({ flasks }: { flasks: FlaskChoice[] }) {
  return (
    <ul className="mt-2 space-y-1 text-sm text-zinc-300">
      {flasks.map((flask) => (
        <li key={flask.name}>
          <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            {flask.slot}
          </span>{' '}
          <Tooltip label={flask.note ?? flask.name}>
            <span className="border-b border-dotted border-zinc-600">{flask.name}</span>
          </Tooltip>
        </li>
      ))}
    </ul>
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
  const showFlasks = gate?.flasks ?? build.flasks?.[flaskStep(step)];
  // A guide step is a leveling bracket: show the gems you level with at that
  // step, so there is no separate "leveling" section repeating the same thing.
  const bracket =
    build.leveling.brackets.find(
      (entry) => gate !== undefined && entry.until >= gate.level,
    ) ?? build.leveling.brackets.at(-1);

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-5 py-10 sm:px-8">
      <div className="lg:grid lg:grid-cols-[1fr_13rem] lg:gap-8">
      <div className="flex flex-col gap-8">
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

      {gate && (
        <section aria-labelledby="gates">
          <h2 id="gates" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Gate report
          </h2>
          <p className="mt-1 text-[11px] text-zinc-600">
            {pipeline?.calibrated ? 'Calibrated gates' : 'Gates are not calibrated yet'} · PoB{' '}
            {pipeline?.pobRef ?? 'unknown'} · tree {pipeline?.treeVersion ?? 'unknown'}
          </p>
          <article
            className={
              gate.pass
                ? 'mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3'
                : 'mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3'
            }
          >
            <p className="text-[11px] text-zinc-400">
              level {gate.level} · {gate.budget}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-300 sm:grid-cols-5">
              <div>
                <dt className="text-zinc-500">damage</dt>
                <dd>{dps(gate.metrics.dps)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">life</dt>
                <dd>{n(gate.metrics.life)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">EHP</dt>
                <dd>{n(gate.metrics.ehp)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">max hit</dt>
                <dd>{n(gate.metrics.maxHit)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">resists</dt>
                <dd>{gate.metrics.resists.map((value: number) => `${value}%`).join(' / ')}</dd>
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
            slot for its mods.
          </p>
          <div className="mt-3">
            <InventoryPanel gear={gate.gear} />
          </div>
        </section>
      )}

      {bracket && (
        <section aria-labelledby="leveling">
          <h2
            id="leveling"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
          >
            Leveling this step
          </h2>
          <p className="mt-2 text-sm text-zinc-300">
            {bracket.skills.map((skill, index) => (
              <span key={skill}>
                {index > 0 && <span className="text-zinc-600"> · </span>}
                <a
                  href={wikiUrl(skill)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline-offset-2 hover:underline"
                >
                  {skill}
                </a>
              </span>
            ))}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
            Play these until level {bracket.until}
            {bracket.until < 100 ? ', then move to the next step' : ' — the endgame step.'}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            <a
              href={`./index.html${builderHash}`}
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
                                  level {gem.level} · {index === 0 ? 'main skill' : 'support'}
                                </span>
                                {gem.level > 20 && (
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
                                {build.gemInfo?.[gem.name] && (
                                  <span className="mt-1 block text-zinc-500">
                                    {build.gemInfo[gem.name].quest
                                      ? build.gemInfo[gem.name].free
                                        ? `Quest reward · ${build.gemInfo[gem.name].quest?.quest}`
                                        : `Vendor after ${build.gemInfo[gem.name].quest?.quest}`
                                      : `Unlocks at character level ${build.gemInfo[gem.name].requiredLevel}`}
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
                              {gem.level > 20 && (
                                <span className="ml-1 rounded bg-amber-500/20 px-1 text-[9px] uppercase tracking-wide text-amber-300">
                                  Vaaled
                                </span>
                              )}
                              {gem.maxLevel && (
                                <span className="ml-1 text-[9px] text-amber-300">
                                  max {gem.maxLevel}
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

      {showFlasks && (
        <section aria-labelledby="flasks">
          <h2 id="flasks" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Flasks at {step}
          </h2>
          <div className="mt-3 max-w-sm rounded-lg border border-ink-700 bg-ink-900/40 p-3">
            <Flasks flasks={showFlasks} />
          </div>
        </section>
      )}

      <section aria-labelledby="ascendancy">
        <h2 id="ascendancy" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Ascendancy
        </h2>
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {build.ascendancyOrder.map((point, index) => (
            <li
              key={point.node}
              className="rounded-lg border border-ink-700 bg-ink-900/40 p-3"
            >
              <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                point {index + 1}
              </span>
              <a
                href={wikiUrl(titleCase(point.node))}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 block text-sm text-zinc-200 underline-offset-2 hover:underline"
              >
                {titleCase(point.node)}
              </a>
              <span className="mt-1 block text-[10px] text-zinc-500">
                {point.lab === 1 ? 'first lab' : `${point.lab}th lab`}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pantheon">
        <h2 id="pantheon" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Pantheon
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <article className="rounded-lg border border-ink-700 bg-ink-900/40 p-3">
            <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              major god
            </span>
            <a
              href={wikiUrl(titleCase(build.pantheon.major))}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 block text-sm text-zinc-200 underline-offset-2 hover:underline"
            >
              {titleCase(build.pantheon.major)}
            </a>
          </article>
          <article className="rounded-lg border border-ink-700 bg-ink-900/40 p-3">
            <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              minor god
            </span>
            <a
              href={wikiUrl(titleCase(build.pantheon.minor))}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 block text-sm text-zinc-200 underline-offset-2 hover:underline"
            >
              {titleCase(build.pantheon.minor)}
            </a>
          </article>
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          Bandit: <span className="text-zinc-200">{build.bandit}</span>
        </p>
        {build.pantheon.note && (
          <p className="mt-1 text-xs text-zinc-500">{build.pantheon.note}</p>
        )}
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

      <aside className="order-first mb-6 lg:order-none lg:mb-0">
        <nav
          aria-label="On this page"
          className="lg:sticky lg:top-8 lg:mt-2 text-xs text-zinc-500"
        >
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            On this page
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 lg:flex-col lg:gap-y-2">
            {[
              ['steps', 'Step'],
              ['gates', 'Gate report'],
              ['tree', 'Passive tree'],
              ['gear', 'Gear'],
              ['gems', 'Gems'],
              ['leveling', 'Leveling this step'],
              ['flasks', 'Flasks'],
              ['ascendancy', 'Ascendancy'],
              ['pantheon', 'Pantheon'],
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
  );
}
