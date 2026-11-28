import { useEffect, useState } from 'react';
import { stepRangeLabel } from '../../core/builds/stepView.ts';
import type { StepViewRoot, StepViewStep } from '../../core/builds/stepView.ts';

function StepRow({
  entry,
  active,
  onSelect,
}: {
  entry: StepViewStep;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'step' : undefined}
      onClick={() => onSelect(entry.id)}
      className={
        active
          ? 'flex w-full items-center justify-between gap-2 rounded-md border border-gold-400/40 bg-gold-400/10 px-2.5 py-1.5 text-left text-[11px] font-medium text-gold-200'
          : 'flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2.5 py-1.5 text-left text-[11px] text-zinc-500 transition-colors hover:bg-ink-800/70 hover:text-zinc-200'
      }
    >
      <span className="truncate">{stepRangeLabel(entry)}</span>
    </button>
  );
}

/**
 * Root-first step navigation. The guide gets the full vertical menu; the
 * sticky aside uses the same component with the inactive roots collapsed.
 */
export default function StepPicker({
  roots,
  step,
  onSelect,
  variant = 'guide',
}: {
  roots: StepViewRoot[];
  step: string;
  onSelect: (id: string) => void;
  variant?: 'guide' | 'menu';
}) {
  const currentRoot = roots.find((root) => root.steps.some((entry) => entry.id === step));
  const [openRoot, setOpenRoot] = useState<string | null>(currentRoot?.id ?? null);

  useEffect(() => {
    setOpenRoot(currentRoot?.id ?? null);
  }, [currentRoot?.id]);

  return (
    <div className={variant === 'guide' ? 'rounded-lg border border-ink-700 bg-ink-900/40 p-2' : ''}>
      <div className="space-y-1">
        {roots.map((root) => {
          const open = openRoot === root.id;
          const activeRoot = currentRoot?.id === root.id;
          return (
            <div key={root.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => {
                  if (open) {
                    if (!activeRoot) setOpenRoot(null);
                    return;
                  }
                  setOpenRoot(root.id);
                  if (!activeRoot) onSelect(root.steps[0]!.id);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-ink-800/70 hover:text-zinc-200 ${
                  activeRoot ? 'text-zinc-300' : 'text-zinc-500'
                }`}
              >
                <span>{root.label}</span>
                <span className="text-[10px] font-normal normal-case tracking-normal text-zinc-600">
                  {activeRoot ? stepRangeLabel(currentRoot!.steps.find((entry) => entry.id === step)!) : `${root.steps.length}`}
                </span>
              </button>
              {open && (
                <div className="mt-1 space-y-0.5 border-l border-ink-700 pl-2">
                  {root.steps.map((entry) => (
                    <StepRow
                      key={entry.id}
                      entry={entry}
                      active={entry.id === step}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
