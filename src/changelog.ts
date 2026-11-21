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
    version: '0.9.1',
    date: '2026-11-21',
    title: 'Game-like loot simulator and always-on sections',
    notes: [
      'The loot simulator now uses an original game-like ground background.',
      'Drops are scattered as overlapping in-game-style labels, with a Scatter button.',
      'Clicking a label shows the matching rule and reason.',
      'Removed the section toggles: all sections are always included, and advanced clones control overrides.',
    ],
    commits: [
      {
        sha: 'd54704c',
        message: 'feat: game-like loot simulator and always-on sections (0.9.1)',
      },
    ],
    compare: 'v0.9.0...v0.9.1',
  },
  {
    version: '0.9.0',
    date: '2026-11-21',
    title: 'Themes, per-section strictness and saved builds',
    notes: [
      'Added three filter themes: Classic, High contrast and Muted.',
      'Per-section strictness for gear, gems, currency, maps and uniques; the global choice still sets all five.',
      'Saved builds in localStorage, with load and delete.',
      'Theme and section strictness round-trip through share links and clone keys.',
      'The filter header records non-default section strictness.',
    ],
    commits: [
      {
        sha: '883ff8f',
        message: 'feat: add themes, per-section strictness and saved builds (M2a)',
      },
    ],
    compare: 'v0.8.0...v0.9.0',
  },
  {
    version: '0.8.0',
    date: '2026-11-21',
    title: 'Loot simulator, style editing and share links',
    notes: [
      'Added a loot simulator page that shows drops with their filter labels.',
      'Paste item text from the game to add it to the simulation; parses class, rarity, base, item level, sockets, links, quality, stack size and map tier.',
      'Per-rule style editing: text, border, background, font size and alert sound.',
      'Share codes can now be copied as a link; opening the link imports the clone automatically.',
      'The builder header links to the simulator with the current selection.',
    ],
    commits: [
      {
        sha: 'ec8a45e',
        message: 'feat: add loot simulator, style editing and share links (0.8.0)',
      },
    ],
    compare: 'v0.7.0...v0.8.0',
  },
  {
    version: '0.7.0',
    date: '2026-11-21',
    title: 'Advanced rules, locked presets and clones',
    notes: [
      'Every generated rule is shown in a locked, section-grouped pane.',
      'Whole-set clones are stored in localStorage and replace the generated rules for that exact selection.',
      'Rule editor: enable, reorder, duplicate, delete, change action, comment, rarity, item level and Continue.',
      'New rules can be built from DEX/STR/INT requirement chips, Head, Weapon 2H and Weapon ranged.',
      'RePoE base data now keeps attribute requirements for accurate chips.',
      'Export/import JSON and compressed share codes, capped at 8 KB with a file fallback.',
      'Stale clones warn when the locked preset changes and never merge silently.',
    ],
    commits: [
      {
        sha: 'a4bba89',
        message: 'feat: add advanced rules, locked presets and clones (M2g)',
      },
    ],
    compare: 'v0.6.0...v0.7.0',
  },
  {
    version: '0.6.0',
    date: '2026-11-21',
    title: 'Independent family, ascendancy and meta modes',
    notes: [
      'Replaced the cascade with three independent modes: by family, by ascendancy and by meta build.',
      'Ascendancy mode uses a default family loadout, e.g. Juggernaut two-hand axe or Deadeye bow.',
      'Meta mode lists every snapshot skill grouped by family, then the ascendancy.',
      'Presets moved to YAML under src/presets, compiled to JSON with JSON Schema validation.',
      'Mode-aware file names and share links; old cascade and archetype links still resolve.',
      'meta:add now edits YAML and rebuilds the compiled presets.',
    ],
    commits: [
      {
        sha: '6f70b51',
        message: 'feat: add independent family, ascendancy and meta modes (M2f)',
      },
    ],
    compare: 'v0.5.0...v0.6.0',
  },
  {
    version: '0.5.0',
    date: '2026-11-21',
    title: 'Inventory preview with original icons',
    notes: [
      'Added a paper-doll preview: weapon, offhand, all four armour slots, belt, amulet, two rings, jewel and two flasks.',
      'Added the 12 x 5 inventory grid with representative drops, including the reported leak cases.',
      'Original FilterPath SVG icons per equipment and loot class; no GGG art.',
      'Tapping a tile shows the matching rule, its index and whether the item is shown or hidden.',
      'Shown/hidden counts and a show-hidden toggle make strictness changes visible.',
      'Moved the full-width preview above the generated filter text.',
    ],
    commits: [
      { sha: 'cbb83f9', message: 'feat: add inventory preview with original icons (M2d)' },
    ],
    compare: 'v0.4.0...v0.5.0',
  },
  {
    version: '0.4.0',
    date: '2026-11-21',
    title: 'Family, skill and ascendancy selection',
    notes: [
      'Replaced the flat 12-build grid with three steps: family, skill, ascendancy.',
      'Added a league selector with Covens and Standard snapshots, 20 skills each.',
      'Mapped all 19 ascendancies to armour, shield and jewel tags.',
      'Skills own weapon and offhand; two-handed skills drop the offhand.',
      'Compact file names such as FilterPath-v0.4.0-necromancer-summon-skeletons-lev-normal.filter.',
      'Old archetype share links now resolve to the closest new selection.',
      'Added the manual meta:add CLI, schema tests, a PR validation workflow and a monthly refresh reminder.',
    ],
    commits: [
      {
        sha: '5b97db7',
        message: 'feat: add family, skill and ascendancy selection (M2e)',
      },
    ],
    compare: 'v0.3.1...v0.4.0',
  },
  {
    version: '0.3.1',
    date: '2026-11-21',
    title: 'Changelog page and selection plan',
    notes: [
      'Fixed the changelog link by serving changelog.html as a separate page.',
      'Documented the three-step selection model: family, then skill, then ascendancy.',
      'Recorded the remaining open plan items and the M2e acceptance criteria.',
    ],
    commits: [
      { sha: '49caadd', message: 'fix: serve the changelog as its own page' },
    ],
    compare: 'v0.3.0...v0.3.1',
  },
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