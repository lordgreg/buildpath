import type { BuildMedal, BuildRatings } from '../core/builds/ratings.ts';
import { RATING_AXES } from '../core/builds/ratings.ts';

const MEDAL_STYLE: Record<BuildMedal, string> = {
  C: 'border-zinc-500/50 bg-zinc-500/10 text-zinc-300',
  B: 'border-sky-500/50 bg-sky-500/10 text-sky-300',
  A: 'border-gold-400/60 bg-gold-400/10 text-gold-200',
  S: 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200',
  'S+': 'border-fuchsia-400/60 bg-fuchsia-400/10 text-fuchsia-200',
};

export function MedalBadge({ medal, small = false }: { medal: BuildMedal; small?: boolean }) {
  return (
    <span
      title={`BuildPath medal ${medal}`}
      className={`inline-flex items-center justify-center rounded-full border font-semibold tracking-wide ${
        MEDAL_STYLE[medal]
      } ${small ? 'h-7 min-w-7 px-1.5 text-[11px]' : 'h-12 min-w-12 px-2 text-lg'}`}
    >
      {medal}
    </span>
  );
}

export default function RatingPanel({
  ratings,
  medal,
}: {
  ratings: BuildRatings;
  medal: BuildMedal;
}) {
  return (
    <section aria-labelledby="ratings" className="rounded-lg border border-ink-700 bg-ink-900/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="ratings"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
          >
            Ratings
          </h2>
          <p className="mt-0.5 text-[10px] text-zinc-600">Editorial 1–10; 10 is best.</p>
        </div>
        <div className="text-center">
          <MedalBadge medal={medal} />
          <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-zinc-600">medal</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {RATING_AXES.map((axis) => {
          const value = ratings[axis.key];
          return (
            <div key={axis.key}>
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="text-zinc-400">{axis.label}</span>
                <span className="text-zinc-200">{value}/10</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
                  style={{ width: `${value * 10}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
