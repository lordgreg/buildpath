# FilterPath

Build-specific Path of Exile 1 loot filters in three clicks.

Pick your archetype, get a valid `.filter` that highlights the bases your build
actually wants and hides the rest. No account, no simulator.

**Status:** v0.9.0 — three selection modes, preview, advanced rules, loot
simulator, themes, per-section strictness and saved builds are live. Remaining:
economy tiers/cron and directory sync.

## Features

- Three independent modes: by family, by ascendancy, or by meta build
- Per-league meta snapshots with all skills grouped by family
- Normal / Strict / Very Strict
- Toggle gear, gems, currency, maps and uniques
- Filter preview, download, copy and share links
- Paper-doll and inventory preview with original icons and rule explanations
- Locked rule pane, whole-set clones, requirement chips and share codes
- Loot simulator with pasted in-game items and filter-styled labels
- Three filter themes, per-section strictness and saved builds
- Build version in the file name and header, e.g.
  `FilterPath-v0.4.0-necromancer-summon-skeletons-lev-normal.filter`
- Generated client-side; no account and no network calls

**Changelog:** [CHANGELOG.md](./CHANGELOG.md) or the
[in-site changelog](https://lordgreg.github.io/filterpath/changelog.html).

**Live:** https://lordgreg.github.io/filterpath/
**Demo:** https://lordgreg.github.io/filterpath/demo.html

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