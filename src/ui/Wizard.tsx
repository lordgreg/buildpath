import { useEffect, useMemo, useState } from 'react';
import {
  generateFilter,
} from '../core/filter/generate.ts';
import {
  STRICTNESS_LABELS_PUBLIC,
  STRICTNESS_ORDER,
  type Phase,
} from '../core/filter/presets.ts';
import { cloneKey, createClone, type RuleClone } from '../core/rules/clone.ts';
import type { Rule } from '../core/filter/types.ts';
import { THEMES } from '../core/filter/themes.ts';
import { ASCENDANCIES, getAscendancy } from '../meta/ascendancies.ts';
import { FAMILIES, getFamily } from '../meta/families.ts';
import {
  getAscendanciesForSkill,
  getSkill,
  getSkills,
  getSnapshot,
  LEAGUE_INDEX,
  PRESET_VERSION,
} from '../meta/index.ts';
import type { BuildMode } from '../meta/types.ts';
import { APP_VERSION } from '../version.ts';
import { decodeShare } from '../core/share/codec.ts';
import FilterPreview from './FilterPreview.tsx';
import AdvancedRules from './rules/AdvancedRules.tsx';
import SavedBuilds from './presets/SavedBuilds.tsx';
import FolderSync from './sync/FolderSync.tsx';
import {
  deleteClone,
  loadClone,
  saveClone,
} from './rules/storage.ts';
import { copyText, downloadFilter } from './download.ts';
import { useWizardState } from './useWizardState.ts';
import { wizardHash } from './wizardState.ts';

const PHASES: { id: Phase; label: string; hint: string }[] = [
  { id: 'leveling', label: 'Leveling', hint: 'Acts and early maps' },
  { id: 'endgame', label: 'Endgame', hint: 'Geared character' },
];

const MODES: { id: BuildMode; label: string; hint: string }[] = [
  { id: 'family', label: 'By family', hint: 'Basic gear profile' },
  { id: 'ascendancy', label: 'By ascendancy', hint: 'Class default loadout' },
  { id: 'meta', label: 'By meta build', hint: 'poe.ninja snapshot' },
];

const CLASS_ORDER = [
  'Witch',
  'Templar',
  'Marauder',
  'Duelist',
  'Ranger',
  'Shadow',
  'Scion',
] as const;

type Copied = 'filter' | 'link' | null;

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

function OptionButton({
  selected,
  onClick,
  title,
  subtitle,
  compact = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'min-w-0 rounded-lg border px-3 text-left transition-colors',
        compact ? 'py-2' : 'py-2.5',
        selected
          ? 'border-gold-400 bg-gold-400/10 text-white'
          : 'border-ink-700 bg-ink-800/40 text-zinc-300 hover:border-ink-500',
      )}
    >
      <span className="block text-sm font-medium leading-tight">{title}</span>
      {subtitle && (
        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-zinc-500">
          {subtitle}
        </span>
      )}
    </button>
  );
}

export default function Wizard() {
  const [state, update] = useWizardState();
  const [copied, setCopied] = useState<Copied>(null);
  const activeKey = cloneKey(
    state,
    state.phase,
    state.strictness,
    state.sections,
    state.theme,
  );
  const [clone, setClone] = useState<RuleClone | null>(() =>
    loadClone(activeKey),
  );

  useEffect(() => {
    setClone(loadClone(activeKey));
  }, [activeKey]);

  const baseFilter = useMemo(
    () =>
      generateFilter({
        selection: state,
        phase: state.phase,
        strictness: state.strictness,
        theme: state.theme,
        sections: state.sections,
        version: APP_VERSION,
      }),
    [state],
  );

  const filter = useMemo(
    () =>
      clone
        ? generateFilter({
            selection: state,
            phase: state.phase,
            strictness: state.strictness,
                theme: state.theme,
            sections: state.sections,
            version: APP_VERSION,
            rulesOverride: clone.rules,
          })
        : baseFilter,
    [state, clone, baseFilter],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const code = params.get('code');
    if (!code) return;
    let cancelled = false;
    void decodeShare(code)
      .then((payload) => {
        if (cancelled) return;
        const next = createClone({
          key: activeKey,
          label: baseFilter.archetype.name,
          presetVersion: PRESET_VERSION,
          rules: payload.rules,
        });
        saveClone(next);
        setClone(next);
        params.delete('code');
        const hash = params.toString();
        window.history.replaceState(null, '', hash ? `#${hash}` : '#');
      })
      .catch(() => {
        // Ignore malformed codes; the builder keeps working.
      });
    return () => {
      cancelled = true;
    };
  }, [activeKey, baseFilter.archetype.name]);

  const snapshot = getSnapshot(state.leagueId);
  const family = getFamily(state.familyId);
  const ascendancy = getAscendancy(state.ascendancyId);
  const familySkills = getSkills(state.leagueId, state.familyId);
  const skill =
    getSkill(state.leagueId, state.skillId) ?? familySkills[0] ?? null;
  const metaAscendancies = skill ? getAscendanciesForSkill(skill) : [];

  const copy = async (kind: Exclude<Copied, null>) => {
    const url = new URL(window.location.href);
    url.hash = wizardHash(state);
    const text = kind === 'filter' ? filter.text : url.toString();
    if (await copyText(text)) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleClone = () => {
    const next = createClone({
      key: activeKey,
      label: baseFilter.archetype.name,
      presetVersion: PRESET_VERSION,
      rules: baseFilter.rules,
    });
    saveClone(next);
    setClone(next);
  };

  const handleCloneChange = (next: RuleClone) => {
    saveClone(next);
    setClone(next);
  };

  const handleCloneReset = () => {
    deleteClone(activeKey);
    setClone(null);
  };

  const handleImportRules = (rules: Rule[]) => {
    const next = createClone({
      key: activeKey,
      label: baseFilter.archetype.name,
      presetVersion: PRESET_VERSION,
      rules,
    });
    saveClone(next);
    setClone(next);
  };

  const title =
    state.mode === 'meta' && skill
      ? `${ascendancy.name} ${skill.name}`
      : filter.archetype.name;
  const eyebrow =
    state.mode === 'family'
      ? 'Family preset'
      : state.mode === 'ascendancy'
        ? `${ascendancy.class} / Ascendancy`
        : `${ascendancy.class} / ${family.name}`;

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
            Pick a build one way, tune the phases and strictness, then inspect
            exactly what the filter will show.
          </p>
        </div>
        <nav className="flex items-center gap-4 text-xs text-zinc-500">
          <a
            href={`./demo.html#${wizardHash(state)}`}
            className="underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            demo
          </a>
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
            <section aria-label="Selection mode">
              <div className="grid grid-cols-3 gap-2" role="tablist">
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    role="tab"
                    aria-selected={state.mode === mode.id}
                    onClick={() => update({ mode: mode.id })}
                    className={cx(
                      'rounded-lg border px-2 py-2.5 text-left transition-colors',
                      state.mode === mode.id
                        ? 'border-gold-400 bg-gold-400/10'
                        : 'border-ink-700 bg-ink-800/40 hover:border-ink-500',
                    )}
                  >
                    <span className="block text-sm font-medium text-white">
                      {mode.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-zinc-500">
                      {mode.hint}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <SavedBuilds state={state} onLoad={(saved) => update(saved)} />

            {state.mode === 'family' && (
              <section aria-labelledby="family-heading">
                <h2
                  id="family-heading"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                >
                  1. Family
                </h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {FAMILIES.map((entry) => (
                    <OptionButton
                      key={entry.id}
                      selected={entry.id === state.familyId}
                      onClick={() => update({ familyId: entry.id })}
                      title={entry.name}
                      subtitle={entry.summary}
                    />
                  ))}
                </div>
              </section>
            )}

            {state.mode === 'ascendancy' && (
              <section aria-labelledby="ascendancy-pick-heading">
                <h2
                  id="ascendancy-pick-heading"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                >
                  1. Ascendancy
                </h2>
                {CLASS_ORDER.map((className) => {
                  const entries = ASCENDANCIES.filter(
                    (entry) => entry.class === className,
                  );
                  return (
                    <div key={className} className="mt-4">
                      <h3 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-zinc-600">
                        {className}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {entries.map((entry) => (
                          <OptionButton
                            key={entry.id}
                            compact
                            selected={entry.id === state.ascendancyId}
                            onClick={() => update({ ascendancyId: entry.id })}
                            title={entry.name}
                            subtitle={getFamily(entry.defaultFamily).name}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {state.mode === 'meta' && (
              <>
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
                      onChange={(event) =>
                        update({ leagueId: event.target.value })
                      }
                      className="rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold-400"
                    >
                      {LEAGUE_INDEX.leagues.map((league) => (
                        <option key={league.id} value={league.id}>
                          {league.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-zinc-500">
                      Captured {snapshot.capturedAt.slice(0, 10)} from{' '}
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

                <section aria-labelledby="skill-heading">
                  <h2
                    id="skill-heading"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    1. Skill
                  </h2>
                  {FAMILIES.map((familyEntry) => {
                    const skills = getSkills(state.leagueId, familyEntry.id);
                    if (skills.length === 0) return null;
                    return (
                      <div key={familyEntry.id} className="mt-4">
                        <h3 className="mb-2 text-[11px] uppercase tracking-[0.18em] text-zinc-600">
                          {familyEntry.name}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {skills.map((entry) => (
                            <OptionButton
                              key={entry.id}
                              compact
                              selected={entry.id === state.skillId}
                              onClick={() => update({ skillId: entry.id })}
                              title={entry.name}
                              subtitle={
                                entry.playShare !== undefined
                                  ? `${entry.playShare}% of snapshot`
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>

                <section aria-labelledby="meta-ascendancy-heading">
                  <h2
                    id="meta-ascendancy-heading"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    2. Ascendancy
                  </h2>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {metaAscendancies.map((entry) => (
                      <OptionButton
                        key={entry.id}
                        compact
                        selected={entry.id === state.ascendancyId}
                        onClick={() => update({ ascendancyId: entry.id })}
                        title={entry.name}
                        subtitle={[
                        skill?.ascendancyShares?.[entry.id] !== undefined
                          ? `${skill.ascendancyShares[entry.id]}% of builds`
                          : null,
                        entry.class,
                      ]
                        .filter(Boolean)
                        .join(' - ')}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}

            <section aria-labelledby="phase-heading">
              <h2
                id="phase-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
              >
                Phase
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {PHASES.map((phase) => (
                  <button
                    key={phase.id}
                    type="button"
                    aria-pressed={phase.id === state.phase}
                    onClick={() => update({ phase: phase.id })}
                    className={cx(
                      'rounded-lg border px-3 py-2.5 text-left transition-colors',
                      phase.id === state.phase
                        ? 'border-gold-400 bg-gold-400/10'
                        : 'border-ink-700 bg-ink-800/40 hover:border-ink-500',
                    )}
                  >
                    <span className="block text-sm font-medium text-white">
                      {phase.label}
                    </span>
                    <span className="text-xs text-zinc-500">{phase.hint}</span>
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="strictness-heading">
              <h2
                id="strictness-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
              >
                Strictness
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {STRICTNESS_ORDER.map((strictness) => (
                  <button
                    key={strictness}
                    type="button"
                    aria-pressed={strictness === state.strictness}
                    onClick={() => update({ strictness })}
                    className={cx(
                      'rounded-lg border px-3 py-2 text-sm transition-colors',
                      strictness === state.strictness
                        ? 'border-gold-400 bg-gold-400/10 text-white'
                        : 'border-ink-700 bg-ink-800/40 text-zinc-300 hover:border-ink-500',
                    )}
                  >
                    {STRICTNESS_LABELS_PUBLIC[strictness]}
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="theme-heading">
              <h2
                id="theme-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
              >
                Theme
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    aria-pressed={theme.id === state.theme}
                    onClick={() => update({ theme: theme.id })}
                    className={cx(
                      'rounded-lg border px-2 py-2 text-left transition-colors',
                      theme.id === state.theme
                        ? 'border-gold-400 bg-gold-400/10'
                        : 'border-ink-700 bg-ink-800/40 hover:border-ink-500',
                    )}
                  >
                    <span className="block text-sm font-medium text-white">
                      {theme.label}
                    </span>
                    <span className="block text-[10px] leading-tight text-zinc-500">
                      {theme.hint}
                    </span>
                  </button>
                ))}
              </div>
            </section>

          </div>

          <section className="min-w-0 rounded-xl border border-gold-400/25 bg-ink-800/70 p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold-400">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              {filter.archetype.summary}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                {MODES.find((mode) => mode.id === state.mode)?.label}
              </span>
              {state.mode !== 'family' && (
                <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                  {family.name}
                </span>
              )}
              {state.mode === 'meta' && (
                <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                  {snapshot.league.name}
                </span>
              )}
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
              {clone && (
                <span className="rounded-full border border-gold-400/50 px-2 py-0.5 text-gold-300">
                  custom rules
                </span>
              )}
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
                {copied === 'filter' ? 'Copied' : 'Copy filter'}
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
              Share links keep mode, selection, phase, strictness and sections.
            </p>
            <p className="mt-3 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
              In-game name:{' '}
              <span className="break-words font-medium text-zinc-200">
                {filter.fileName.replace(/\.filter$/, '')}
              </span>
            </p>
            <a
              href={`./demo.html#${wizardHash(state)}`}
              className="mt-2 block rounded-lg border border-ink-600 px-4 py-2 text-center text-sm text-zinc-300 transition-colors hover:border-ink-500 hover:text-white"
            >
              Open loot simulator
            </a>
          </section>
        </div>

        <FolderSync
          fileName={filter.fileName}
          text={filter.text}
          appVersion={APP_VERSION}
        />

        <AdvancedRules
          baseRules={baseFilter.rules}
          clone={clone}
          presetVersion={PRESET_VERSION}
          onClone={handleClone}
          onChange={handleCloneChange}
          onReset={handleCloneReset}
          onImportRules={handleImportRules}
        />

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
            <p className="truncate text-xs font-medium text-zinc-100">{title}</p>
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