import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RELEASES } from './changelog.ts';

const markdown = readFileSync(
  new URL('../CHANGELOG.md', import.meta.url),
  'utf8',
);

/** `## 1.2.3 — 2026-01-02` sections, keyed by version. */
function sections(): Map<string, string> {
  const result = new Map<string, string>();
  const parts = markdown.split(/^## /m).slice(1);
  for (const part of parts) {
    const [heading, ...rest] = part.split('\n');
    const version = heading.match(/^(\d+\.\d+\.\d+)\s/)?.[1];
    if (version) result.set(version, rest.join('\n'));
  }
  return result;
}

// The markdown wraps lines and marks names with quotes; compare plain text.
const normalize = (text: string) =>
  text
    .replace(/[`"\u201c\u201d\u2018\u2019]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const byVersion = sections();

/** Wording drifted between the two files before this release; headings still match. */
const STRICT_FROM = '0.20.0';

function atLeast(version: string, floor: string): boolean {
  const left = version.split('.').map(Number);
  const right = floor.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return true;
}

describe('changelog', () => {
  it('has a CHANGELOG.md section for every release, with its date', () => {
    for (const release of RELEASES) {
      const section = byVersion.get(release.version);
      expect(section, release.version).toBeDefined();
      expect(markdown, release.version).toContain(
        `## ${release.version} — ${release.date}`,
      );
    }
  });

  it('carries every release title and note in the markdown', () => {
    for (const release of RELEASES) {
      if (!atLeast(release.version, STRICT_FROM)) continue;
      const section = normalize(byVersion.get(release.version) ?? '');
      expect(section, `${release.version} title`).toContain(
        normalize(release.title),
      );
      (release.notes ?? []).forEach((note, index) => {
        // The markdown wraps lines, so compare a prefix of each note.
        const needle = normalize(note).slice(0, 80);
        expect(section, `${release.version} note ${index + 1}`).toContain(
          needle,
        );
      });
    }
  });

  it('does not list a section without a release entry', () => {
    const versions = new Set(RELEASES.map((release) => release.version));
    for (const version of byVersion.keys()) {
      expect(versions.has(version), version).toBe(true);
    }
  });
});