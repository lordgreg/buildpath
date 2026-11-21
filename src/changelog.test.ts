import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { RELEASES } from './changelog.ts';

describe('changelog', () => {
  it('starts with the package version', () => {
    expect(RELEASES[0]?.version).toBe(pkg.version);
  });

  it('lists versions newest first without duplicates', () => {
    const versions = RELEASES.map((release) => release.version);
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toEqual([...versions].sort((a, b) => (a < b ? 1 : -1)));
  });

  it('uses valid commit references', () => {
    for (const release of RELEASES) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.notes.length).toBeGreaterThan(0);
      for (const commit of release.commits) {
        expect(commit.sha, release.version).toMatch(/^[0-9a-f]{7,40}$/);
        expect(commit.message.length, release.version).toBeGreaterThan(0);
      }
      if (release.compare) {
        expect(release.compare).toMatch(/^v[\d.]+\.\.\.v[\d.]+$/);
      }
    }
  });
});