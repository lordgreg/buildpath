import { useMemo, useState } from 'react';
import type { Archetype } from '../../core/archetypes/types.ts';
import type { Rule } from '../../core/filter/types.ts';
import {
  evaluateRules,
  type MatchResult,
  type PreviewItem,
} from '../../core/preview/match.ts';
import { paperDollItems } from '../../core/preview/paper-doll.ts';
import { SAMPLE_ITEMS } from '../../core/preview/samples.ts';
import ClassIcon from './ClassIcon.tsx';

const RARITY_STYLE: Record<PreviewItem['rarity'], string> = {
  Normal: 'border-zinc-600',
  Magic: 'border-sky-500/70',
  Rare: 'border-amber-400/80',
  Unique: 'border-orange-500/80',
};

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

function ItemTile({
  item,
  result,
  selected,
  onSelect,
}: {
  item: PreviewItem;
  result: MatchResult;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={`${item.name} - ${result.shown ? 'shown' : 'hidden'}: ${result.reason}`}
      className={cx(
        'relative flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded border bg-ink-900/60 p-1 text-center transition-colors',
        RARITY_STYLE[item.rarity],
        result.shown ? 'text-zinc-200' : 'opacity-40 grayscale',
        selected && 'ring-2 ring-gold-400',
      )}
    >
      <ClassIcon
        itemClass={item.itemClass}
        className="size-4 shrink-0 text-zinc-300"
      />
      <span className="line-clamp-2 w-full break-words text-[9px] leading-tight">
        {item.name}
      </span>
      {!result.shown && (
        <span className="absolute right-0.5 top-0.5 rounded bg-ink-950/90 px-1 text-[8px] uppercase tracking-wide text-zinc-500">
          h
        </span>
      )}
    </button>
  );
}

export default function InventoryPreview({
  rules,
  archetype,
}: {
  rules: readonly Rule[];
  archetype: Archetype;
}) {
  const [showHidden, setShowHidden] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const doll = useMemo(() => paperDollItems(archetype), [archetype]);

  const dollRows = useMemo(
    () =>
      doll.map((entry) => ({
        entry,
        item: entry.item,
        result: entry.item ? evaluateRules(rules, entry.item) : null,
      })),
    [doll, rules],
  );

  const inventoryRows = useMemo(
    () =>
      SAMPLE_ITEMS.map((item) => ({
        item,
        result: evaluateRules(rules, item),
      })),
    [rules],
  );

  const all = [
    ...dollRows.flatMap((row) =>
      row.item && row.result ? [{ item: row.item, result: row.result }] : [],
    ),
    ...inventoryRows,
  ];
  const shown = all.filter((row) => row.result.shown).length;
  const hidden = all.length - shown;
  const dollShown = dollRows.filter((row) => row.result?.shown).length;
  const inventoryShown = inventoryRows.filter(
    (row) => row.result.shown,
  ).length;
  const selected = all.find((row) => row.item.id === selectedId);

  const visibleInventory = showHidden
    ? inventoryRows
    : inventoryRows.filter((row) => row.result.shown);
  const emptyCells = Math.max(0, 60 - visibleInventory.length);

  return (
    <section className="min-w-0 rounded-xl border border-ink-700 bg-ink-800/40 p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-white">Preview</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Simulation for representative bases, not a game render.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-emerald-300">{shown} shown</span>
          <span className="text-zinc-500">{hidden} hidden</span>
          <label className="flex items-center gap-2 text-zinc-400">
            <input
              type="checkbox"
              className="size-3.5 accent-gold-400"
              checked={showHidden}
              onChange={(event) => setShowHidden(event.target.checked)}
            />
            show hidden
          </label>
        </div>
      </header>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
              Equipment
            </h3>
            <span className="text-[11px] text-zinc-500">
              {dollShown}/{dollRows.length} shown
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {dollRows.map(({ entry, item, result }, index) => (
              <div key={`${entry.label}-${index}`} className="min-w-0">
                <p className="mb-1 truncate text-[10px] uppercase tracking-wide text-zinc-600">
                  {entry.label}
                </p>
                {item && result ? (
                  <ItemTile
                    item={item}
                    result={result}
                    selected={item.id === selectedId}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded border border-dashed border-ink-700 text-[10px] text-zinc-600">
                    none
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
              Inventory
            </h3>
            <span className="text-[11px] text-zinc-500">
              {inventoryShown}/{inventoryRows.length} shown
            </span>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-10 xl:grid-cols-12">
            {visibleInventory.map(({ item, result }) => (
              <ItemTile
                key={item.id}
                item={item}
                result={result}
                selected={item.id === selectedId}
                onSelect={() => setSelectedId(item.id)}
              />
            ))}
            {Array.from({ length: emptyCells }, (_, index) => (
              <div
                key={`empty-${index}`}
                className="aspect-square rounded border border-ink-800/70 bg-ink-900/20"
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-zinc-600">
            12 x 5 grid; empty cells are empty slots.
          </p>
        </div>
      </div>

      {selected && (
        <div className="mt-4 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs">
          <p className="text-zinc-200">
            {selected.item.name}{' '}
            <span className="text-zinc-500">
              - {selected.item.rarity} {selected.item.itemClass}
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

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
        Equipment uses one rare base per slot from the selected build. The
        inventory uses fixed representative drops, including the reported leak
        cases. Tap a tile to see which rule decided it.
      </p>
    </section>
  );
}