import type { ReactNode } from 'react';
import CollapseChevron from '../CollapseChevron.tsx';
import { usePersistedOpen } from '../usePersistedOpen.ts';

/**
 * The filter page's collapsible section, shared with the build guide so the
 * gate report and changelog read as the same control.
 */
export default function CollapsibleSection({
  id,
  title,
  summary,
  defaultOpen = false,
  storageKey,
  children,
}: {
  id?: string;
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  storageKey: string;
  children: ReactNode;
}) {
  const [open, setOpen] = usePersistedOpen(storageKey, defaultOpen);
  return (
    <details
      id={id}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="min-w-0 rounded-xl border border-ink-700 bg-ink-800/40 p-4 sm:p-5"
    >
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-sm font-medium text-white">
          <CollapseChevron open={open} />
          {title}
        </span>
        {summary}
      </summary>
      {children}
    </details>
  );
}
