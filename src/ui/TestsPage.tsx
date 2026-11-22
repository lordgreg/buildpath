import { useMemo, useState } from 'react';
import { AUDIT_CASES } from '../core/audit/cases.ts';
import {
  AUDIT_PHASES,
  AUDIT_STRICTNESS,
  buildAuditReport,
  type AuditBuild,
  type AuditVariant,
} from '../core/audit/report.ts';
import { STRICTNESS_LABELS_PUBLIC } from '../core/filter/presets.ts';

const CASE_BY_ID = new Map(AUDIT_CASES.map((entry) => [entry.id, entry]));

type Kind = 'all' | 'family' | 'ascendancy' | 'meta';

interface Selection {
  build: string;
  phase: string;
  strictness: string;
  caseId: string;
}

function readHash(): Selection | null {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const [build, phase, strictness, caseId] = raw.split('|');
  if (!build || !phase || !strictness || !caseId) return null;
  return { build, phase, strictness, caseId };
}

function cellClass(shown: boolean, decidedBy: 'rule' | 'default'): string {
  if (!shown) return 'bg-rose-950/70 hover:bg-rose-900';
  if (decidedBy === 'default') return 'bg-sky-950/60 hover:bg-sky-900/70';
  return 'bg-emerald-950/60 hover:bg-emerald-900/70';
}

export default function TestsPage() {
  const report = useMemo(() => buildAuditReport(), []);
  const [kind, setKind] = useState<Kind>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Selection | null>(() => readHash());

  const builds = report.builds.filter(
    (build) =>
      (kind === 'all' || build.kind === kind) &&
      build.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const totalVariants = report.builds.length * AUDIT_PHASES.length * AUDIT_STRICTNESS.length;

  const detail = useMemo(() => {
    if (!selection) return null;
    const build = report.builds.find((entry) => entry.label === selection.build);
    const variant = build?.variants.find(
      (entry) =>
        entry.phase === selection.phase &&
        entry.strictness === selection.strictness,
    );
    const cell = variant?.cells.find((entry) => entry.caseId === selection.caseId);
    const auditCase = CASE_BY_ID.get(selection.caseId);
    if (!build || !variant || !cell || !auditCase) return null;
    return { build, variant, cell, auditCase };
  }, [report, selection]);

  function toggle(label: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function select(build: AuditBuild, variant: AuditVariant, caseId: string) {
    const next: Selection = {
      build: build.label,
      phase: variant.phase,
      strictness: variant.strictness,
      caseId,
    };
    setSelection(next);
    window.history.replaceState(
      null,
      '',
      `#${[next.build, next.phase, next.strictness, next.caseId]
        .map(encodeURIComponent)
        .join('|')}`,
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-400">
          Path of Exile 1
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Behaviour audit
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Every preset the generator ships, run through the real matcher against a
          catalog of labelled drops. Each cell shows whether the item is visible
          and, when you open it, the exact rule and emitted line that decided it.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          App v{report.version} - presets {report.presetVersion} - league{' '}
          {report.league} - {report.builds.length} builds - {totalVariants} variants
        </p>
        <nav className="mt-5 flex flex-wrap items-center gap-4 text-xs">
          <a
            href="./"
            className="rounded-lg bg-gold-400 px-3 py-2 font-semibold text-ink-950 hover:bg-gold-300"
          >
            Back to builder
          </a>
          <a
            href="./demo.html"
            className="text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            loot simulator
          </a>
          <a
            href="./changelog.html"
            className="text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            changelog
          </a>
        </nav>
      </header>

      <section className="mt-8 rounded-xl border border-ink-700 bg-ink-800/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-ink-700 p-0.5 text-xs">
            {(['all', 'family', 'ascendancy', 'meta'] as Kind[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={
                  kind === value
                    ? 'rounded-md bg-gold-400 px-2.5 py-1 font-semibold text-ink-950'
                    : 'rounded-md px-2.5 py-1 text-zinc-400 hover:text-zinc-200'
                }
              >
                {value}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter builds..."
            className="min-w-40 flex-1 rounded-lg border border-ink-700 bg-ink-950/60 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600"
          />
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-emerald-950/80 ring-1 ring-emerald-700/60" />
              shown by rule
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-sky-950/80 ring-1 ring-sky-700/60" />
              shown by default
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-rose-950/80 ring-1 ring-rose-800/60" />
              hidden
            </span>
          </div>
        </div>
      </section>

      {detail && (
        <section className="mt-4 rounded-xl border border-gold-400/40 bg-ink-900/70 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">
              {detail.auditCase.label}{' '}
              <span className="ml-1 rounded bg-ink-700/70 px-1.5 py-0.5 text-[10px] font-normal text-zinc-300">
                {detail.auditCase.category}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              close
            </button>
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Preset" value={detail.build.label} />
            <Field
              label="Phase / strictness"
              value={`${detail.variant.phase} / ${STRICTNESS_LABELS_PUBLIC[detail.variant.strictness]}`}
            />
            <Field
              label="Outcome"
              value={detail.cell.provenance.shown ? 'shown' : 'hidden'}
            />
            <Field
              label="Decided by"
              value={
                detail.cell.provenance.decidedBy === 'rule'
                  ? `rule ${detail.cell.provenance.ruleId ?? ''} (${detail.cell.provenance.section ?? '?'})`
                  : 'default (no rule matched)'
              }
            />
            <Field
              label="Rule comment"
              value={detail.cell.provenance.comment ?? '-'}
            />
            <Field
              label="Emitted line"
              value={
                detail.cell.provenance.startLine !== undefined
                  ? `${detail.cell.provenance.startLine}${
                      detail.cell.provenance.endLine !== undefined &&
                      detail.cell.provenance.endLine !== detail.cell.provenance.startLine
                        ? `-${detail.cell.provenance.endLine}`
                        : ''
                    }`
                  : '-'
              }
            />
            <Field label="File" value={detail.variant.fileName} />
            <Field
              label="Item"
              value={`${detail.auditCase.item.baseType} - ${detail.auditCase.item.rarity} - ilvl ${detail.auditCase.item.itemLevel}`}
            />
            {detail.auditCase.note && (
              <Field label="Note" value={detail.auditCase.note} />
            )}
          </dl>
        </section>
      )}

      <main className="mt-6 space-y-2">
        {builds.map((build) => (
          <article
            key={build.label}
            className="overflow-hidden rounded-xl border border-ink-700 bg-ink-800/30"
          >
            <button
              type="button"
              onClick={() => toggle(build.label)}
              className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-sm text-zinc-200">
                <span
                  aria-hidden="true"
                  className={`text-[10px] text-zinc-500 transition-transform ${
                    open.has(build.label) ? 'rotate-90' : ''
                  }`}
                >
                  {'>'}
                </span>
                {build.label}
                <span className="rounded bg-ink-700/70 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  {build.kind}
                </span>
              </span>
              <span className="text-[11px] text-zinc-500">
                {build.variants.length} variants
              </span>
            </button>

            {open.has(build.label) && (
              <div className="overflow-x-auto border-t border-ink-700 px-3 pb-3">
                <table className="border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-ink-800/95" />
                      {AUDIT_CASES.map((auditCase) => (
                        <th
                          key={auditCase.id}
                          className="h-24 w-6 p-0 align-bottom"
                          title={`${auditCase.label} (${auditCase.category})`}
                        >
                          <span className="block whitespace-nowrap text-[10px] text-zinc-500 [writing-mode:vertical-rl]">
                            {auditCase.label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {build.variants.map((variant) => (
                      <tr key={`${variant.phase}-${variant.strictness}`}>
                        <th className="sticky left-0 z-10 whitespace-nowrap bg-ink-800/95 pr-3 text-right text-[11px] font-normal text-zinc-400">
                          {variant.phase} /{' '}
                          {STRICTNESS_LABELS_PUBLIC[variant.strictness]}
                          <span className="ml-2 text-zinc-600">
                            {variant.hidden > 0 ? `-${variant.hidden}` : ''}
                          </span>
                        </th>
                        {variant.cells.map((cell) => {
                          const isSelected =
                            selection?.build === build.label &&
                            selection.phase === variant.phase &&
                            selection.strictness === variant.strictness &&
                            selection.caseId === cell.caseId;
                          return (
                            <td key={cell.caseId} className="p-0.5">
                              <button
                                type="button"
                                onClick={() => select(build, variant, cell.caseId)}
                                title={cell.caseId}
                                className={`block h-5 w-5 rounded-sm ${cellClass(
                                  cell.provenance.shown,
                                  cell.provenance.decidedBy,
                                )} ${isSelected ? 'ring-2 ring-gold-400' : 'ring-1 ring-ink-700'}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        ))}
        {builds.length === 0 && (
          <p className="rounded-xl border border-ink-700 bg-ink-800/30 px-4 py-6 text-center text-sm text-zinc-500">
            No builds match this filter.
          </p>
        )}
      </main>

      <footer className="mt-10 border-t border-ink-700 pt-4 text-[11px] text-zinc-600">
        Generated from the same rule set the builder downloads; the page never
        calls the network. This product isn't affiliated with or endorsed by
        Grinding Gear Games in any way.
      </footer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-zinc-600">
        {label}
      </dt>
      <dd className="break-words text-zinc-300">{value}</dd>
    </div>
  );
}
