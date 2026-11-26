import { describe, expect, it } from 'vitest';
import {
  applyBuildStaleness,
  evaluateStaleness,
  leagueWindowOpen,
} from './staleness.ts';

describe('league window', () => {
  it('keeps the first 72 hours closed', () => {
    expect(leagueWindowOpen('2026-11-21T12:00:00Z', '2026-11-21T00:00:00Z')).toBe(false);
    expect(leagueWindowOpen('2026-11-23T23:00:00Z', '2026-11-21T00:00:00Z')).toBe(false);
    expect(leagueWindowOpen('2026-11-24T00:00:00Z', '2026-11-21T00:00:00Z')).toBe(true);
  });
});

describe('patch staleness', () => {
  const current = {
    pobRef: 'v1',
    patch: '3.30.0',
    treeVersion: '3_30',
    patchHash: 'abc123',
  };

  it('waits when there is no current patch fact set', () => {
    expect(evaluateStaleness({ patchHash: 'abc123' }, undefined).status).toBe(
      'waiting-for-pob',
    );
  });

  it('delists a build verified against a different fact set', () => {
    expect(evaluateStaleness({ patchHash: 'old' }, current)).toEqual({
      status: 'stale',
      reason: expect.stringContaining('old'),
    });
  });

  it('keeps a matching build current', () => {
    expect(evaluateStaleness({ patchHash: 'abc123' }, current).status).toBe('current');
  });

  it('delists the whole catalogue when the patch hash moves', () => {
    const builds = [
      { status: 'verified', pipeline: { patchHash: 'old' } },
      { status: 'verified', pipeline: { patchHash: 'old' } },
    ];
    applyBuildStaleness(builds, current);
    expect(builds.map((build) => build.status)).toEqual(['stale', 'stale']);
  });
});
