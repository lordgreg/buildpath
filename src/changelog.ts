export interface ReleaseCommit {
  sha: string;
  message: string;
}

export interface Release {
  version: string;
  date: string;
  title: string;
  notes: string[];
  commits: ReleaseCommit[];
  /** GitHub compare range, e.g. "v0.2.0...v0.3.0". */
  compare?: string;
}

export const REPO_URL = 'https://github.com/lordgreg/filterpath';

export const RELEASES: Release[] = [
  {
    version: '0.3.0',
    date: '2026-11-21',
    title: 'Changelog, matcher and leak proof',
    notes: [
      'Added the in-site changelog with releases and commit links.',
      'Added a rule matcher shared with the generated filter, as groundwork for the inventory preview.',
      'Added regression fixtures for the four items reported as leaking.',
      'The download panel now shows the exact in-game filter name.',
      'Install notes now explain that online filters and local files are separate.',
    ],
    commits: [
      { sha: 'b0f3f76', message: 'feat: share filter rules with a preview matcher' },
      { sha: 'bb84fff', message: 'feat: add an in-site changelog' },
    ],
    compare: 'v0.2.0...v0.3.0',
  },
  {
    version: '0.2.0',
    date: '2026-11-21',
    title: 'Versioned filters and safer BaseType names',
    notes: [
      'Filter header and file name include the build version and filter format.',
      'Every emitted BaseType is validated against a generated registry in CI.',
      'Unique names are no longer used in BaseType rules, which made the client reject the whole filter.',
      'Install path corrected to Documents/My Games/Path of Exile, including the Proton prefix.',
    ],
    commits: [
      { sha: '6d8ae5e', message: 'fix: correct the filter install folder' },
      { sha: '063d9d2', message: 'fix: only emit BaseType names the game accepts' },
      { sha: '990c54e', message: 'feat: version generated filters' },
      { sha: 'a9b7e46', message: 'docs: record M0-M1 lessons and plan preview and directory sync' },
    ],
    compare: 'v0.1.0...v0.2.0',
  },
  {
    version: '0.1.0',
    date: '2026-11-21',
    title: 'First working generator',
    notes: [
      '12 archetypes across all 7 classes, with leveling and endgame presets.',
      'Normal, Strict and Very Strict.',
      'Gear, gem, currency, map/fragment and unique sections with toggles.',
      'Deterministic emitter, syntax validator and golden filters.',
      'URL-hash sharing, download, copy and a mobile action bar.',
      'GitHub Pages deployment with tests in CI.',
    ],
    commits: [
      { sha: '9b22944', message: 'feat: scaffold FilterPath M0' },
      { sha: 'ee13717', message: 'chore(ci): update Pages workflow actions' },
      { sha: '8fabd45', message: 'feat: generate build-specific filters (M1)' },
    ],
  },
];

export function commitUrl(sha: string): string {
  return `${REPO_URL}/commit/${sha}`;
}

export function compareUrl(range: string): string {
  return `${REPO_URL}/compare/${range}`;
}

export function releaseUrl(version: string): string {
  return `${REPO_URL}/releases/tag/v${version}`;
}