/**
 * Visitor feedback on a build guide, collected as GitHub reactions.
 *
 * The site is static and makes no runtime network calls, so votes live on a
 * per-build GitHub issue and a scheduled Action bakes the counts into
 * `src/generated/feedback.json`. This module is the pure half: reaction
 * counting and the issue text, with no Node or browser APIs.
 */

export interface FeedbackCounts {
  up: number;
  down: number;
}

export interface BuildFeedback extends FeedbackCounts {
  /** The GitHub issue the reactions live on. */
  issue: number;
  /** Public issue URL, so the page never has to construct it. */
  url: string;
}

export interface FeedbackData {
  schemaVersion: 1;
  /** When the counts last changed, not when the Action last ran. */
  fetchedAt: string;
  builds: Record<string, BuildFeedback>;
}

export const FEEDBACK_LABEL = 'guide-feedback';
export const FEEDBACK_REPO = 'lordgreg/buildpath';
export const SITE_URL = 'https://lordgreg.github.io/buildpath';

/** GitHub reaction content values: thumbs up and thumbs down only. */
export function summariseReactions(contents: readonly string[]): FeedbackCounts {
  let up = 0;
  let down = 0;
  for (const content of contents) {
    if (content === '+1') up += 1;
    else if (content === '-1') down += 1;
  }
  return { up, down };
}

/** Stable marker in the issue body; survives a title edit. */
export function feedbackIssueMarker(buildId: string): string {
  return `<!-- buildpath-feedback:${buildId} -->`;
}

export function feedbackIssueTitle(buildName: string): string {
  return `Guide feedback: ${buildName}`;
}

/**
 * The issue body. It states the rule plainly: votes are feedback, not a
 * popularity ranking, so a build page can show them without contradicting the
 * catalogue's editorial order.
 */
export function feedbackIssueBody(build: { id: string; name: string }): string {
  return [
    `Vote with 👍 if this guide worked for you, and 👎 if it did not.`,
    '',
    `This thread is **guide feedback, not a popularity ranking**. The catalogue order stays editorial, and votes never change a build's rating.`,
    '',
    `Guide: ${SITE_URL}/build.html#build=${build.id}`,
    '',
    feedbackIssueMarker(build.id),
  ].join('\n');
}
