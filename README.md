# FilterPath

Build-specific Path of Exile 1 loot filters in three clicks.

Pick your archetype, get a valid `.filter` that highlights the bases your build
actually wants and hides the rest. No account, no simulator.

**Status:** M1 — pick a build and download a filter. M2 adds themes, prices and
scheduled economy updates; M3 writes the file into your filters folder.

## Features

- 12 builds across all 7 classes, leveling and endgame presets
- Normal / Strict / Very Strict
- Toggle gear, gems, currency, maps and uniques
- Filter preview, download, copy and share links
- Generated client-side; no account and no network calls

**Live:** https://lordgreg.github.io/filterpath/

## Development

```bash
npm install
npm run dev      # http://localhost:5173/filterpath/
npm test
npm run build
```

## Refresh base item data

```bash
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
src/core/     framework-free: archetypes, rules, emit, tiering
src/ui/       React wizard and preview
src/sync/     download, clipboard, File System Access, future API
scripts/      data extractors
```

See [PLAN.md](./PLAN.md) for the milestones and constraints.

## Legal

This product isn't affiliated with or endorsed by Grinding Gear Games in any
way. Base item data from RePoE. Economy data, when shown, from poe.ninja.