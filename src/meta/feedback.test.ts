import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BUILDS } from './builds.ts';
import { FEEDBACK_FETCHED_AT, getFeedback } from './feedback.ts';
import type { FeedbackData } from '../core/feedback.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(
  readFileSync(resolve(root, 'src/generated/feedback.json'), 'utf8'),
) as FeedbackData;
const ids = new Set(BUILDS.map((build) => build.id));

describe('baked feedback', () => {
  it('is a versioned report with a real timestamp', () => {
    expect(data.schemaVersion).toBe(1);
    expect(Number.isNaN(Date.parse(data.fetchedAt))).toBe(false);
    expect(FEEDBACK_FETCHED_AT).toBe(data.fetchedAt);
  });

  it('maps every entry to a real build and a GitHub issue', () => {
    for (const [id, entry] of Object.entries(data.builds)) {
      expect(ids.has(id), `${id} is not a compiled build`).toBe(true);
      expect(Number.isInteger(entry.issue) && entry.issue > 0, id).toBe(true);
      expect(entry.url, id).toBe(
        `https://github.com/lordgreg/buildpath/issues/${entry.issue}`,
      );
      expect(Number.isInteger(entry.up) && entry.up >= 0, id).toBe(true);
      expect(Number.isInteger(entry.down) && entry.down >= 0, id).toBe(true);
    }
  });

  it('returns nothing for a build without a thread, so a new seed stays offline', () => {
    expect(getFeedback('not-a-build')).toBeUndefined();
    const first = Object.keys(data.builds)[0];
    if (first) expect(getFeedback(first)).toEqual(data.builds[first]);
  });
});
