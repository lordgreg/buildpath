import { getFeedback, FEEDBACK_FETCHED_AT } from '../meta/feedback.ts';

function votesLabel(counts: { up: number; down: number }): string {
  const total = counts.up + counts.down;
  if (total === 0) return 'no votes yet';
  return `${total} vote${total === 1 ? '' : 's'}`;
}

/**
 * Visitor feedback, separate from the editorial ratings. The counts are baked
 * into the bundle by the weekly feedback Action; the vote itself happens on
 * GitHub, so the page makes no network call.
 */
export default function FeedbackPanel({ buildId }: { buildId: string }) {
  const feedback = getFeedback(buildId);
  if (!feedback) return null;
  return (
    <section
      aria-labelledby="feedback"
      className="rounded-lg border border-ink-700 bg-ink-900/40 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3
            id="feedback"
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
          >
            Player feedback
          </h3>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-zinc-300">
            <span title="Thumbs up">
              <span aria-hidden="true">👍</span> {feedback.up}
            </span>
            <span title="Thumbs down">
              <span aria-hidden="true">👎</span> {feedback.down}
            </span>
            <span className="text-[10px] text-zinc-600">{votesLabel(feedback)}</span>
          </p>
        </div>
        <a
          href={feedback.url}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded border border-ink-600 bg-ink-800/60 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-gold-400 hover:text-gold-200"
        >
          Vote on GitHub
        </a>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
        Votes live on GitHub, so they need a GitHub account and are public.
        Counts last updated {FEEDBACK_FETCHED_AT.slice(0, 10)}. This is feedback,
        not a ranking: it never changes the catalogue order or the editorial
        rating.
      </p>
    </section>
  );
}
