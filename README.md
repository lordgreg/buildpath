# FilterPath

Build-specific Path of Exile 1 loot filters in three clicks.

Pick your archetype, get a valid `.filter` that highlights the bases your build
actually wants and hides the rest. No account, no simulator.

**Status:** v0.15.2 — rarity-first colors, filter naming, folder writing,
saved-build updates and template coverage are live. Remaining work is manual
QA; real meta capture is blocked by poe.ninja’s closed builds API.

## Features

- Four independent modes: by family, by ascendancy, by meta build, or from scratch
- Per-league meta snapshots with all skills grouped by family
- Normal / Strict / Very Strict (hidden in From Scratch mode)
- Filter preview, download, copy and share links
- Randomized loot simulator with Ctrl+V item capture and hover tooltips
- Copy/import full-build and rules-only share codes
- The exact filter being edited is shown in the builder and the demo
- Locked preset, My rules with templates, quick chips, conflict warnings and an item test box
- Templates marked “In preset” when the current phase and strictness already cover them
- From Scratch mode with hidden-all or shown-all start
- Loot simulator with pasted in-game items and filter-styled labels
- Three filter themes; saved builds with Update; one global strictness
- Economy-aware currency, divination and unique tiers refreshed daily
- Chromium folder writing with OS-aware path hints, a reference path field, a read/write test and .bak backups
- Brave users get the `brave://flags/#file-system-access-api` step directly in the panel
- Build version in the file name and header, e.g.
  `filterpath-minion-leveling-normal-0.13.0.filter`; names are optional and
  derived from the selection when empty
- Generated client-side; no account and no network calls

**Changelog:** [CHANGELOG.md](./CHANGELOG.md) or the
[in-site changelog](https://lordgreg.github.io/filterpath/changelog.html).

**Live:** https://lordgreg.github.io/filterpath/
**Demo:** https://lordgreg.github.io/filterpath/demo.html

## Folder writing browser support

- Chrome, Chromium and Edge: supported.
- Brave: disabled by default. Open `brave://flags/#file-system-access-api`, set
  **File System Access API** to **Enabled**, relaunch Brave, then reload.
- Firefox and Safari: download only; no folder picker.

## Development

```bash
npm install
npm run dev      # http://localhost:5173/filterpath/
npm test
npm run build
```

## Refresh presets and base data

```bash
npm run presets:build   # YAML -> src/generated/presets.json, schema-validated
npm run extract:repoe
# pin for reproducible output
REPOE_REF=3.27.0 npm run extract:repoe
```

Writes `src/core/data/base-types.json` from
[RePoE](https://github.com/brather1ng/RePoE), plus
`known-base-types.json` (every name valid in a `BaseType` condition). Items
missing from RePoE can be added to `base-types-extra.json` after checking them
against a working filter. Both generated files are committed so builds never
depend on the network.

## Layout

```
src/core/                  framework-free
  archetypes/              types, validator, curated matrix
  filter/                  rule model, presets, emit, validator, generator
  preview/                 rule matcher and sample items
  data/                    base types, economy, overrides
src/ui/                    wizard, changelog, URL state
src/sync/                  download, clipboard, File System Access
src/changelog.ts           release and commit data for the site
scripts/                   data extractors
```

See [PLAN.md](./PLAN.md) for the milestones and constraints.

## Legal

This product isn't affiliated with or endorsed by Grinding Gear Games in any
way. Base item data from RePoE. Economy data, when shown, from poe.ninja.