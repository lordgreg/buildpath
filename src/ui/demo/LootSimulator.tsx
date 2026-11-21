import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { parseItemText } from '../../core/demo/parse-item.ts';
import { baseTypes } from '../../core/data/base-types.ts';
import { colorToCss } from '../../core/filter/style-utils.ts';
import type { Rule } from '../../core/filter/types.ts';
import {
  evaluateRules,
  type ItemRarity,
  type PreviewItem,
} from '../../core/preview/match.ts';
import { SAMPLE_ITEMS } from '../../core/preview/samples.ts';
import { playAlertSound } from './alertSound.ts';

const RARITY_COLOR: Record<ItemRarity, string> = {
  Normal: '#d6d6d6',
  Magic: '#9a9aff',
  Rare: '#fff07a',
  Unique: '#d98a4a',
  Quest: '#63e68b',
};

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

function hash(value: string, seed: number): number {
  let result = 2166136261 ^ seed;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result);
}

function layoutPositions(
  ids: readonly string[],
  seed: number,
): { x: number; y: number }[] {
  const placed: { x: number; y: number }[] = [];

  for (const id of ids) {
    let best = { x: 50, y: 50 };
    let bestScore = -1;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const x = 10 + (hash(id, seed + attempt * 17) % 80);
      const y = 8 + (hash(id, seed + attempt * 29 + 7) % 84);
      const score =
        placed.length === 0
          ? 999
          : Math.min(
              ...placed.map((point) =>
                Math.hypot((x - point.x) * 1.4, y - point.y),
              ),
            );
      if (score > bestScore) {
        best = { x, y };
        bestScore = score;
      }
      if (score >= 16) break;
    }
    placed.push(best);
  }

  return placed;
}

function pickRandomIds(pool: readonly PreviewItem[], count: number): string[] {
  const copy = [...pool];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy.slice(0, Math.min(count, copy.length)).map((item) => item.id);
}

export default function LootSimulator({
  rules,
  label,
  fileName,
  builderHash,
}: {
  rules: readonly Rule[];
  label: string;
  fileName: string;
  builderHash: string;
}) {
  const [pasted, setPasted] = useState<PreviewItem[]>([]);
  const [text, setText] = useState('');
  const [showHidden, setShowHidden] = useState(true);
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem('filterpath.demo-sound.v1') !== 'off';
    } catch {
      return true;
    }
  });

  const toggleSound = (value: boolean) => {
    setSoundOn(value);
    try {
      localStorage.setItem('filterpath.demo-sound.v1', value ? 'on' : 'off');
    } catch {
      // Ignore blocked storage.
    }
  };
  const [message, setMessage] = useState<string | null>(null);
  const [seed, setSeed] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [dropIds, setDropIds] = useState<string[]>(() =>
    pickRandomIds(SAMPLE_ITEMS, 14),
  );

  const pool = useMemo(() => [...SAMPLE_ITEMS, ...pasted], [pasted]);

  const rows = useMemo(
    () =>
      dropIds
        .map((id) => pool.find((item) => item.id === id))
        .filter((item): item is PreviewItem => Boolean(item))
        .map((item) => ({
          item,
          result: evaluateRules(rules, item),
        })),
    [dropIds, pool, rules],
  );

  const shown = rows.filter((row) => row.result.shown).length;
  const hidden = rows.length - shown;
  const visible = showHidden ? rows : rows.filter((row) => row.result.shown);
  const positions = layoutPositions(
    visible.map((row) => row.item.id),
    seed,
  );

  const randomize = () => {
    setDropIds(pickRandomIds(pool, 14));
    setSeed((value) => value + 1);
    setAddedIds([]);
    setPinnedId(null);
    setHoveredId(null);
  };
  const selected = rows.find((row) => row.item.id === (hoveredId ?? pinnedId));
  const selectedIndex = selected
    ? visible.findIndex((row) => row.item.id === selected.item.id)
    : -1;
  const background = `${import.meta.env.BASE_URL}demo-ground.png`;

  const addItems = (items: PreviewItem[]) => {
    if (items.length === 0) return;
    const added = items.map((item, index) => ({
      ...item,
      id: `paste-${pasted.length + index}`,
    }));
    setPasted((previous) => [...previous, ...added]);
    setDropIds((previous) => [...previous, ...added.map((item) => item.id)]);
    setAddedIds(added.map((item) => item.id));
    setSeed((value) => value + 1);
    setText('');
    setMessage(`Added ${items.length} item(s) to the overlay.`);
  };

  const parse = () => {
    const items = parseItemText(text);
    if (items.length === 0) {
      setMessage(
        'No item blocks found. Paste the full item text, starting at "Item Class:".',
      );
      return;
    }
    addItems(items);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const pastedText = event.clipboardData?.getData('text') ?? '';
      if (!/Item Class:/i.test(pastedText)) return;
      const items = parseItemText(pastedText);
      if (items.length === 0) return;
      event.preventDefault();
      addItems(items);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
    // addItems closes over the current pasted count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasted.length]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-400">
            Loot simulator
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            What the filter does
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Simulating <span className="text-zinc-200">{label}</span>. Drops are
            scattered like in-game labels; paste one from the game to see it
            here.
          </p>
          <p className="mt-2 max-w-xl text-[11px] text-zinc-600">
            Editing{' '}
            <code className="break-words rounded bg-ink-900/70 px-1.5 py-0.5 text-zinc-400">
              {fileName}
            </code>
          </p>
        </div>
        <nav className="flex flex-wrap gap-4 text-xs text-zinc-500">
          <a
            href={`./#${builderHash}`}
            className="underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            back to builder
          </a>
          <a
            href="./changelog.html"
            className="underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            changelog
          </a>
        </nav>
      </header>

      <section className="mt-6 grid gap-3 rounded-xl border border-ink-700 bg-ink-800/40 p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={`Item Class: Gloves\nRarity: Normal\nSuperior Rawhide Gloves\n--------\nItem Level: 14`}
            className="h-24 w-full rounded-lg border border-ink-600 bg-ink-950 p-3 font-mono text-xs text-zinc-300 outline-none focus:border-gold-400"
          />
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <button
            type="button"
            onClick={parse}
            className="rounded-lg bg-gold-400 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-gold-300"
          >
            Add items
          </button>
          <button
            type="button"
            onClick={randomize}
            className="rounded-lg border border-ink-600 px-4 py-2 text-sm text-zinc-300 hover:border-ink-500"
          >
            Randomize
          </button>
          <label
            className="flex items-center gap-2 rounded-lg border border-ink-600 px-3 py-2 text-xs text-zinc-400"
            title="Play the alert sound from the matching filter rule"
          >
            <input
              type="checkbox"
              className="size-4 accent-gold-400"
              checked={soundOn}
              onChange={(event) => toggleSound(event.target.checked)}
            />
            sound
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-ink-600 px-3 py-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              className="size-4 accent-gold-400"
              checked={showHidden}
              onChange={(event) => setShowHidden(event.target.checked)}
            />
            show hidden
          </label>
        </div>
        {message && (
          <p className="text-xs text-zinc-400 lg:col-span-2">{message}</p>
        )}
      </section>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <p className="text-zinc-500">
          {rows.length} of {pool.length} pooled drops:{' '}
          <span className="text-emerald-300">{shown} shown</span>,{' '}
          <span className="text-zinc-500">{hidden} hidden</span>
        </p>
        <p className="text-zinc-600">
          Click a label to inspect the rule and play its alert.
        </p>
      </div>

      <section
        className="relative mt-3 h-[68vh] min-h-[480px] max-h-[820px] overflow-hidden rounded-xl border border-ink-700 bg-ink-950 bg-cover bg-center shadow-2xl"
        style={{ backgroundImage: `url(${background})` }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setPinnedId(null);
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
        {visible.map(({ item, result }, index) => {
          const style = result.shown ? result.rule?.style : undefined;
          const { x, y } = positions[index] ?? { x: 50, y: 50 };
          const labelStyle: CSSProperties = {
            left: `clamp(10rem, ${x}%, calc(100% - 10rem))`,
            top: `clamp(2rem, ${y}%, calc(100% - 2rem))`,
            zIndex: 10 + index,
            color:
              colorToCss(style?.textColor) ??
              (result.shown ? RARITY_COLOR[item.rarity] : '#8a8a8a'),
            backgroundColor:
              colorToCss(style?.backgroundColor) ?? 'rgba(2, 3, 6, 0.92)',
            borderColor:
              colorToCss(style?.borderColor) ??
              (result.shown ? RARITY_COLOR[item.rarity] : '#3f3f46'),
            fontSize: `${Math.min(18, Math.max(11, style?.fontSize ?? 13))}px`,
          };
          return (
            <button
              key={item.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (soundOn) {
                  playAlertSound(
                    result.rule?.style?.alertSound,
                    result.rule?.style?.alertVolume,
                  );
                }
                setPinnedId((previous) =>
                  previous === item.id ? null : item.id,
                );
              }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(item.id)}
              onBlur={() => setHoveredId(null)}
              style={labelStyle}
              title={`${item.name} - ${result.shown ? 'shown' : 'hidden'}: ${result.reason} - click for the alert`}
              className={cx(
                'demo-label absolute max-w-[min(18rem,70vw)] -translate-x-1/2 -translate-y-1/2 truncate rounded-sm border px-3 py-1 font-serif leading-tight shadow-[0_2px_8px_rgba(0,0,0,0.65)]',
                result.shown ? 'opacity-100' : 'border-dashed opacity-35 grayscale',
                addedIds.includes(item.id) && 'ring-2 ring-gold-400',
              )}
            >
              {item.name}
              {addedIds.includes(item.id) && (
                <span className="ml-2 rounded bg-gold-400/20 px-1 text-[9px] uppercase tracking-wide text-gold-300">
                  new
                </span>
              )}
              {!result.shown && (
                <span className="ml-2 text-[9px] uppercase tracking-wide opacity-70">
                  hidden
                </span>
              )}
            </button>
          );
        })}
        {visible.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
            Nothing is visible with these settings.
          </p>
        )}

        {selected && selectedIndex >= 0 && (() => {
          const { x, y } = positions[selectedIndex] ?? { x: 50, y: 50 };
          const base = baseTypes.find(
            (entry) => entry.name === selected.item.baseType,
          );
          const requirements = base?.requirements ?? {};
          const requirementLabels = [
            requirements.str ? `${requirements.str} Str` : null,
            requirements.dex ? `${requirements.dex} Dex` : null,
            requirements.int ? `${requirements.int} Int` : null,
          ].filter(Boolean);
          const above = y > 45;
          return (
            <div
              className="pointer-events-none absolute z-50 w-72 max-w-[85vw] rounded-lg border-2 bg-[#0b0b10]/95 text-xs shadow-2xl"
              style={{
                left: `clamp(9rem, ${x}%, calc(100% - 9rem))`,
                top: `${y}%`,
                transform: above
                  ? 'translate(-50%, calc(-100% - 1.1rem))'
                  : 'translate(-50%, 1.1rem)',
                borderColor: RARITY_COLOR[selected.item.rarity],
              }}
            >
              <div
                className="border-b px-3 py-2 text-center"
                style={{
                  backgroundColor: `${RARITY_COLOR[selected.item.rarity]}22`,
                  borderColor: RARITY_COLOR[selected.item.rarity],
                }}
              >
                <p
                  className="font-serif leading-tight"
                  style={{ color: RARITY_COLOR[selected.item.rarity] }}
                >
                  {selected.item.name}
                </p>
                {selected.item.baseType !== selected.item.name && (
                  <p className="text-[10px] text-zinc-400">
                    {selected.item.baseType}
                  </p>
                )}
              </div>
              <div className="space-y-0.5 px-3 py-2 text-center text-zinc-300">
                <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                  {selected.item.itemClass}
                </p>
                <p>
                  {selected.item.rarity} - ilvl {selected.item.itemLevel}
                </p>
                {requirementLabels.length > 0 && (
                  <p className="text-zinc-400">
                    Requires {requirementLabels.join(', ')}
                  </p>
                )}
                {base && (
                  <p className="text-zinc-500">Drop level {base.dropLevel}</p>
                )}
                {(selected.item.sockets !== undefined ||
                  selected.item.quality !== undefined ||
                  selected.item.stackSize !== undefined ||
                  selected.item.mapTier !== undefined) && (
                  <p className="text-zinc-500">
                    {[
                      selected.item.sockets !== undefined
                        ? `${selected.item.sockets} sockets`
                        : null,
                      selected.item.linkedSockets !== undefined
                        ? `${selected.item.linkedSockets} links`
                        : null,
                      selected.item.quality !== undefined
                        ? `${selected.item.quality}% quality`
                        : null,
                      selected.item.stackSize !== undefined
                        ? `stack ${selected.item.stackSize}`
                        : null,
                      selected.item.mapTier !== undefined
                        ? `tier ${selected.item.mapTier}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' - ')}
                  </p>
                )}
                <div className="my-1 border-t border-zinc-700" />
                <p
                  className={
                    selected.result.shown
                      ? 'text-emerald-300'
                      : 'text-zinc-500'
                  }
                >
                  {selected.result.shown ? 'Shown' : 'Hidden'}{' '}
                  {selected.result.index >= 0
                    ? `by rule #${selected.result.index + 1}`
                    : '(default)'}
                  : {selected.result.reason}
                </p>
                <p className="text-[9px] text-zinc-600">
                  Representative base; stat rolls not simulated.
                </p>
              </div>
            </div>
          );
        })()}
      </section>

      <footer className="mt-8 border-t border-ink-700 pt-4 text-xs leading-relaxed text-zinc-500">
        <p>
          Simulation only. Background is original FilterPath art. Labels
          approximate the in-game filter and do not imply real stat rolls.
        </p>
        <p className="mt-1">
          This product isn't affiliated with or endorsed by Grinding Gear Games
          in any way.
        </p>
      </footer>
    </div>
  );
}