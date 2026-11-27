import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BUILDS } from './builds.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const reportPath = resolve(root, 'src/generated/builds/validation/no-flasks.json');
const calibrationPath = resolve(root, 'src/generated/builds/calibration.json');

interface NoFlaskResult {
  id: string;
  seed: string;
  step: string;
  metrics: {
    dps: number;
    life: number;
    ehp: number;
    maxHit: number;
    chaosResist: number;
  };
  thresholds: Record<string, unknown>;
  pass: boolean;
  failures: string[];
}

interface NoFlaskReport {
  schemaVersion: number;
  scenario: string;
  pobRef: string;
  gatesHash: string;
  allPass: boolean;
  failedCount: number;
  stepCount: number;
  results: NoFlaskResult[];
}

const report = JSON.parse(readFileSync(reportPath, 'utf8')) as NoFlaskReport;
const calibration = JSON.parse(readFileSync(calibrationPath, 'utf8')) as {
  pobRef: string;
  gatesHash: string;
};

function measuredIds(buildId: string): string[] {
  const build = JSON.parse(
    readFileSync(resolve(root, `src/generated/builds/${buildId}.json`), 'utf8'),
  ) as {
    steps?: { sub: { id: string; measure?: boolean }[] }[];
    gates?: Record<string, unknown>;
  };
  if (build.steps) {
    return build.steps.flatMap((root) =>
      root.sub.filter((step) => step.measure).map((step) => `${buildId}/${step.id}`),
    );
  }
  return Object.keys(build.gates ?? {}).map((id) => `${buildId}/${id}`);
}

describe('no-flask validation report', () => {
  it('records the no-flasks scenario against the current gates', () => {
    expect(report.scenario).toBe('no-flasks');
    expect(report.schemaVersion).toBe(1);
    expect(report.pobRef).toBe(calibration.pobRef);
    expect(report.gatesHash).toBe(calibration.gatesHash);
    expect(report.allPass).toBe(report.failedCount === 0);
  });

  it('covers every measured step and clears the floors for the reviewed build', () => {
    const expected = BUILDS.flatMap((build) => measuredIds(build.id)).sort();
    const actual = report.results.map((result) => result.id).sort();
    expect(actual).toEqual(expected);
    expect(report.stepCount).toBe(expected.length);
    const reviewed = report.results.filter(
      (result) => result.seed === 'boneshatter-juggernaut',
    );
    expect(reviewed).toHaveLength(7);
    for (const result of reviewed) {
      expect(result.pass, result.id).toBe(true);
      expect(result.failures, result.id).toEqual([]);
    }
    for (const result of report.results) {
      expect(Object.keys(result.metrics).sort(), result.id).toEqual([
        'chaosResist',
        'dps',
        'ehp',
        'life',
        'maxHit',
      ]);
    }
  });
});
