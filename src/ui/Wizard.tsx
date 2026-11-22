import { useEffect, useMemo, useRef, useState } from 'react';
import { generateFilter } from '../core/filter/generate.ts';
import {
  STRICTNESS_LABELS_PUBLIC,
  STRICTNESS_ORDER,
  type Phase,
} from '../core/filter/presets.ts';
import { configKey } from '../core/rules/key.ts';
import { filterUpdateKind } from '../sync/fileSystem.ts';
import { autoBuildName } from '../core/filter/name.ts';
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
import { decodeShare, encodeShare } from '../core/share/codec.ts';
import FilterPreview from './FilterPreview.tsx';
import ThemePreview from './demo/ThemePreview.tsx';
import AdvancedRules, { type RulePrefill } from './rules/AdvancedRules.tsx';
import SaveBuildPanel from './save/SaveBuildPanel.tsx';
import FolderGuidance from './save/FolderGuidance.tsx';
import { useFiltersFolder } from './save/useFiltersFolder.ts';
import { discardLegacyBuilds, type SavedBuild } from './presets/storage.ts';
import { buildHash } from './buildSnapshot.ts';
import {
  discardLegacyClones,
  loadCustomRules,
  saveCustomRules,
} from './rules/storage.ts';
import { copyText, downloadFilter } from './download.ts';
import { useWizardState } from './useWizardState.ts';
import {
  coerceWizardState,
  DEFAULT_STATE,
  wizardHash,
  type WizardState,
} from './wizardState.ts';

const PHASES: { id: Phase; label: string; hint: string }[] = [
  { id: 'leveling', label: 'Leveling', hint: 'Acts and early maps' },
  { id: 'endgame', label: 'Endgame', hint: 'Geared character' },
];

const MODES: { id: BuildMode; label: string; hint: string }[] = [
  { id: 'family', label: 'By family', hint: 'Basic gear profile' },
  { id: 'ascendancy', label: 'By ascendancy', hint: 'Class default loadout' },
  { id: 'meta', label: 'By meta build', hint: 'Curated meta seed' },
  { id: 'scratch', label: 'From scratch', hint: 'Blank filter, your rules' },
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

type Copied = 'code' | 'link' | null;

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
  const activeKey = configKey(state);
  const [customRules, setCustomRules] = useState<Rule[]>(() =>
    loadCustomRules(activeKey),
  );
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const autoName = autoBuildName(state);
  const folder = useFiltersFolder();
  const autoSyncedRef = useRef<string | null>(null);
  const filenameNoticeRef = useRef<string | null>(null);

  useEffect(() => {
    setCustomRules(loadCustomRules(activeKey));
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
        buildName: state.name,
      }),
    [state],
  );

  const filter = useMemo(
    () =>
      generateFilter({
        selection: state,
        phase: state.phase,
        strictness: state.strictness,
        theme: state.theme,
        sections: state.sections,
        version: APP_VERSION,
        customRules,
        buildName: state.name,
      }),
    [state, customRules],
  );

  const currentHash = buildHash(state, customRules);
  const [savedHash, setSavedHash] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() => {
    const clones = discardLegacyClones();
    const builds = discardLegacyBuilds();
    return clones || builds
      ? 'Old whole-set clones and saved builds were discarded. Presets now regenerate; re-save your build to keep its My rules.'
      : null;
  });

  useEffect(() => {
    if (savedHash === null) setSavedHash(currentHash);
  }, [savedHash, currentHash]);

  const dirty = savedHash !== null && currentHash !== savedHash;

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const snapshot = getSnapshot(state.leagueId);
  const seed = snapshot.provenance === 'seed';
  const family = getFamily(state.familyId);
  const ascendancy = getAscendancy(state.ascendancyId);
  const familySkills = getSkills(state.leagueId, state.familyId);
  const skill =
    getSkill(state.leagueId, state.skillId) ?? familySkills[0] ?? null;
  const metaAscendancies = skill ? getAscendanciesForSkill(skill) : [];

  const makePayload = () => ({
    v: 1 as const,
    label: filter.archetype.name,
    presetVersion: PRESET_VERSION,
    state,
    customRules,
  });

  const copyCode = async () => {
    const { code } = await encodeShare(makePayload());
    if (code.length > 64_000) {
      setNotice('Code is too large to copy; use Download instead.');
      return;
    }
    if (await copyText(code)) {
      setCopied('code');
      setNotice('Build code copied. Paste it into Import code.');
      window.setTimeout(() => setCopied(null), 2000);
    }
  };

  const shareLink = async () => {
    const { code, tooLarge } = await encodeShare(makePayload());
    if (tooLarge) {
      setNotice('Code is too large for a link; use Download instead.');
      return;
    }
    const params = new URLSearchParams(wizardHash(state));
    params.set('code', code);
    const url = new URL(window.location.href);
    url.hash = params.toString();
    if (await copyText(url.toString())) {
      setCopied('link');
      setNotice('Share link copied. Opening it restores the build.');
      window.setTimeout(() => setCopied(null), 2000);
    }
  };

  const changeCustomRules = (rules: Rule[]) => {
    saveCustomRules(activeKey, rules);
    setCustomRules(rules);
  };

  const resetBuild = () => {
    if (
      dirty &&
      !window.confirm('Discard unsaved changes and reset the filter?')
    ) {
      return;
    }
    const next = { ...DEFAULT_STATE };
    saveCustomRules(activeKey, []);
    saveCustomRules(configKey(next), []);
    update(next);
    setCustomRules([]);
    setActiveBuildId(null);
    setSavedHash(buildHash(next, []));
    setNotice('Filter reset.');
  };

  const download = async () => {
    if (folder.handle) {
      const result = await folder.write(filter.fileName, filter.text, true);
      if (result.ok) {
        setSavedHash(currentHash);
        setNotice(result.message);
        return;
      }
      if (result.cancelled) {
        setNotice(result.message);
        return;
      }
      setNotice(`${result.message} Downloading instead.`);
    }
    downloadFilter(filter.fileName, filter.text);
    // Writing the .filter counts as saving, so the "unsaved changes" badge clears.
    setSavedHash(currentHash);
  };

  useEffect(() => {
    if (!folder.handle) return;
    const existing = folder.files.find(
      (file) => file.name === filter.fileName,
    );
    if (!existing) return;

    const updateKind = filterUpdateKind(existing, APP_VERSION, PRESET_VERSION);
    if (!updateKind) return;

    const key = `${filter.fileName}:${existing.presetVersion ?? 'legacy'}:${existing.appVersion ?? 'legacy'}`;
    if (autoSyncedRef.current === key) return;

    if (folder.permission !== 'granted') {
      setNotice(
        `Your filter is using an older version. Grant folder access or Save to update ${filter.fileName}.`,
      );
      return;
    }

    autoSyncedRef.current = key;
    void folder.write(filter.fileName, filter.text, false).then((result) => {
      setNotice(
        result.ok
          ? updateKind === 'presets'
            ? 'Your filter was updated with the latest presets.'
            : 'Your filter was updated to the latest version.'
          : `Could not update ${filter.fileName}. ${result.message}`,
      );
    });
  }, [
    filter.fileName,
    filter.text,
    folder.files,
    folder.handle,
    folder.permission,
    folder.write,
  ]);

  useEffect(() => {
    if (!folder.handle || folder.files.length === 0) return;
    if (folder.files.some((file) => file.name === filter.fileName)) return;

    const base = filter.fileName.replace(/\.filter$/, '');
    const old = folder.files.find(
      (file) =>
        file.name.startsWith(`${base}-`) &&
        /-\d+\.\d+\.\d+\.filter$/.test(file.name),
    );
    if (!old) return;

    const key = `${filter.fileName}:${old.name}`;
    if (filenameNoticeRef.current === key) return;
    filenameNoticeRef.current = key;
    setNotice(
      `Filename changed. Download once to create ${filter.fileName}, then select it in-game; future updates sync automatically.`,
    );
  }, [filter.fileName, folder.files, folder.handle]);

  const loadBuild = (build: SavedBuild) => {
    const loaded = { ...coerceWizardState(build.state), name: build.name };
    const loadedKey = configKey(loaded);
    const rules = build.customRules ?? [];
    saveCustomRules(loadedKey, rules);
    update(loaded);
    setCustomRules(rules);
    setActiveBuildId(build.id);
    setSavedHash(buildHash(loaded, rules));
    setNotice(
      build.presetVersion === PRESET_VERSION
        ? `Loaded ${build.name}.`
        : `Loaded ${build.name}. Presets were refreshed to the latest version.`,
    );
  };

  const importCode = async (code: string): Promise<string | null> => {
    try {
      const payload = await decodeShare(code);
      const importedState = payload.state
        ? coerceWizardState(payload.state as Partial<WizardState>)
        : state;
      const rules = payload.customRules ?? payload.rules ?? [];
      saveCustomRules(configKey(importedState), rules);
      update(importedState);
      setCustomRules(rules);
      setActiveBuildId(null);
      setNotice(
        payload.presetVersion === PRESET_VERSION
          ? 'Imported build. Save it if you want to keep it locally.'
          : 'Imported build with the latest presets. Save it if you want to keep it locally.',
      );
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not read that code';
    }
  };

  const importRulesCode = async (code: string): Promise<string | null> => {
    try {
      const payload = await decodeShare(code);
      const rules = payload.customRules ?? payload.rules ?? [];
      changeCustomRules(rules);
      return `Imported ${rules.length} custom rule(s).`;
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not read that code';
    }
  };

  // Capture the code before the hash-sync effect rewrites the URL.
  const [initialCode] = useState(
    () =>
      new URLSearchParams(window.location.hash.slice(1)).get('code') ?? null,
  );

  // Deep links from the loot simulator: focus the deciding rule, or prefill a
  // new rule from the pasted item. Read once, before the hash rewrites.
  const [focusIndex] = useState(() => {
    const raw = new URLSearchParams(window.location.hash.slice(1)).get('rule');
    return raw !== null && /^\d+$/.test(raw) ? Number(raw) : undefined;
  });

  const [prefill] = useState<RulePrefill | undefined>(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const bases = params.get('newBase')?.trim();
    const classes = params.get('newClass')?.trim();
    const rarity = params.get('newRarity');
    const ilvl = params.get('newIlvl');
    if (!bases && !classes) return undefined;
    return {
      classes: classes ? [classes] : undefined,
      bases: bases || undefined,
      rarity:
        rarity === 'Normal' ||
        rarity === 'Magic' ||
        rarity === 'Rare' ||
        rarity === 'Unique'
          ? rarity
          : undefined,
      ilvlMin: ilvl && /^\d+$/.test(ilvl) ? ilvl : undefined,
    };
  });

  useEffect(() => {
    if (!initialCode) return;
    void importCode(initialCode).then(() => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      params.delete('code');
      const hash = params.toString();
      window.history.replaceState(null, '', hash ? `#${hash}` : '#');
    });
    // Deliberately runs once on mount; the payload carries its own selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title =
    state.mode === 'meta' && skill
      ? `${ascendancy.name} ${skill.name}`
      : filter.archetype.name;
  const eyebrow =
    state.mode === 'scratch'
      ? 'Custom filter'
      : state.mode === 'family'
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
            {dirty && (
              <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-amber-300">
                unsaved changes
              </span>
            )}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            <button
              type="button"
              onClick={resetBuild}
              title="Reset the filter"
              className="cursor-pointer transition-opacity hover:opacity-80"
            >
              FilterPath
            </button>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            {state.mode === 'scratch'
              ? 'Choose where to start, add rules, then inspect exactly what the filter will show.'
              : 'Pick a build one way, tune the phase and strictness, then inspect exactly what the filter will show.'}
          </p>
          <p className="mt-2 max-w-xl text-[11px] text-zinc-600">
            Editing{' '}
            <code className="break-words rounded bg-ink-900/70 px-1.5 py-0.5 text-zinc-400">
              {filter.fileName}
            </code>
          </p>
        </div>
        <nav className="flex items-center gap-4 text-xs text-zinc-500">
          <a
            href={`./demo.html#${wizardHash(state)}`}
            className="underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            loot simulator
          </a>
          <a
            href="./changelog.html"
            className="underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            changelog
          </a>
          <a
            href="./tests.html"
            className="underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            audit
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
                <div className="relative w-36">
                  <select
                    value={state.leagueId}
                    onChange={(event) =>
                      update({ leagueId: event.target.value })
                    }
                    className="w-full appearance-none rounded-lg border border-ink-600 bg-ink-800 py-2 pl-3 pr-7 text-sm text-zinc-100 outline-none focus:border-gold-400"
                  >
                    {LEAGUE_INDEX.leagues.map((league) => (
                      <option key={league.id} value={league.id}>
                        {league.name}
                      </option>
                    ))}
                  </select>
                  <svg
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-zinc-500"
                  >
                    <path
                      d="M2 4.5L6 8l4-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-[11px] text-zinc-600">
                  The current league is preselected; Standard is the fallback.
                </p>
              </div>
            </section>

            <section aria-label="Selection mode">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist">
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

            {state.mode === 'scratch' && (
              <section aria-labelledby="scratch-heading">
                <h2
                  id="scratch-heading"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                >
                  1. Starting point
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(['hide', 'show'] as const).map((start) => (
                    <button
                      key={start}
                      type="button"
                      aria-pressed={state.scratchStart === start}
                      onClick={() => update({ scratchStart: start })}
                      className={cx(
                        'rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                        state.scratchStart === start
                          ? 'border-gold-400 bg-gold-400/10 text-white'
                          : 'border-ink-700 bg-ink-800/40 text-zinc-300 hover:border-ink-500',
                      )}
                    >
                      {start === 'hide' ? 'Hide everything' : 'Show everything'}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Add rules under Advanced rules. Templates such as uniques,
                  6-links and T15 maps are one click away.
                </p>
              </section>
            )}

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
                <section aria-labelledby="snapshot-heading">
                  <h2
                    id="snapshot-heading"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
                  >
                    Snapshot
                  </h2>
                  {seed ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Curated seed updated {snapshot.capturedAt.slice(0, 10)}.
                      Popularity weights and ascendancy splits are placeholders,
                      not measured from{' '}
                      <a
                        href={snapshot.source}
                        className="underline underline-offset-2 hover:text-zinc-300"
                      >
                        poe.ninja builds
                      </a>
                      .
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">
                      Captured {snapshot.capturedAt.slice(0, 10)} from{' '}
                      <a
                        href={snapshot.source}
                        className="underline underline-offset-2 hover:text-zinc-300"
                      >
                        poe.ninja builds
                      </a>
                      .
                    </p>
                  )}
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
                                  ? seed
                                    ? `seed weight ${entry.playShare}`
                                    : `${entry.playShare}% of snapshot`
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
                            ? seed
                              ? `seed weight ${skill.ascendancyShares[entry.id]}`
                              : `${skill.ascendancyShares[entry.id]}% of builds`
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

            {state.mode !== 'scratch' && (
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
            )}

            {state.mode !== 'scratch' && (
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
            )}

            <section aria-labelledby="theme-heading">
              <h2
                id="theme-heading"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
              >
                Theme
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
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

          <div className="min-w-0 space-y-6">
            <section className="rounded-xl border border-gold-400/25 bg-ink-800/70 p-5">
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
                {(state.mode === 'ascendancy' || state.mode === 'meta') && (
                  <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                    {family.name}
                  </span>
                )}
                {state.mode === 'meta' && (
                  <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                    {snapshot.league.name}
                  </span>
                )}
                {state.mode === 'scratch' ? (
                  <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                    {state.scratchStart === 'hide'
                      ? 'Hide everything'
                      : 'Show everything'}
                  </span>
                ) : (
                  <>
                    <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                      {state.phase === 'leveling' ? 'Leveling' : 'Endgame'}
                    </span>
                    <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                      {STRICTNESS_LABELS_PUBLIC[state.strictness]}
                    </span>
                  </>
                )}
                <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                  {filter.ruleCount} {filter.ruleCount === 1 ? 'rule' : 'rules'}
                </span>
                <span className="rounded-full border border-ink-600 px-2 py-0.5 text-zinc-300">
                  {filter.baseTypeCount} base types
                </span>
                {customRules.length > 0 && (
                  <span className="rounded-full border border-gold-400/50 px-2 py-0.5 text-gold-300">
                    {customRules.length} custom rules
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <button
                  type="button"
                  onClick={() => void download()}
                  disabled={folder.busy}
                  className="rounded-lg bg-gold-400 px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-300 disabled:opacity-40"
                >
                  {folder.handle ? `Save to ${folder.handle.name}` : 'Download .filter'}
                </button>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="rounded-lg border border-ink-600 bg-ink-900/70 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:border-ink-500"
                >
                  {copied === 'code' ? 'Copied' : 'Copy code'}
                </button>
                <button
                  type="button"
                  onClick={() => void shareLink()}
                  className="rounded-lg px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  {copied === 'link' ? 'Link copied' : 'Share link'}
                </button>
              </div>
              {folder.handle && (
                <p className="mt-2 text-[10px] text-zinc-600">
                  Writes into {folder.handle.name}; asks before overwriting and
                  downloads instead if the folder cannot be written.
                </p>
              )}
              <p className="mt-2 text-[11px] text-zinc-500">
                Copy code and Share link both carry the whole build, including
                custom rules. Paste a code into Import code to restore it.
              </p>
              {notice && (
                <p className="mt-2 text-[11px] text-amber-300">{notice}</p>
              )}
              <p className="mt-3 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
                In-game name:{' '}
                <span className="break-words font-medium text-zinc-200">
                  {filter.fileName.replace(/\.filter$/, '')}
                </span>
              </p>
            </section>

            <ThemePreview rules={filter.rules} hash={wizardHash(state)} />
          </div>
        </div>

        <SaveBuildPanel
          state={state}
          customRules={customRules}
          fileName={filter.fileName}
          text={filter.text}
          appVersion={APP_VERSION}
          dirty={dirty}
          name={state.name}
          autoName={autoName}
          activeBuildId={activeBuildId}
          folder={folder}
          onNameChange={(name) => update({ name })}
          onLoad={loadBuild}
          onSaved={(build) => {
            setActiveBuildId(build.id);
            setSavedHash(currentHash);
          }}
          onUpdated={(build) => {
            setActiveBuildId(build.id);
            setSavedHash(currentHash);
          }}
          onWritten={() => setSavedHash(currentHash)}
          onDeleted={(id) => {
            if (activeBuildId === id) setActiveBuildId(null);
          }}
        />

        <AdvancedRules
          baseRules={baseFilter.rules}
          customRules={customRules}
          label={filter.archetype.name}
          presetVersion={PRESET_VERSION}
          focusIndex={focusIndex}
          prefill={prefill}
          onChange={changeCustomRules}
          onImportCode={importCode}
          onImportRulesCode={importRulesCode}
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
            <li>Put it in the game's filter folder (paths below).</li>
            <li>
              In game: Options → UI → Item Filter, then pick{' '}
              <span className="text-zinc-300">FilterPath</span>.
            </li>
          </ol>
          <p className="mt-3 text-xs text-zinc-500">
            Online filters synced to your PoE account appear in the same
            dropdown but are separate files. The entry starts with{' '}
            <span className="text-zinc-300">filterpath-</span>.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Seeing items that should be hidden? Check which filter is selected;
            another filter can still be active.
          </p>
          <FolderGuidance platform={folder.platform} />
        </details>
      </main>

      <footer className="mt-12 border-t border-ink-700 pt-5 text-xs leading-relaxed text-zinc-500">
        <p>
          This product isn't affiliated with or endorsed by Grinding Gear Games
          in any way.
        </p>
        <p className="mt-1">
          Base item data from RePoE. Economy tiers from poe.ninja.{' '}
          {seed
            ? 'Meta snapshots are curated seeds, not measured builds.'
            : 'Meta snapshots from poe.ninja.'}
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
            onClick={() => void download()}
            disabled={folder.busy}
            className="shrink-0 rounded-lg bg-gold-400 px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-40"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}