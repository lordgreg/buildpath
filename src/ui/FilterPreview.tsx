import type { FilterIssue } from '../core/filter/validate.ts';

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

  return (
    <section className="rounded-xl border border-ink-700 bg-ink-950/60">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700 px-4 py-3">
        <div>
          <h2 className="text-sm font-medium text-white">Generated filter</h2>
          <p className="text-xs text-zinc-500">{fileName}</p>
        </div>
        <dl className="flex gap-4 text-right text-xs text-zinc-400">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-zinc-600">
              Rules
            </dt>
            <dd className="font-medium text-zinc-200">{ruleCount}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-zinc-600">
              Bases
            </dt>
            <dd className="font-medium text-zinc-200">{baseTypeCount}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-zinc-600">
              Lines
            </dt>
            <dd className="font-medium text-zinc-200">{lineCount}</dd>
          </div>
        </dl>
      </header>

      {warnings.length > 0 && (
        <div className="border-b border-red-900/60 bg-red-950/40 px-4 py-3 text-xs text-red-200">
          <p className="font-medium">Generator warning</p>
          <ul className="mt-1 list-inside list-disc">
            {warnings.slice(0, 5).map((warning) => (
              <li key={`${warning.line}-${warning.message}`}>
                line {warning.line}: {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <pre className="max-h-[26rem] overflow-y-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
        {text}
      </pre>
    </section>
  );
}