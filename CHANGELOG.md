# Changelog

All notable changes to FilterPath. The same data powers the in-site changelog.

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