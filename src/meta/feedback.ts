import data from '../generated/feedback.json';
import type { BuildFeedback, FeedbackData } from '../core/feedback.ts';

/**
 * The baked visitor feedback. GitHub reactions are fetched by the weekly
 * `feedback` Action and committed, so the page reads counts from the same
 * offline bundle as the rest of the build data.
 */
const feedback = data as unknown as FeedbackData;

/** When the counts last changed; a quiet week does not move it. */
export const FEEDBACK_FETCHED_AT = feedback.fetchedAt;

export function getFeedback(buildId: string): BuildFeedback | undefined {
  return feedback.builds[buildId];
}
