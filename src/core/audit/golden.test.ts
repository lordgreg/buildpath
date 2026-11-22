import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { behaviourSummary, buildAuditReport } from './report.ts';

const goldenUrl = new URL('./__golden__/audit-summary.txt', import.meta.url);
const summary = behaviourSummary(buildAuditReport());

describe('behaviour golden', () => {
  it('matches the committed behaviour summary', () => {
    // Regenerate with `AUDIT_WRITE=1 npm test` after reviewing a diff.
    if (process.env.AUDIT_WRITE) {
      writeFileSync(goldenUrl, summary);
    }
    expect(summary).toBe(readFileSync(goldenUrl, 'utf8'));
  });
});
