import { useState, type MouseEvent } from 'react';
import type { FilterIssue } from '../core/filter/validate.ts';
import { copyText } from './download.ts';
import CollapseChevron from './CollapseChevron.tsx';
import { usePersistedOpen } from './usePersistedOpen.ts';

interface FilterPreviewProps {
  text: string;
  fileName: string;
  ruleCount: number;
  baseTypeCount: number;
  warnings: FilterIssue[];
}

export default function FilterPreview({
  text,
  fileName,
  ruleCount,
  baseTypeCount,
  warnings,
}: FilterPreviewProps) {
  const lineCount = text.split('\n').length - 1;
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = usePersistedOpen('preview-open');

  const copy = async (event: MouseEvent) => {
    // The button sits inside the <summary>, so keep the click from toggling.
    event.preventDefault();
    event.stopPropagation();
    if (await copyText(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="min-w-0 rounded-xl border border-ink-700 bg-ink-950/60"
    >
      <summary className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-white">
          <CollapseChevron open={open} />
          Generated filter
        </h2>
        <span className="min-w-0 break-words text-xs text-zinc-500">
          {fileName}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <span className="flex gap-4 text-right text-xs text-zinc-400">
            <span>
              <span className="block text-[10px] uppercase tracking-wider text-zinc-600">
                Rules
              </span>
              <span className="block font-medium text-zinc-200">
                {ruleCount}
              </span>
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-wider text-zinc-600">
                Bases
              </span>
              <span className="block font-medium text-zinc-200">
                {baseTypeCount}
              </span>
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-wider text-zinc-600">
                Lines
              </span>
              <span className="block font-medium text-zinc-200">
                {lineCount}
              </span>
            </span>
          </span>
          <span className="h-6 w-px shrink-0 bg-ink-700" aria-hidden="true" />
          <button
            type="button"
            onClick={(event) => void copy(event)}
            aria-label="Copy filter"
            title={copied ? 'Copied' : 'Copy filter'}
            className={`rounded-lg border border-ink-600 bg-ink-900/70 p-1.5 transition-colors hover:border-ink-500 ${
              copied ? 'text-emerald-300' : 'text-zinc-200'
            }`}
          >
            {copied ? (
              <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
                <path
                  d="M3.5 8.5l3 3 6-6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
                <rect
                  x="6"
                  y="6"
                  width="7.5"
                  height="7.5"
                  rx="1.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M4 10H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h5.5A1.5 1.5 0 0 1 10 3v1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </span>
      </summary>

      {warnings.length > 0 && (
        <div className="border-b border-red-900/60 bg-red-950/40 px-4 py-3 text-xs text-red-200">
          <p className="font-medium">Generator warning</p>
          <ul className="mt-1 list-inside list-disc">
            {warnings.slice(0, 5).map((warning) => (
              <li key={`${warning.line ?? ''}-${warning.message}`}>
                {warning.line !== undefined && `line ${warning.line}: `}
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <pre className="max-h-[26rem] overflow-y-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
        {text}
      </pre>
    </details>
  );
}
