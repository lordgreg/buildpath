import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { parseItemText } from '../../core/demo/parse-item.ts';
import { colorToCss } from '../../core/filter/style-utils.ts';
import type { Rule } from '../../core/filter/types.ts';
import { evaluateRules, type PreviewItem } from '../../core/preview/match.ts';
import { SAMPLE_ITEMS } from '../../core/preview/samples.ts';

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
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
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-400">
            Loot simulator
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            What the filter does
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Simulating <span className="text-zinc-200">{label}</span>. Paste an
            item from the game to see exactly how it would be labelled.
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

      <section className="mt-8 grid gap-4 rounded-xl border border-ink-700 bg-ink-800/40 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <label
            htmlFor="item-paste"
            className="text-[11px] uppercase tracking-[0.16em] text-zinc-600"
          >
            Paste item text from the game
          </label>
          <textarea
            id="item-paste"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={`Item Class: Gloves\nRarity: Normal\nSuperior Rawhide Gloves\n--------\nItem Level: 14`}
            className="mt-2 h-28 w-full rounded-lg border border-ink-600 bg-ink-950 p-3 font-mono text-xs text-zinc-300 outline-none focus:border-gold-400"
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

      <section className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <p className="text-zinc-500">
          {rows.length} drops: <span className="text-emerald-300">{shown} shown</span>,{' '}
          <span className="text-zinc-500">{hidden} hidden</span>
        </p>
        <p className="text-zinc-600">
          Labels use the matching filter rule's colours, font size and sound
          marker.
        </p>
      </section>

      <section className="mt-3 min-h-[28rem] rounded-xl border border-ink-700 bg-[radial-gradient(60rem_30rem_at_50%_0%,#161d27_0%,#0b0d11_70%)] p-3 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(({ item, result }) => {
            const style = result.shown ? result.rule?.style : undefined;
            const cardStyle: CSSProperties = {
              color: colorToCss(style?.textColor) ?? (result.shown ? '#e4e4e7' : '#71717a'),
              borderColor: result.shown
                ? colorToCss(style?.borderColor) ?? '#3f3f46'
                : '#3f3f46',
              backgroundColor: result.shown
                ? colorToCss(style?.backgroundColor) ?? '#18181b'
                : '#101014',
              fontSize: `${Math.min(18, Math.max(10, style?.fontSize ?? 12))}px`,
            };
            return (
              <article
                key={item.id}
                className={cx(
                  'relative rounded border p-2.5 transition-transform hover:-translate-y-0.5',
                  !result.shown && 'border-dashed opacity-45 grayscale',
                )}
                style={cardStyle}
                title={`${item.name} - ${result.shown ? 'shown' : 'hidden'}: ${result.reason}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 break-words font-semibold leading-tight">
                    {item.name}
                  </p>
                  <span className="shrink-0 rounded bg-black/40 px-1 py-0.5 text-[9px] uppercase tracking-wide opacity-80">
                    {item.rarity}
                  </span>
                </div>
                {item.baseType !== item.name && (
                  <p className="mt-0.5 break-words text-[10px] opacity-70">
                    {item.baseType}
                  </p>
                )}
                <p className="mt-1 text-[10px] opacity-60">
                  {item.itemClass}
                  {item.itemLevel ? ` - ilvl ${item.itemLevel}` : ''}
                  {item.mapTier ? ` - T${item.mapTier}` : ''}
                </p>
                <div className="mt-1 flex flex-wrap gap-1 text-[9px] opacity-70">
                  <span className="rounded bg-black/30 px-1 py-0.5">
                    {result.shown
                      ? result.index >= 0
                        ? `shown by #${result.index + 1}`
                        : 'shown by default'
                      : result.index >= 0
                        ? `hidden by #${result.index + 1}`
                        : 'hidden by default'}
                  </span>
                  {style?.alertSound !== undefined &&
                    style.alertSound !== 'None' && (
                      <span className="rounded bg-black/30 px-1 py-0.5">
                        sound {style.alertSound}
                      </span>
                    )}
                  {style?.minimapIcon && (
                    <span className="rounded bg-black/30 px-1 py-0.5">
                      {style.minimapIcon.color} {style.minimapIcon.shape}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {visible.length === 0 && (
          <p className="py-16 text-center text-sm text-zinc-600">
            Nothing is visible with these settings.
          </p>
        )}
      </section>

      <footer className="mt-10 border-t border-ink-700 pt-5 text-xs leading-relaxed text-zinc-500">
        <p>
          Simulation only. Labels approximate the in-game filter and do not
          imply real stat rolls.
        </p>
        <p className="mt-1">
          This product isn't affiliated with or endorsed by Grinding Gear Games
          in any way.
        </p>
      </footer>
    </div>
  );
}