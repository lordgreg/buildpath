# Changelog

All notable changes to FilterPath. The same data powers the in-site changelog.

## 0.10.0 — 2026-11-21

Economy tiers and the daily refresh.

- Filter rules now use poe.ninja economy tiers for currency, fragments,
  divination cards and high-value unique bases.
- Tiering converts chaos to divine, filters names to valid BaseTypes, and falls
  back to static lists when data is missing.
- Hand-written overrides in `src/presets/economy-overrides.yaml` always win.
- A daily GitHub Actions workflow refreshes the snapshot and opens a PR when
  tiers change; manual dispatch is available.

## 0.9.1 — 2026-11-21

Game-like loot simulator and always-on sections.

- The loot simulator now uses an original game-like ground background.
- Drops are scattered as overlapping in-game-style labels, with a Scatter
  button.
- Clicking a label shows the matching rule and reason.
- Removed the section toggles: all sections are always included, and advanced
  clones control overrides.

## 0.9.0 — 2026-11-21

Themes, per-section strictness and saved builds.

- Added three filter themes: Classic, High contrast and Muted.
- Per-section strictness for gear, gems, currency, maps and uniques; the global
  choice still sets all five.
- Saved builds in localStorage, with load and delete.
- Theme and section strictness round-trip through share links and clone keys.
- The filter header records non-default section strictness.

## 0.8.0 — 2026-11-21

Loot simulator, style editing and share links.

- Added a loot simulator page that shows drops with their filter labels.
- Paste item text from the game to add it to the simulation; parses class,
  rarity, base, item level, sockets, links, quality, stack size and map tier.
- Per-rule style editing: text, border, background, font size and alert sound.
- Share codes can now be copied as a link; opening the link imports the clone
  automatically.
- The builder header links to the simulator with the current selection.

## 0.7.0 — 2026-11-21

Advanced rules, locked presets and clones.

- Every generated rule is shown in a locked, section-grouped pane.
- Whole-set clones are stored in localStorage and replace the generated rules
  for that exact selection.
- Rule editor: enable, reorder, duplicate, delete, change action, comment,
  rarity, item level and Continue.
- New rules can be built from DEX/STR/INT requirement chips, Head, Weapon 2H and
  Weapon ranged.
- RePoE base data now keeps attribute requirements for accurate chips.
- Export/import JSON and compressed share codes, capped at 8 KB with a file
  fallback.
- Stale clones warn when the locked preset changes and never merge silently.

## 0.6.0 — 2026-11-21

Independent family, ascendancy and meta modes.

- Replaced the cascade with three independent modes: by family, by ascendancy
  and by meta build.
- Ascendancy mode uses a default family loadout, e.g. Juggernaut two-hand axe
  or Deadeye bow.
- Meta mode lists every snapshot skill grouped by family, then the ascendancy.
- Presets moved to YAML under `src/presets`, compiled to JSON with JSON Schema
  validation.
- Mode-aware file names and share links; old cascade and archetype links still
  resolve.
- `meta:add` now edits YAML and rebuilds the compiled presets.

## 0.5.0 — 2026-11-21

Inventory preview with original icons.

- Added a paper-doll preview: weapon, offhand, all four armour slots, belt,
  amulet, two rings, jewel and two flasks.
- Added the 12 x 5 inventory grid with representative drops, including the
  reported leak cases.
- Original FilterPath SVG icons per equipment and loot class; no GGG art.
- Tapping a tile shows the matching rule, its index and whether it is shown or
  hidden.
- Shown/hidden counts and a show-hidden toggle make strictness changes visible.
- Moved the full-width preview above the generated filter text.

## 0.4.0 — 2026-11-21

Family, skill and ascendancy selection.

- Replaced the flat 12-build grid with three steps: family, skill, ascendancy.
- Added a league selector with Covens and Standard snapshots, 20 skills each.
- Mapped all 19 ascendancies to armour, shield and jewel tags.
- Skills own weapon and offhand; two-handed skills drop the offhand.
- Compact file names such as `FilterPath-v0.4.0-necromancer-summon-skeletons-lev-normal.filter`.
- Old archetype share links resolve to the closest new selection.
- Added the manual `meta:add` CLI, schema tests, a PR validation workflow and a
  monthly refresh reminder.

## 0.3.1 — 2026-11-21

Changelog page and selection plan.

- Fixed the changelog link by serving `changelog.html` as a separate page.
- Documented the three-step selection model: family, then skill, then ascendancy.
- Recorded the remaining open plan items and the M2e acceptance criteria.

## 0.3.0 — 2026-11-21

Changelog, matcher and leak proof.

- Added the in-site changelog with releases and commit links.
- Added a rule matcher shared with the generated filter, as groundwork for the
  inventory preview.
- Added regression fixtures for the four items reported as leaking.
- The download panel now shows the exact in-game filter name.
- Install notes now explain that online filters and local files are separate.

## 0.2.0 — 2026-11-21

Versioned filters and safer BaseType names.

- Filter header and file name now include the build version and filter format,
  e.g. `FilterPath-v0.2.0-necro-minions-leveling-strict.filter`.
- Added `known-base-types.json`; every emitted `BaseType` is validated in CI.
- Removed unique names from `BaseType` rules (the client rejects the whole
  filter on an unknown name).
- Corrected the install path to `Documents/My Games/Path of Exile`, including
  the Proton prefix variant.
- Recorded the M0–M1 incident log and planned the inventory preview and
  directory sync.

## 0.1.0 — 2026-11-21

First working generator.

- 12 archetypes across all 7 classes, leveling and endgame presets.
- Normal, Strict and Very Strict.
- Gear, gem, currency, map/fragment and unique sections with toggles.
- Deterministic emitter, syntax validator and golden filters.
- URL-hash sharing, download, copy and a mobile action bar.
- GitHub Pages deployment with tests in CI.