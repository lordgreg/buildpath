import { describe, expect, it } from 'vitest';
import { getPreset } from '../filter/presets.ts';
import {
  AUDIT_CASES,
  AUDIT_CATEGORIES,
  type ExpectContext,
} from './cases.ts';
import {
  AUDIT_PHASES,
  AUDIT_STRICTNESS,
  auditBuildRefs,
  buildAuditReport,
} from './report.ts';

const report = buildAuditReport();

describe('audit catalog', () => {
  it('has a case for every category and unique ids', () => {
    const ids = AUDIT_CASES.map((auditCase) => auditCase.id);
    expect(new Set(ids).size).toBe(ids.length);

    const covered = new Set(AUDIT_CASES.map((auditCase) => auditCase.category));
    for (const category of AUDIT_CATEGORIES) {
      expect(covered.has(category), `no case for category "${category}"`).toBe(
        true,
      );
    }
  });

  it('reports a serialisable case summary', () => {
    expect(report.cases).toHaveLength(AUDIT_CASES.length);
    expect(report.cases.every((entry) => entry.label.length > 0)).toBe(true);
  });
});

describe('audit matrix', () => {
  it('covers every family, ascendancy and meta build', () => {
    expect(auditBuildRefs().length).toBeGreaterThanOrEqual(64);
    expect(report.builds).toHaveLength(auditBuildRefs().length);
  });

  it('runs every case at every phase and strictness', () => {
    const expectedVariants = AUDIT_PHASES.length * AUDIT_STRICTNESS.length;

    for (const build of report.builds) {
      expect(build.variants).toHaveLength(expectedVariants);
      for (const variant of build.variants) {
        expect(variant.cells).toHaveLength(AUDIT_CASES.length);
        expect(variant.shown + variant.hidden).toBe(AUDIT_CASES.length);
      }
    }
  });

  it('always carries provenance for a hidden cell', () => {
    const failures: string[] = [];

    for (const build of report.builds) {
      for (const variant of build.variants) {
        for (const cell of variant.cells) {
          const { provenance } = cell;
          if (!provenance.shown) {
            if (provenance.decidedBy !== 'rule' || provenance.startLine === undefined) {
              failures.push(`${build.label} ${variant.phase}/${variant.strictness} ${cell.caseId}`);
            }
          }
          if (provenance.decidedBy === 'default' && !provenance.shown) {
            failures.push(`${build.label} ${variant.phase}/${variant.strictness} ${cell.caseId} hidden-by-default`);
          }
        }
      }
    }

    expect(failures.slice(0, 20)).toEqual([]);
  });
});

describe('audit expectations', () => {
  it('matches the recorded expected outcome for every case that declares one', () => {
    const failures: string[] = [];
    let asserted = 0;

    for (const build of report.builds) {
      for (const variant of build.variants) {
        const ctx: ExpectContext = {
          phase: variant.phase,
          strictness: variant.strictness,
          preset: getPreset(variant.phase, variant.strictness),
        };
        for (const cell of variant.cells) {
          const auditCase = AUDIT_CASES.find((entry) => entry.id === cell.caseId)!;
          if (!auditCase.expect) continue;
          const expected = auditCase.expect(ctx);
          if (expected === undefined) continue;
          asserted += 1;
          if (expected !== cell.provenance.shown) {
            failures.push(
              `${build.label} ${variant.phase}/${variant.strictness} ${cell.caseId}: expected ${expected ? 'shown' : 'hidden'}, got ${cell.provenance.shown ? 'shown' : 'hidden'} (${cell.provenance.comment ?? 'default'})`,
            );
          }
        }
      }
    }

    expect(asserted).toBeGreaterThan(1_000);
    expect(failures.slice(0, 20)).toEqual([]);
  });
});
