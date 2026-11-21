import { useMemo, useState } from 'react';
import {
  generateFilter,
  SECTION_KEYS,
  type Sections,
} from '../core/filter/generate.ts';
import {
  STRICTNESS_LABELS_PUBLIC,
  STRICTNESS_ORDER,
  type Phase,
} from '../core/filter/presets.ts';
import { getAscendancy } from '../meta/ascendancies.ts';
import { FAMILIES, getFamily } from '../meta/families.ts';
import {
  getAscendanciesForSkill,
  getSkill,
  getSkills,
  getSnapshot,
  LEAGUE_INDEX,
} from '../meta/index.ts';
import { APP_VERSION } from '../version.ts';
import FilterPreview from './FilterPreview.tsx';
import InventoryPreview from './preview/InventoryPreview.tsx';
import { copyText, downloadFilter } from './download.ts';
import { useWizardState } from './useWizardState.ts';
import { wizardHash } from './wizardState.ts';

const PHASES: { id: Phase; label: string; hint: string }[] = [
  { id: 'leveling', label: 'Leveling', hint: 'Acts and early maps' },
  { id: 'endgame', label: 'Endgame', hint: 'Geared character' },
];

const SECTION_META: Record<keyof Sections, { label: string; hint: string }> = {
  gear: { label: 'Build gear', hint: 'Rare and magic bases for your slots' },
  gems: { label: 'Gems', hint: 'Quality gems worth picking up' },
  currency: { label: 'Currency', hint: 'Orbs, shards and divination cards' },
  maps: { label: 'Maps & fragments', hint: 'Map tiers and fragments' },
  uniques: { label: 'Uniques', hint: 'All uniques, chase items louder' },
};

type Copied = 'filter' | 'link' | null;

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export default function Wizard() {
  const [state, update] = useWizardState();
  const [copied, setCopied] = useState<Copied>(null);

  const filter = useMemo(
    () =>
      generateFilter({
        selection: state,
        phase: state.phase,
        strictness: state.strictness,
        sections: state.sections,
        version: APP_VERSION,
      }),
    [state],
  );

  const snapshot = getSnapshot(state.leagueId);
  const family = getFamily(state.familyId);
  const familySkills = getSkills(state.leagueId, state.familyId);
  const skill = getSkill(state.leagueId, state.skillId) ?? familySkills[0]!;
  const ascendancies = getAscendanciesForSkill(skill);
  const ascendancy = getAscendancy(state.ascendancyId);

  const copy = async (kind: Exclude<Copied, null>) => {
    const url = new URL(window.location.href);
    url.hash = wizardHash(state);
    const text = kind === 'filter' ? filter.text : url.toString();
    if (await copyText(text)) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8 pb-28 sm:px-8 sm:py-12 lg:pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-400">
            Path of Exile 1 <span className="text-zinc-600">/</span>{' '}
            <span className="text-zinc-500">v{APP_VERSION}</span>
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            FilterPath
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Pick a family, a skill and an ascendancy. Get a filter that
            highlights what the build needs.
          </p>
        </div>
        <nav className="flex items-center gap-4 text-xs text-zinc-500">
          <a
            href="./changelog.html"
            className="underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            changelog
          </a>
          <a
            href="https://github.com/lordgreg/filterpath"
            className="underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            source
          </a>
        </nav>
      </header>

      <main className="mt-8 flex-1 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0 space-y-7">
          <section aria-labelledby="league-heading">
            <h2
              id="league-heading"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
            >
              League
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <select
                value={state.leagueId}
                onChange={(event) => update({ leagueId: event.target.value })}
                className="rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold-400"
              >
                {LEAGUE_INDEX.leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                Meta captured {snapshot.capturedAt.slice(0, 10)} from{' '}
                <a
                  href={snapshot.source}
                  className="underline underline-offset-2 hover:text-zinc-300"
                >
                  poe.ninja builds
                </a>
                .
              </p>
            </div>
          </section>

          <section aria-labelledby="family-heading">
            <h2
              id="family-heading"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
            >
              1. Family
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {FAMILIES.map((entry) => {
                const selected = entry.id === state.familyId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update({ familyId: entry.id })}
                    className={cx(
                      'rounded-lg border px-3 py-2.5 text-left transition-colors',
                      selected
                        ? 'border-gold-400 bg-gold-400/10'
                        : 'border-ink-700 bg-ink-800/40 hover:border-ink-500 hover:bg-ink-800/80',
                    )}
                  >
                    <span className="block text-sm font-medium text-white">
                      {entry.name}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                      {entry.summary}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="skill-heading">
            <h2
              id="skill-heading"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
            >
              2. Skill
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {familySkills.map((entry) => {
                const selected = entry.id === state.skillId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update({ skillId: entry.id })}
                    className={cx(
                      'rounded-lg border px-3 py-2.5 text-left transition-colors',
                      selected
                        ? 'border-gold-400 bg-gold-400/10'
                        : 'border-ink-700 bg-ink-800/40 hover:border-ink-500',
                    )}
                  >
                    <span className="block text-sm font-medium text-white">
                      {entry.name}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span>
                        {entry.playShare !== undefined
                          ? `${entry.playShare}% of snapshot`
                          : 'Meta pick'}
                      </span>
                      {!entry.leveling && (
                        <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                          endgame
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="ascendancy-heading">
            <h2
              id="ascendancy-heading"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
            >
              3. Ascendancy
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ascendancies.map((entry) => {
                const selected = entry.id === state.ascendancyId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update({ ascendancyId: entry.id })}
                    className={cx(
                      'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      selected
                        ? 'border-gold-400 bg-gold-400/10 text-white'
                        : 'border-ink-700 bg-ink-800/40 text-zinc-300 hover:border-ink-500',
                    )}
                  >
                    <span className="block">{entry.name}</span>
                    <span className="block text-[11px] text-zinc-500">
                      {entry.class}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="phase-heading">
            <h2
              id="phase-heading"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
            >
              Phase
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {PHASES.map((phase) => {
                const selected = phase.id === state.phase;
                return (
                  <button
                    key={phase.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update({ phase: phase.id })}
                    className={cx(
                      'rounded-lg border px-3 py-2.5 text-left transition-colors',
                      selected
                        ? 'border-gold-400 bg-gold-400/10'
                        : 'border-ink-700 bg-ink-800/40 hover:border-ink-500',
                    )}
                  >
                    <span className="block text-sm font-medium text-white">
                      {phase.label}
                    </span>
                    <span className="text-xs text-zinc-500">{phase.hint}</span>
                  </button>
                );
              })}
            </div>

            {!skill.leveling && state.phase === 'leveling' && (
              <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {skill.name} is an endgame build.{' '}
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => update({ phase: 'endgame' })}
                >
                  Switch to Endgame
                </button>
              </p>
            )}
          </section>

          <section aria-labelledby="strictness-heading">
            <h2
              id="strictness-heading"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
            >
              Strictness
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {STRICTNESS_ORDER.map((strictness) => {
                const selected = strictness === state.strictness;
                return (
                  <button
                    key={strictness}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update({ strictness })}
                    className={cx(
                      'rounded-lg border px-3 py-2 text-sm transition-colors',
                      selected
                        ? 'border-gold-400 bg-gold-400/10 text-white'
                        : 'border-ink-700 bg-ink-800/40 text-zinc-300 hover:border-ink-500',
                    )}
                  >
                    {STRICTNESS_LABELS_PUBLIC[strictness]}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="sections-heading">
            <h2
              id="sections-heading"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
            >
              Sections
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SECTION_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-700 bg-ink-800/40 px-3 py-2.5 hover:border-ink-500"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-gold-400"
                    checked={state.sections[key]}
                    onChange={() =>
                      update({
                        sections: {
                          ...state.sections,
                          [key]: !state.sections[key],
                        },
                      })
                    }
                  />
                  <span>
                    <span className="block text-sm text-zinc-200">
                      {SECTION_META[key].label}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {SECTION_META[key].hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-8">
          <section className="min-w-0 rounded-xl border border-gold-400/25 bg-ink-800/70 p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold-400">
              {ascendancy.class} / {family.name}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              {ascendancy.name} {skill.name}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              {filter.archetype.summary}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                {snapshot.league.name}
              </span>
              <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                {family.name}
              </span>
              <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                {state.phase === 'leveling' ? 'Leveling' : 'Endgame'}
              </span>
              <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                {STRICTNESS_LABELS_PUBLIC[state.strictness]}
              </span>
              <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                {filter.ruleCount} rules
              </span>
              <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                {filter.baseTypeCount} base types
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <button
                type="button"
                onClick={() => downloadFilter(filter.fileName, filter.text)}
                className="rounded-lg bg-gold-400 px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-300"
              >
                Download .filter
              </button>
              <button
                type="button"
                onClick={() => void copy('filter')}
                className="rounded-lg border border-ink-600 bg-ink-900/70 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:border-ink-500"
              >
                {copied === 'filter' ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => void copy('link')}
                className="rounded-lg px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                {copied === 'link' ? 'Link copied' : 'Share link'}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              Share links keep league, family, skill, ascendancy, phase,
              strictness and sections.
            </p>
            <p className="mt-3 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
              In-game name:{' '}
              <span className="break-words font-medium text-zinc-200">
                {filter.fileName.replace(/\.filter$/, '')}
              </span>
            </p>
          </section>
        </div>
        </div>

        <InventoryPreview rules={filter.rules} archetype={filter.archetype} />

        <FilterPreview
          text={filter.text}
          fileName={filter.fileName}
          ruleCount={filter.ruleCount}
          baseTypeCount={filter.baseTypeCount}
          warnings={filter.warnings}
        />

        <details className="rounded-xl border border-ink-700 bg-ink-800/40 p-4 text-sm">
          <summary className="cursor-pointer text-zinc-200">
            How to install
          </summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-zinc-400">
            <li>Download the file.</li>
            <li>
              Put it in{' '}
              <code className="rounded bg-ink-900 px-1 py-0.5 text-zinc-300">
                Documents/My Games/Path of Exile
              </code>
              . On Linux/Proton that is{' '}
              <code className="rounded bg-ink-900 px-1 py-0.5 text-zinc-300">
                compatdata/238960/pfx/drive_c/users/steamuser/Documents/My
                Games/Path of Exile
              </code>
              .
            </li>
            <li>
              In game: Options → UI → Item Filter, then pick{' '}
              <span className="text-zinc-300">FilterPath</span>.
            </li>
          </ol>
          <p className="mt-3 text-xs text-zinc-500">
            Online filters synced to your PoE account appear in the same
            dropdown but are separate files. The entry must start with{' '}
            <span className="text-zinc-300">FilterPath-v</span>.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Seeing items that should be hidden? Check which filter is selected;
            another filter can still be active.
          </p>
        </details>
      </main>

      <footer className="mt-12 border-t border-ink-700 pt-5 text-xs leading-relaxed text-zinc-500">
        <p>
          This product isn't affiliated with or endorsed by Grinding Gear Games
          in any way.
        </p>
        <p className="mt-1">
          Base item data from RePoE. Meta snapshots and prices from poe.ninja.
        </p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-700 bg-ink-900/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-100">
              {ascendancy.name} {skill.name}
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              {state.phase === 'leveling' ? 'Leveling' : 'Endgame'} -{' '}
              {STRICTNESS_LABELS_PUBLIC[state.strictness]} - {filter.ruleCount}{' '}
              rules
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadFilter(filter.fileName, filter.text)}
            className="shrink-0 rounded-lg bg-gold-400 px-4 py-2 text-sm font-semibold text-ink-950"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}