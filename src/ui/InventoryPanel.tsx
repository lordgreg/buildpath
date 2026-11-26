import type { FlaskChoice, GearItem } from '../core/builds/types.ts';
import SlotGlyph from './SlotGlyph.tsx';
import {
  FLASK_COUNT,
  INVENTORY_AREAS,
  INVENTORY_SLOTS,
  splitGear,
} from './inventory.ts';

/** PoE's item-name colours, so the sheet reads at a glance. */
const RARITY_COLOUR: Record<string, string> = {
  NORMAL: 'text-zinc-200',
  MAGIC: 'text-[#8888ff]',
  RARE: 'text-[#ffff77]',
  UNIQUE: 'text-[#af6025]',
};

const RARITY_BORDER: Record<string, string> = {
  NORMAL: 'border-[#3f4650]',
  MAGIC: 'border-[#3f4f8f]',
  RARE: 'border-[#7a6f2a]',
  UNIQUE: 'border-[#7a4a1f]',
};

const RARITY_GLOW: Record<string, string> = {
  NORMAL: 'from-zinc-800/30',
  MAGIC: 'from-[#1b2240]/50',
  RARE: 'from-[#2d2a14]/60',
  UNIQUE: 'from-[#2c1a10]/60',
};

function ItemTooltip({
  item,
  slotLabel,
}: {
  item: GearItem;
  slotLabel: string;
}) {
  const colour = RARITY_COLOUR[item.rarity ?? 'RARE'] ?? RARITY_COLOUR.RARE!;
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-0 bottom-full z-30 mb-1 hidden w-72 max-w-[80vw] rounded-md border border-ink-600 bg-ink-950/95 p-2.5 text-left text-[11px] leading-snug shadow-xl group-hover:block group-focus-within:block"
    >
      <strong className={`block ${colour}`}>{item.base}</strong>
      <span className="block text-zinc-500">
        {slotLabel} · item level {item.ilvl} · {item.budget}
      </span>
      {item.implicits && item.implicits.length > 0 && (
        <span className="mt-2 block border-t border-ink-700 pt-1.5">
          <span className="block text-[9px] uppercase tracking-[0.14em] text-[#8f7ad6]">
            Eldritch implicits
          </span>
          {item.implicits.map((implicit) => (
            <span key={`${implicit.currency}-${implicit.mod}`} className="block text-[#b7a6ef]">
              {implicit.mod}
              <span className="ml-1 text-[9px] uppercase tracking-wide text-zinc-600">
                {implicit.currency === 'ember' ? 'Ember' : 'Ichor'}
              </span>
            </span>
          ))}
        </span>
      )}
      <span className="mt-1 block">
        {item.mods.map((mod) => (
          <span key={mod} className="block text-zinc-300">
            {mod}
          </span>
        ))}
      </span>
    </span>
  );
}

function SlotCell({
  entry,
  item,
  tall,
}: {
  entry: { area: string; slot: string; label: string; tall?: boolean };
  item?: GearItem;
  tall?: boolean;
}) {
  const rarity = item?.rarity ?? 'RARE';
  const colour = RARITY_COLOUR[rarity] ?? RARITY_COLOUR.RARE!;
  const border = RARITY_BORDER[rarity] ?? RARITY_BORDER.RARE!;
  const glow = RARITY_GLOW[rarity] ?? RARITY_GLOW.RARE!;
  const compact = entry.slot === 'Amulet' || entry.slot.startsWith('Ring');
  const narrowSide = entry.slot === 'Weapon 1' || entry.slot === 'Weapon 2';
  const modLimit = compact ? 1 : tall ? 5 : 2;
  return (
    <div
      style={{ gridArea: entry.area }}
      className={
        'group relative flex flex-col justify-between overflow-hidden rounded-[3px] border bg-[#090c12]/80 shadow-[inset_0_0_22px_rgba(0,0,0,0.75)] ' +
        (item ? border : 'border-[#3a3529]') +
        (compact
          ? ' h-[4.4rem] w-[4.4rem] min-h-0 justify-self-center self-center p-1'
          : tall
            ? ' min-h-[10rem] p-2'
            : ' min-h-[5.6rem] p-2') +
        (narrowSide ? ' w-[80%] justify-self-center' : '')
      }
    >
      <SlotGlyph slot={entry.slot} tall={tall} />
      <span className="relative z-10 text-[9px] uppercase tracking-[0.16em] text-[#6f6754]">
        {entry.label}
      </span>
      {item ? (
        <span
          className={`relative z-10 mt-1 block break-words leading-tight ${
            compact ? 'text-[9px]' : 'text-xs'
          }`}
        >
          <span className={`block ${colour}`}>{item.base}</span>
          {!compact && item.implicits && item.implicits.length > 0 && (
            <span className="mt-0.5 block text-[9px] text-[#a794e0]">
              {item.implicits.map((implicit) => implicit.mod).join(' · ')}
            </span>
          )}
          <span className="mt-0.5 block space-y-0.5 text-[9px] leading-snug text-zinc-400">
            {item.mods.slice(0, modLimit).map((mod) => (
              <span key={mod} className="block truncate">
                {mod}
              </span>
            ))}
            {item.mods.length > modLimit && (
              <span className="block text-[9px] text-zinc-600">
                +{item.mods.length - modLimit} more
              </span>
            )}
          </span>
        </span>
      ) : (
        <span className="relative z-10 mt-1 block text-[10px] text-[#3e3a31]">Empty</span>
      )}
      {item && (
        <>
          <span
            className={`pointer-events-none absolute inset-0 rounded-[2px] bg-gradient-to-br ${glow} to-transparent`}
            aria-hidden
          />
          <ItemTooltip item={item} slotLabel={entry.label} />
        </>
      )}
    </div>
  );
}

function FlaskCell({ flask, index }: { flask?: FlaskChoice; index: number }) {
  return (
    <div className="group relative flex min-h-[6.4rem] flex-col justify-between rounded-[3px] border border-[#3a3529] bg-[#090c12]/80 p-1.5 shadow-[inset_0_0_18px_rgba(0,0,0,0.75)]">
      <SlotGlyph slot="Flask" />
      <span className="relative z-10 text-[9px] uppercase tracking-[0.16em] text-[#6f6754]">
        Flask {index + 1}
      </span>
      {flask ? (
        <>
          <span className="relative z-10 mt-1 block text-[11px] leading-tight text-[#8fb4ff]">
            {flask.name}
          </span>
          <span className="relative z-10 mt-0.5 block text-[9px] uppercase tracking-wide text-zinc-600">
            {flask.slot}
          </span>
          <span className="pointer-events-none absolute left-0 bottom-full z-30 mb-1 hidden w-56 max-w-[70vw] rounded-md border border-ink-600 bg-ink-950/95 p-2 text-left text-[11px] leading-snug text-zinc-300 shadow-xl group-hover:block">
            <strong className="block text-[#8fb4ff]">{flask.name}</strong>
            <span className="block text-zinc-500">{flask.slot} flask</span>
            {flask.note && <span className="mt-1 block">{flask.note}</span>}
          </span>
        </>
      ) : (
        <span className="relative z-10 mt-1 block text-[10px] text-[#3e3a31]">Empty</span>
      )}
    </div>
  );
}

/**
 * Gear laid out where the game puts it. The panel is a CSS grid, not a copy of
 * the game's art: a dark textured sheet with gold-edged slots, the same reading
 * order as the inventory screen, and every item's mods on hover.
 */
export default function InventoryPanel({
  gear,
  flasks = [],
}: {
  gear: GearItem[];
  flasks?: FlaskChoice[];
}) {
  const { bySlot, jewels } = splitGear(gear);
  const flaskSlots = Array.from({ length: FLASK_COUNT }, (_, index) => flasks[index]);

  return (
    <div className="overflow-x-auto md:overflow-visible">
      <div
        className="min-w-[640px] rounded-lg border border-[#5b4a28] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgba(68, 84, 99, 0.35), transparent 58%), radial-gradient(ellipse at 8% 100%, rgba(44, 51, 61, 0.35), transparent 45%), linear-gradient(145deg, #11161e 0%, #0a0d13 45%, #0e131b 100%)',
        }}
      >
        <div className="mb-2 flex items-center justify-between border-b border-[#3a3529] pb-1.5">
          <span className="text-[10px] uppercase tracking-[0.28em] text-[#8d7a4c]">
            Inventory
          </span>
          <span className="text-[9px] uppercase tracking-[0.16em] text-[#5b5548]">
            budget gear
          </span>
        </div>

        <div
          className="grid gap-2"
          style={{
            gridTemplateAreas: INVENTORY_AREAS,
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          }}
        >
          {INVENTORY_SLOTS.map((entry) => (
            <SlotCell
              key={entry.slot}
              entry={entry}
              item={bySlot.get(entry.slot)}
              tall={'tall' in entry && entry.tall}
            />
          ))}
        </div>

        <div className="mx-auto mt-2 grid w-full max-w-[34rem] grid-cols-5 gap-2 border-t border-[#3a3529] pt-2">
          {flaskSlots.map((flask, index) => (
            <FlaskCell key={`flask-${index}`} flask={flask} index={index} />
          ))}
        </div>

        {jewels.length > 0 && (
          <div className="mt-3 border-t border-[#3a3529] pt-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8d7a4c]">
              Jewels socketed
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {jewels.map((jewel) => {
                const rarity = jewel.rarity ?? 'RARE';
                return (
                  <div
                    key={jewel.slot}
                    className="group relative flex min-h-[4rem] flex-col justify-between rounded-[3px] border border-[#3f4f8f] bg-[#090c12]/80 p-2 shadow-[inset_0_0_18px_rgba(0,0,0,0.75)]"
                  >
                    <SlotGlyph slot="Jewel" />
                    <span className="relative z-10 text-[9px] uppercase tracking-[0.16em] text-[#6f6754]">
                      {jewel.slot}
                    </span>
                    <span
                      className={`relative z-10 mt-1 block break-words text-xs leading-tight ${
                        RARITY_COLOUR[rarity] ?? RARITY_COLOUR.RARE!
                      }`}
                    >
                      {jewel.base}
                    </span>
                    <span className="relative z-10 mt-0.5 block space-y-0.5 text-[9px] leading-snug text-zinc-400">
                      {jewel.mods.slice(0, 3).map((mod) => (
                        <span key={mod} className="block truncate">
                          {mod}
                        </span>
                      ))}
                      {jewel.mods.length > 3 && (
                        <span className="block text-zinc-600">
                          +{jewel.mods.length - 3} more
                        </span>
                      )}
                    </span>
                    <ItemTooltip item={jewel} slotLabel={jewel.slot} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
