import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { parseItemText } from '../../core/demo/parse-item.ts';
import { colorToCss } from '../../core/filter/style-utils.ts';
import type { Rule } from '../../core/filter/types.ts';
import {
  evaluateRules,
  type ItemRarity,
  type PreviewItem,
} from '../../core/preview/match.ts';
import { SAMPLE_ITEMS } from '../../core/preview/samples.ts';

const RARITY_COLOR: Record<ItemRarity, string> = {
  Normal: '#d6d6d6',
  Magic: '#9a9aff',
  Rare: '#fff07a',
  Unique: '#d98a4a',
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

function position(index: number, id: string, seed: number): {
  x: number;
  y: number;
} {
  const columns = 5;
  const column = index % columns;
  const row = Math.floor(index / columns);
  const jitterX = (hash(id, seed) % 9) - 4;
  const jitterY = (hash(id, seed + 13) % 9) - 4;
  return {
    x: Math.max(10, Math.min(90, 12 + column * 19 + jitterX)),
    y: Math.max(8, Math.min(92, 10 + (row % 7) * 13 + jitterY)),
  };
}

export default function LootSimulator({
  rules,
  label,
  builderHash,
}: {
  rules: readonly Rule[];
  label: string;
  builderHash: string;
}) {
  const [pasted, setPasted] = useState<PreviewItem[]>([]);
  const [text, setText] = useState('');
  const [showHidden, setShowHidden] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [seed, setSeed] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      [...SAMPLE_ITEMS, ...pasted].map((item) => ({
        item,
        result: evaluateRules(rules, item),
      })),
    [pasted, rules],
  );

  const shown = rows.filter((row) => row.result.shown).length;
  const hidden = rows.length - shown;
  const visible = showHidden ? rows : rows.filter((row) => row.result.shown);
  const selected = rows.find((row) => row.item.id === selectedId);
  const background = `${import.meta.env.BASE_URL}demo-ground.png`;

  const parse = () => {
    const items = parseItemText(text);
    if (items.length === 0) {
      setMessage(
        'No item blocks found. Paste the full item text, starting at "Item Class:".',
      );
      return;
    }
    setPasted((previous) => [
      ...previous,
      ...items.map((item, index) => ({
        ...item,
        id: `paste-${previous.length + index}`,
      })),
    ]);
    setText('');
    setMessage(`Added ${items.length} pasted item(s).`);
  };

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
            onClick={() => {
              setPasted([]);
              setMessage(null);
            }}
            className="rounded-lg border border-ink-600 px-4 py-2 text-sm text-zinc-300 hover:border-ink-500"
          >
            Clear pasted
          </button>
          <button
            type="button"
            onClick={() => setSeed((value) => value + 1)}
            className="rounded-lg border border-ink-600 px-4 py-2 text-sm text-zinc-300 hover:border-ink-500"
          >
            Scatter
          </button>
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
          {rows.length} drops:{' '}
          <span className="text-emerald-300">{shown} shown</span>,{' '}
          <span className="text-zinc-500">{hidden} hidden</span>
        </p>
        <p className="text-zinc-600">Click a label to inspect the rule.</p>
      </div>

      <section
        className="relative mt-3 h-[68vh] min-h-[480px] max-h-[820px] overflow-hidden rounded-xl border border-ink-700 bg-ink-950 bg-cover bg-center shadow-2xl"
        style={{ backgroundImage: `url(${background})` }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null);
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
        {visible.map(({ item, result }, index) => {
          const style = result.shown ? result.rule?.style : undefined;
          const { x, y } = position(index, item.id, seed);
          const labelStyle: CSSProperties = {
            left: `clamp(7rem, ${x}%, calc(100% - 7rem))`,
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
                setSelectedId(item.id);
              }}
              style={labelStyle}
              title={`${item.name} - ${result.shown ? 'shown' : 'hidden'}: ${result.reason}`}
              className={cx(
                'demo-label absolute max-w-[min(24rem,82vw)] -translate-x-1/2 -translate-y-1/2 truncate rounded-sm border px-3 py-1 font-serif leading-tight shadow-[0_2px_8px_rgba(0,0,0,0.65)]',
                result.shown ? 'opacity-100' : 'border-dashed opacity-35 grayscale',
              )}
            >
              {item.name}
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
      </section>

      {selected && (
        <div className="mt-3 rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2 text-xs">
          <p className="text-zinc-200">
            {selected.item.name}{' '}
            <span className="text-zinc-500">
              - {selected.item.rarity} {selected.item.itemClass}
              {selected.item.itemLevel
                ? `, ilvl ${selected.item.itemLevel}`
                : ''}
            </span>
          </p>
          <p
            className={
              selected.result.shown ? 'text-emerald-300' : 'text-zinc-500'
            }
          >
            {selected.result.shown ? 'Shown' : 'Hidden'}{' '}
            {selected.result.index >= 0
              ? `by rule #${selected.result.index + 1}`
              : '(no rule matched)'}
            : {selected.result.reason}
          </p>
        </div>
      )}

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