import type { GearItem } from '../core/builds/types.ts';

/** PoE's item-name colours, so the sheet reads at a glance. */
const RARITY_COLOUR: Record<string, string> = {
  NORMAL: 'text-zinc-200',
  MAGIC: 'text-[#8888ff]',
  RARE: 'text-[#ffff77]',
  UNIQUE: 'text-[#af6025]',
};

const RARITY_BORDER: Record<string, string> = {
  NORMAL: 'border-ink-600',
  MAGIC: 'border-[#3f4f8f]',
  RARE: 'border-[#7a6f2a]',
  UNIQUE: 'border-[#7a4a1f]',
};

/**
 * Gear laid out where the game puts it, so you can read the sheet the way you
 * read your own inventory. Every cell carries the item's mods on hover.
 */
export default function InventoryPanel({ gear }: { gear: GearItem[] }) {
  const bySlot = new Map(gear.map((item) => [item.slot, item]));
  const layout: (string | null)[][] = [
    ['Weapon 1', 'Helmet', 'Amulet'],
    ['Shield', 'Body Armour', 'Ring 1'],
    ['Gloves', 'Boots', 'Ring 2'],
    ['Belt', null, null],
  ];
  const jewels = gear.filter((item) => item.slot.startsWith('Jewel'));

  const cell = (slot: string) => {
    const item = bySlot.get(slot);
    if (!item) {
      return (
        <div className="flex h-16 flex-col justify-center rounded border border-dashed border-ink-700 px-2 text-[10px] uppercase tracking-[0.14em] text-zinc-700">
          {slot}
        </div>
      );
    }
    const colour = RARITY_COLOUR[item.rarity ?? 'RARE'] ?? RARITY_COLOUR.RARE!;
    const border = RARITY_BORDER[item.rarity ?? 'RARE'] ?? RARITY_BORDER.RARE!;
    return (
      <div
        className={`group relative h-16 cursor-help rounded border bg-ink-950/70 px-2 py-1 ${border}`}
      >
        <span className="block text-[9px] uppercase tracking-[0.14em] text-zinc-600">
          {slot}
        </span>
        <span className={`mt-0.5 block truncate text-xs ${colour}`}>{item.base}</span>
        <span className="mt-0.5 block text-[10px] text-zinc-500">
          {item.mods.length} mods
        </span>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-0 bottom-full z-30 mb-1 hidden w-64 max-w-[70vw] rounded-md border border-ink-600 bg-ink-950/95 p-2 text-left text-[11px] leading-snug shadow-xl group-hover:block group-focus-within:block"
        >
          <strong className={`block ${colour}`}>{item.base}</strong>
          <span className="block text-zinc-500">
            {item.slot} · item level {item.ilvl} · {item.budget}
          </span>
          <span className="mt-1 block">
            {item.mods.map((mod) => (
              <span key={mod} className="block text-zinc-300">
                {mod}
              </span>
            ))}
          </span>
        </span>
      </div>
    );
  };

  return (
    <div>
      <div className="rounded-lg border border-ink-600 bg-[#12151c] p-3">
        <div className="grid grid-cols-3 gap-2">
          {layout.map((row, index) => (
            <div key={index} className="contents">
              {row.map((slot) => (
                <div key={`${index}-${slot}`}>{slot && cell(slot)}</div>
              ))}
            </div>
          ))}
        </div>
        {jewels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 border-t border-ink-700 pt-2">
            {jewels.map((jewel) => (
              <div key={jewel.slot} className="w-32">
                {cell(jewel.slot)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
