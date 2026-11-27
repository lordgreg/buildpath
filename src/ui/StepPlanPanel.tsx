import type { StepPlan } from '../core/builds/types.ts';

function SlotList({
  entries,
  tone,
}: {
  entries: StepPlan['lookFor'];
  tone: 'gold' | 'amber';
}) {
  const border = tone === 'gold' ? 'border-gold-400/25' : 'border-amber-400/25';
  const label = tone === 'gold' ? 'text-gold-200' : 'text-amber-200';
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={`${entry.slot}-${entry.mods.join('|')}`} className={`rounded border ${border} bg-ink-950/30 p-2`}>
          <p className={`text-[10px] uppercase tracking-[0.16em] ${label}`}>{entry.slot}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {entry.mods.map((mod) => (
              <span
                key={mod}
                className="rounded bg-ink-800/80 px-1.5 py-0.5 text-[10px] leading-snug text-zinc-300"
              >
                {mod}
              </span>
            ))}
          </div>
          {entry.note && (
            <p className="mt-1 text-[10px] leading-snug text-zinc-500">{entry.note}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The section heading above already names the step plan and the step chip, so
 * the panel starts straight at the content instead of repeating both.
 */
export default function StepPlanPanel({ plan, step }: { plan: StepPlan; step: string }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/40 p-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <section aria-labelledby={`goals-${step}`}>
          <h4
            id={`goals-${step}`}
            className="text-[10px] uppercase tracking-[0.16em] text-emerald-300"
          >
            Goals this step
          </h4>
          <ul className="mt-1.5 space-y-1 text-xs leading-snug text-zinc-300">
            {plan.goals.map((goal) => (
              <li key={goal} className="flex gap-1.5">
                <span aria-hidden className="text-emerald-400">
                  +
                </span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby={`look-${step}`}>
          <h4
            id={`look-${step}`}
            className="text-[10px] uppercase tracking-[0.16em] text-gold-200"
          >
            Attributes to look for
          </h4>
          <div className="mt-1.5">
            <SlotList entries={plan.lookFor} tone="gold" />
          </div>
        </section>
      </div>
      {plan.crafting && plan.crafting.length > 0 && (
        <section aria-labelledby={`craft-${step}`} className="mt-3 border-t border-ink-700 pt-3">
          <h4
            id={`craft-${step}`}
            className="text-[10px] uppercase tracking-[0.16em] text-amber-200"
          >
            Crafting this step
          </h4>
          <div className="mt-1.5">
            <SlotList entries={plan.crafting} tone="amber" />
          </div>
        </section>
      )}
    </div>
  );
}
