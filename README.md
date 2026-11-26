# BuildPath

Build-specific Path of Exile 1 loot filters in three clicks.

Pick a family, an ascendancy or a meta build, then a phase and strictness, and
download a valid `.filter` that highlights the bases your build actually wants
and hides the rest. No account; everything is generated in your browser.

**Status:** v0.63.0 — verified build guides whose every number is
machine-derived and reproducible. A build is a seed plus a pinned Path of
Building measurement, a calibrated gate report, one endgame tree pruned into
each leveling step, a published PoB code and the filter generated from the same
object. The guide renders the gear as an inventory sheet, pins required jewels
to their tree sockets, and measures endgame Eldritch implicits. The current game
data is the 3.30 export; real meta capture is blocked by poe.ninja's closed
builds API.

## Features

- Verified build guides: six checkpoints, a gate report for each, the PoB code
  the gate measured, and a filter generated from the same build
- Six published builds across three ascendancies, each with checked prose:
  placeholders only, a facts hash and a signed summary
- Gear drawn as an inventory sheet: weapon and offhand on the sides, armour,
  rings, belt, boots and five flasks in their game positions, with mods shown
  inline and faint slot glyphs behind empty space
- Required jewels are pinned to their passive-tree sockets; click a jewel to
  zoom to and pulse its socket
- Endgame armour carries measured Eldritch Ember and Ichor implicits
- The full ascendancy graph with every node, lab timing and effect lines under
  it, a pantheon wheel, a separate bandit section, and weighted pros/cons on
  every build
- Catalogue chips that describe the build: SSF, playstyle, measured HC-ready,
  and a defining trait instead of the same six checkpoint dots
- Compact Metric / Measured / Gate tables with the actual checkpoint thresholds
- Gem tooltips explain what each gem does and whether 20% quality is worth it
- A Filter section that opens the build-specific builder at the right phase
- One-click build link through pobb.in, with Gear, Gems and Tree rendered there
- A release step that publishes the measured code to pobb.in and commits the
  link map; the copy button remains for desktop PoB
- Generated 16:9 build header art
- Gates calibrated in both directions against 36 must-pass observations and ten
  must-fail mutations
- Patch-fact hashes delist every build when the pinned tree or gem data moves;
  the league's first 72 hours publish nothing
- Per-phase, build-specific filters at every strictness, generated from the
  same build JSON
- Bounded repair: a failing step may swap one tree node, with a published
  `nodeDelta` and seed-vs-repaired view
- Lab timing is explicit: normal ~33, cruel ~55, merciless ~68, eternal ~75
- One shared header across the filter builder, builds, simulator, audit and
  changelog
- Four independent modes: by family, by ascendancy, by meta build, or from scratch
- Per-league meta snapshots, skills grouped by family or by seed weight
- Soft / Strict / Uber (hidden in From Scratch mode)
- Filter preview, download, copy and share codes
- Randomized loot simulator with Ctrl+V item capture, hover tooltips and click alerts
- Copy/import full-build and rules-only share codes
- The exact filter being edited is shown in the builder and the loot simulator
- Locked preset, My rules with templates, quick chips, conflict warnings and an item test box
- Templates marked “In preset” when the current phase and strictness already cover them
- From Scratch mode with hidden-all or shown-all start
- Eight filter themes; Rarity is the base and the rest only recolour it, from High contrast and Muted to Catppuccin, Dracula, Nord, Solarized Dark and Tokyo Night
- Live loot preview in the builder that restyles as you change theme, phase or strictness; click it to open the full simulator
- Build-specific base exclusions, e.g. Necromancer hides Cloth Belt and shows only Leather Belt, and Caster hides Iron Ring
- Always shown: quest items, Labyrinth treasure keys and veiled items
- Cluster jewels at every rarity and one abyss jewel per family; unique maps above the tier cutoff
- Saved builds with Update; one global strictness
- Economy-aware currency, divination and unique tiers refreshed daily
- Chromium folder writing with OS-aware path hints, a read/write check and `.bak` backups
- Brave users get the `brave://flags/#file-system-access-api` step directly in the panel
- Stable file name and version/preset hash in the header, e.g.
  `buildpath-minion-leveling-soft.filter`; names are optional and derived
  from the selection when empty
- A connected filter is rewritten automatically only when a stored snapshot
  proves it is the same build and the file is untouched; otherwise the panel
  asks you to check and save
- Generated client-side; no account and no network calls

**Changelog:** [CHANGELOG.md](./CHANGELOG.md) or the
[in-site changelog](https://lordgreg.github.io/buildpath/changelog.html).

**Live:** https://lordgreg.github.io/buildpath/
**Builds:** https://lordgreg.github.io/buildpath/builds.html
**Loot simulator:** https://lordgreg.github.io/buildpath/demo.html
**Behaviour audit:** https://lordgreg.github.io/buildpath/tests.html

## Folder writing browser support

- Chrome, Chromium and Edge: supported.
- Brave: disabled by default. Open `brave://flags/#file-system-access-api`, set
  **File System Access API** to **Enabled**, relaunch Brave, then reload.
- Firefox and Safari: download only; no folder picker.

## Development

```bash
npm install
npm run dev      # http://localhost:5173/buildpath/
npm test
npm run build
```

Build data needs the pinned Path of Building checkout at `.cache/pob/src`,
LuaJIT and `lua-utf8` (the same setup `validate-builds.yml` uses):

```bash
npm run builds:build       # YAML seeds -> committed JSON
npm run builds:calibrate   # must-pass + must-fail gate calibration
npm run builds:verify      # prove every seed against the PoB oracle
npm run builds:check       # load every published PoB code in PoB
```

## Refresh presets and base data

```bash
npm run presets:build   # YAML -> src/generated/presets.json, schema-validated
npm run extract:repoe
# override the pinned export commit
REPOE_REF=<commit> npm run extract:repoe
```

Writes `src/core/data/base-types.json` from the maintained
[RePoE export](https://repoe-fork.github.io/) published by `repoe-fork`, pinned
to one commit of `repoe-fork/repoe-fork.github.io`, plus
`known-base-types.json` (every name valid in a `BaseType` condition) and
`known-classes.json`. Only item classes the filter language knows are admitted.
Items missing from the export can be added to `base-types-extra.json` after
checking them against a working filter. All generated files are committed so
builds never depend on the network.

## Layout

```
src/core/                  framework-free, no React imports
  archetypes/              types, validator, curated matrix
  filter/                  rule model, presets, emit, parser, generator
  preview/                 rule matcher and sample items
  audit/                   behaviour audit catalog + report
  data/                    base types, class registry, economy accessor
  rules/                   custom rules, keys, templates, coverage, share codes
  share/                   build-code encode and decode
  demo/                    pasted-item parser
  builds/                  build types, gates, repair, calibration evidence
  generated/               compiled presets + raw economy snapshot (committed)
src/builds/                 reviewed build seeds + gear/checkpoint/calibration YAML
src/meta/                  accessors over the compiled presets and builds
src/presets/               YAML sources and JSON schemas
src/ui/                    wizard, build pages, loot simulator, audit page
  download.ts              download and clipboard helpers
src/sync/                  folder picker, directory handles, write snapshots
src/changelog.ts           release and commit data for the site
scripts/                   preset compiler, data extractors, build pipeline
```

Six Vite entries: `index.html` (builder), `builds.html` (catalogue),
`build.html` (guide), `demo.html` (loot simulator), `changelog.html` (release
history) and `tests.html` (behaviour audit).

See [PLAN.md](./PLAN.md) for the design and constraints.

## Release workflow

1. Bump `package.json`.
2. Add the release to `src/changelog.ts` and `CHANGELOG.md`; a test keeps the two
   in step from 0.20.0 onwards.
3. Commit, then tag `v<version>` (annotated) and push both with
   `git push origin master --follow-tags`.
4. The release workflow creates the GitHub Release from the matching
   `CHANGELOG.md` section; the deploy workflow publishes the site.

## Legal

This product isn't affiliated with or endorsed by Grinding Gear Games in any
way. Base item data from RePoE. Economy data, when shown, from poe.ninja.