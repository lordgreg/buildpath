import { useMemo } from 'react';
import type { Rule } from '../../core/filter/types.ts';
import { evaluateRules, type PreviewItem } from '../../core/preview/match.ts';
import { SAMPLE_ITEMS } from '../../core/preview/samples.ts';
import { lootLabelStyle } from './lootLabel.ts';

/**
 * A representative spread of drops laid out on the demo ground. Positions are
 * fixed, so switching the theme restyles the labels in place.
 */
const SPOTS: { x: number; y: number }[] = [
  { x: 20, y: 18 },
  { x: 52, y: 16 },
  { x: 82, y: 20 },
  { x: 16, y: 50 },
  { x: 46, y: 48 },
  { x: 76, y: 52 },
  { x: 18, y: 82 },
  { x: 48, y: 84 },
  { x: 78, y: 82 },
];

/** Roughly four in five drops belong to the selection; the rest show the hide. */
const VISIBLE_SHARE = 0.8;

function shuffled<T>(values: readonly T[]): T[] {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap]!, next[index]!];
  }
  return next;
}

interface Candidate {
  item: PreviewItem;
  result: ReturnType<typeof evaluateRules>;
}

/**
 * Picks a fresh board for every filter state: 80% of the spots are items this
 * filter shows, 20% are items it hides, and the pool is shuffled so the card
 * does not read as a static screenshot. The sample ids are deduplicated because
 * the catalogue keeps historical fixtures with overlapping ids.
 */
function pickBoard(rules: readonly Rule[]): (Candidate & { spot: { x: number; y: number } })[] {
  const seen = new Set<string>();
  const shown: Candidate[] = [];
  const hidden: Candidate[] = [];
  for (const item of SAMPLE_ITEMS) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const result = evaluateRules(rules, item);
    (result.shown ? shown : hidden).push({ item, result });
  }

  const target = SPOTS.length;
  const shownOrder = shuffled(shown);
  const hiddenOrder = shuffled(hidden);
  const visibleCount = Math.min(shownOrder.length, Math.round(target * VISIBLE_SHARE));
  const hiddenCount = Math.min(hiddenOrder.length, target - visibleCount);
  const picked = [
    ...shownOrder.slice(0, visibleCount),
    ...hiddenOrder.slice(0, hiddenCount),
  ];
  // A filter that shows (or hides) nearly everything must still fill the board.
  if (picked.length < target) {
    picked.push(
      ...shownOrder.slice(visibleCount, visibleCount + target - picked.length),
      ...hiddenOrder.slice(hiddenCount, hiddenCount + target - picked.length),
    );
  }

  return shuffled(picked)
    .slice(0, target)
    .map((entry, index) => ({ ...entry, spot: SPOTS[index]! }));
}

/**
 * Read-only loot overlay shown in the builder. The whole card links to the
 * loot simulator, where items can be pasted and inspected.
 */
export default function ThemePreview({
  rules,
  hash,
}: {
  rules: readonly Rule[];
  hash: string;
}) {
  const background = `${import.meta.env.BASE_URL}demo-ground.png`;
  const rows = useMemo(() => pickBoard(rules), [rules]);
  const shownCount = rows.filter((row) => row.result.shown).length;

  return (
    <a
      href={`./demo.html#${hash}`}
      title="Open the loot simulator"
      aria-label="Open the loot simulator"
      className="group relative block overflow-hidden rounded-xl border border-ink-700 bg-ink-950 bg-cover bg-center shadow-2xl transition-colors hover:border-ink-500"
      style={{ backgroundImage: `url(${background})` }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
      <div className="relative h-[340px]">
        {rows.map(({ item, spot, result }, index) => (
          <span
            key={`${item.id}-${index}`}
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              ...lootLabelStyle(
                result.shown ? result.rule?.style : undefined,
                item.rarity,
                result.shown,
              ),
            }}
            className={[
              'absolute max-w-[8.5rem] -translate-x-1/2 -translate-y-1/2 truncate rounded-sm border px-3 py-1 font-serif leading-tight shadow-[0_2px_8px_rgba(0,0,0,0.65)]',
              result.shown
                ? 'opacity-100'
                : 'border-dashed opacity-35 grayscale',
            ].join(' ')}
            title={`${item.name} — ${result.shown ? 'shown' : 'hidden'} by this filter`}
          >
            {item.name}
          </span>
        ))}
        <span className="absolute bottom-2 left-3 text-[10px] uppercase tracking-[0.2em] text-white/60 transition-colors group-hover:text-white/90">
          {shownCount}/{rows.length} shown · reshuffled for this filter
        </span>
        <span className="absolute bottom-2 right-3 text-[10px] uppercase tracking-[0.2em] text-white/60 transition-colors group-hover:text-white/90">
          Open loot simulator ↗
        </span>
      </div>
    </a>
  );
}
