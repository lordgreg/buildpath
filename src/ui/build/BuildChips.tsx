import type { BuildChip } from '../../core/builds/types.ts';

const CHIP_STYLE: Record<BuildChip['kind'], string> = {
  ssf: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  defence: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  playstyle: 'border-gold-400/40 bg-gold-400/10 text-gold-200',
  note: 'border-ink-600 bg-ink-900/70 text-zinc-400',
  season: 'border-violet-400/40 bg-violet-500/10 text-violet-200',
};

/** The catalogue's build tags, reused on the guide header. */
export default function BuildChips({
  chips,
  bare = false,
}: {
  chips: BuildChip[];
  bare?: boolean;
}) {
  return (
    <ul className={`flex flex-wrap gap-1.5 ${bare ? '' : 'mt-2'}`}>
      {chips.map((chip) => (
        <li key={`${chip.kind}-${chip.label}`}>
          <span
            title={chip.title}
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${CHIP_STYLE[chip.kind]}`}
          >
            {chip.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
