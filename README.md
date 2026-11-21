# FilterPath

Build-specific Path of Exile 1 loot filters in three clicks.

Pick your archetype, get a valid `.filter` that highlights the bases your build
actually wants and hides the rest. No account, no simulator.

**Status:** v0.4.0 — the three-step selector is live. M2d (inventory preview),
M2a (themes), M2b/M2c (economy) and M3 (directory sync) remain.

## Features

- Family → skill → ascendancy selection with per-league meta snapshots
- 20 skills across 5 families and all 7 classes, leveling and endgame presets
- Normal / Strict / Very Strict
- Toggle gear, gems, currency, maps and uniques
- Filter preview, download, copy and share links
- Build version in the file name and header, e.g.
  `FilterPath-v0.4.0-necromancer-summon-skeletons-lev-normal.filter`
- Generated client-side; no account and no network calls

**Changelog:** [CHANGELOG.md](./CHANGELOG.md) or the
[in-site changelog](https://lordgreg.github.io/filterpath/changelog.html).

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