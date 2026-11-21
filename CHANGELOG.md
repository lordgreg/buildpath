# Changelog

All notable changes to FilterPath. The same data powers the in-site changelog.

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