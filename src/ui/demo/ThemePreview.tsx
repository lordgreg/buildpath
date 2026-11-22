import type { Rule } from '../../core/filter/types.ts';
import { evaluateRules } from '../../core/preview/match.ts';
import { SAMPLE_ITEMS } from '../../core/preview/samples.ts';
import { lootLabelStyle } from './lootLabel.ts';

/**
 * A representative spread of drops laid out on the demo ground. Positions are
 * fixed, so switching the theme restyles the labels in place.
 */
const SPOTS: { id: string; x: number; y: number }[] = [
  { id: 'currency-mirror', x: 20, y: 18 },
  { id: 'rare-helmet', x: 52, y: 16 },
  { id: 'currency-divine', x: 82, y: 20 },
  { id: 'unique-belt', x: 16, y: 50 },
  { id: 'gem-quality', x: 46, y: 48 },
  { id: 'divination-card', x: 76, y: 52 },
  { id: 'rare-ring', x: 18, y: 82 },
  { id: 'quality-flask', x: 48, y: 84 },
  { id: 'fragment', x: 78, y: 82 },
];

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
  const rows = SPOTS.flatMap((spot) => {
    const item = SAMPLE_ITEMS.find((entry) => entry.id === spot.id);
    return item ? [{ item, spot, result: evaluateRules(rules, item) }] : [];
  });

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
        {rows.map(({ item, spot, result }) => (
          <span
            key={item.id}
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
          >
            {item.name}
          </span>
        ))}
        <span className="absolute bottom-2 right-3 text-[10px] uppercase tracking-[0.2em] text-white/60 transition-colors group-hover:text-white/90">
          Open loot simulator ↗
        </span>
      </div>
    </a>
  );
}
