import type { BuildPipelineInfo, GateResult } from '../../core/builds/types.ts';
import { stepRangeLabel } from '../../core/builds/stepView.ts';
import type { StepViewStep } from '../../core/builds/stepView.ts';
import CollapsibleSection from './CollapsibleSection.tsx';

function n(value: number): string {
  return value.toLocaleString('en-US');
}

function dps(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function gateRows(gate: GateResult): { label: string; value: string; rule: string }[] {
  const t = gate.thresholds ?? {};
  const resists =
    t.resists === false
      ? 'not required'
      : `>= ${typeof t.resistanceFloor === 'number' ? t.resistanceFloor : 75}%`;
  const chaos = typeof t.chaosResist === 'number' ? `>= ${t.chaosResist}%` : '-';
  return [
    {
      label: 'Damage',
      value: dps(gate.metrics.dps),
      rule: typeof t.dps === 'number' ? `>= ${dps(t.dps)}` : '-',
    },
    {
      label: 'Life',
      value: n(gate.metrics.life),
      rule: typeof t.life === 'number' ? `>= ${n(t.life)}` : '-',
    },
    {
      label: 'EHP',
      value: n(gate.metrics.ehp),
      rule: typeof t.ehp === 'number' ? `>= ${n(t.ehp)}` : '-',
    },
    {
      label: 'Physical max hit',
      value: n(gate.metrics.maxHit),
      rule: typeof t.maxHit === 'number' ? `>= ${n(t.maxHit)}` : '-',
    },
    {
      label: 'Elemental resists',
      value: gate.metrics.resists.map((value) => `${value}%`).join(' / '),
      rule: resists,
    },
    { label: 'Chaos resist', value: `${gate.metrics.chaosResist ?? -100}%`, rule: chaos },
    { label: 'Passive points', value: n(gate.metrics.nodes), rule: '-' },
    { label: 'Jewel sockets', value: n(gate.metrics.sockets ?? 0), rule: '-' },
    { label: 'Ascendancy nodes', value: n(gate.metrics.ascendancy), rule: '-' },
  ];
}

/** Compact gate evidence: key numbers in the summary, the full table on open. */
export default function GateReport({
  gate,
  pipeline,
  current,
  measuredStep,
}: {
  gate: GateResult;
  pipeline: BuildPipelineInfo | undefined;
  current: StepViewStep | undefined;
  measuredStep: StepViewStep | undefined;
}) {
  const failures = gate.failures.length;
  return (
    <CollapsibleSection
      id="gates"
      title="Gate report"
      storageKey="build-gate-open"
      summary={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span
              className={
                gate.pass
                  ? 'rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 uppercase tracking-wide text-emerald-300'
                  : 'rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 uppercase tracking-wide text-rose-300'
              }
            >
              {gate.pass ? 'pass' : 'fail'}
            </span>
            {!gate.pass && <span className="text-rose-300">{failures} gate failures</span>}
          </span>
          <span>
            Damage <span className="text-zinc-200">{dps(gate.metrics.dps)}</span>
          </span>
          <span>
            Life <span className="text-zinc-200">{n(gate.metrics.life)}</span>
          </span>
          <span>
            Ascendancy <span className="text-zinc-200">{n(gate.metrics.ascendancy)}</span>
          </span>
        </span>
      }
    >
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        {pipeline?.calibrated ? 'Calibrated gates' : 'Gates are not calibrated yet'} - PoB{' '}
        {pipeline?.pobRef ?? 'unknown'} - tree {pipeline?.treeVersion ?? 'unknown'}
        {pipeline && !pipeline.calibrated && (
          <span className="ml-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
            uncalibrated thresholds
          </span>
        )}
        {current && !current.measured && measuredStep && (
          <span className="ml-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
            this step is not measured - showing {stepRangeLabel(measuredStep)}
          </span>
        )}
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
        Measured with this step&apos;s listed flasks active. A separate no-flask run is
        recorded for every build in the validation report.
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-[10px] uppercase tracking-[0.14em] text-zinc-600 hover:text-zinc-400">
          How this was measured
        </summary>
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
          PoB config: enemy level from the checkpoint and enemy evasion from the pinned
          table; no Trauma, Rage or Endurance Charge overrides.
        </p>
      </details>

      <article
        className={
          gate.pass
            ? 'mt-3 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04]'
            : 'mt-3 overflow-hidden rounded-lg border border-rose-500/30 bg-rose-500/[0.04]'
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700/80 px-3 py-2">
          <p className="text-[11px] text-zinc-400">
            level {gate.level} - {gate.budget}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {gate.gateProfile === 'dad' && (
              <span
                title="Dad profile: the defensive gates are unchanged, but the damage floor is lower for a low-APM/DoT/totem build."
                className="rounded border border-fuchsia-500/40 bg-fuchsia-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-fuchsia-300"
              >
                Dad profile
              </span>
            )}
            <span
              className={
                gate.pass
                  ? 'rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300'
                  : 'rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-rose-300'
              }
            >
              {gate.pass ? 'pass' : 'fail'}
            </span>
          </div>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              <th className="px-3 py-1.5 font-normal">Metric</th>
              <th className="px-3 py-1.5 font-normal">Measured</th>
              <th className="px-3 py-1.5 font-normal">Gate</th>
            </tr>
          </thead>
          <tbody>
            {gateRows(gate).map((row) => (
              <tr key={row.label} className="border-t border-ink-800/80">
                <td className="px-3 py-1 text-zinc-500">{row.label}</td>
                <td className="px-3 py-1 text-zinc-200">{row.value}</td>
                <td className="px-3 py-1 text-zinc-500">{row.rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {gate.failures.length > 0 && (
          <ul className="space-y-0.5 border-t border-rose-500/20 bg-rose-500/[0.04] px-3 py-2 text-[11px] text-rose-200">
            {gate.failures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        )}
      </article>
    </CollapsibleSection>
  );
}
