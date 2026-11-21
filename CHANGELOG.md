# Changelog

All notable changes to FilterPath. The same data powers the in-site changelog.

## 0.15.0 — 2026-11-21

Rarity-first default colors.

- Replaced the slot-colored Classic theme with a Rarity theme: gear text and
  borders follow Normal, Magic, Rare and Unique instead of
  weapon/armour/accessory.
- All gear uses a black background; Magic is blue, Rare is yellow and Unique is
  orange.
- Currency is default gold, divination cards pale blue, gems teal, maps tan and
  map fragments gold.
- Six-socket rules are split by rarity so a six-socket item also gets its
  rarity color.
- High contrast and Muted remain; Muted now uses a black background.

## 0.14.5 — 2026-11-21

Leveling Strict hides everyday Magic gear.

- Leveling Strict now hides Magic gear below item level 80.
- Magic items on a base the build allows still show at ilvl 80+, as a crafting
  or upgrade outlier.
- Wrong-base Magic items stay hidden even at ilvl 80+.
- This hides the reported ilvl 43 Magic Topaz Ring while keeping the 80+
  exception.

## 0.14.4 — 2026-11-21

Seed data is labelled honestly.

- Meta snapshots now declare `provenance: seed` or `provenance: captured`.
- Seed snapshots show “Curated seed updated <date>”, call the numbers seed
  weights, and no longer claim measured percentages.
- Captured snapshots keep “Captured <date>” and measured percentages.
- PLAN records that a real poe.ninja builds capture is blocked and that My rules
  are the resolved overlay mode.

## 0.14.3 — 2026-11-21

Hide wrong-base gear inside used classes.

- Items in a used class but the wrong base type are now hidden, e.g. strength
  helmets and strength/dexterity body armours in the minion preset.
- Leveling 4+ link highlights are limited to the build’s usable slots and bases;
  a 4-link two-hand sword no longer appears in a minion filter.
- Unmatched items still default to visible, so the junk rules now include a
  base-level remainder hide for restricted classes.
- Added regression items: rare sceptre, one-hand sword, thrusting sword, magic
  strength helmet, magic strength/dexterity body armour and a 4-link two-hand
  sword.

## 0.14.2 — 2026-11-21

Hide rares in unused slots.

- Rare items in slots the build does not use are now hidden at every phase and
  strictness, not only Endgame Very Strict.
- This removes noise such as rare sceptres and one-hand swords from the minion
  preset while keeping rare wands, shields and other used slots visible.
- Unmatched items still default to visible; the added hide rule closes that gap
  for unused equipment classes.

## 0.14.1 — 2026-11-21

Composed section presets.

- Filter presets are now composed from named section presets: gear, gems,
  currency, maps, uniques and junk.
- Section values and generated filters are unchanged; the UI still exposes one
  global strictness.
- Each section preset has a stable id such as `preset-gems-endgame-strict` for
  tests, debugging and future section-specific tuning.

## 0.14.0 — 2026-11-21

Template coverage badges.

- Templates show an “In preset” badge when the current preset already guarantees
  the same outcome.
- Coverage respects phase and strictness: T15 maps are not covered while
  leveling, and quality-gem and top-currency cutoffs change with strictness.
- Six sockets count as covering six links, because a six-link always has six
  sockets.
- Clicking an “In preset” template still adds a copy so you can override its
  styling, with a notice explaining it is redundant.

## 0.13.1 — 2026-11-21

Reference folder path field.

- Added a Folder path field for pasting the filters folder location, with Copy
  and Use suggested path buttons.
- The field is reference-only: browsers cannot grant access to a typed path, so
  Choose folder still connects the folder.
- The picker tip explains Ctrl+L on Linux, the address bar on Windows and
  Cmd+Shift+G on macOS.
- Pasting a path that stops at Documents now warns that the game folder is
  My Games/Path of Exile inside it.

## 0.13.0 — 2026-11-21

Filter names, folder writing and save updates.

- Filter files now use
  `filterpath-<name>-<phase>-<strictness>-<version>.filter`. From Scratch uses
  `hide-all` or `show-all` instead of phase and strictness.
- The build name is optional: empty names fall back to a readable slug from the
  selection, e.g. `minion` or `lightning-arrow-deadeye`.
- A typed name changes the filename and demo label immediately, before saving.
- The builder and demo both show the exact filter being edited.
- Download writes into the connected filters folder first, asks before
  overwriting, and falls back to a browser download.
- The folder panel detects Windows, Linux/Proton or macOS and shows the matching
  path first; the other platform stays behind a disclosure.
- Choosing another folder runs a read/write probe and reports permission
  problems, with a copyable `chmod` hint on Linux and folder-permission steps on
  Windows.
- Saved builds show an Update button next to Load/Delete for the loaded build;
  Save creates a copy.

## 0.12.0 — 2026-11-21

Advanced rules rework and From Scratch mode.

- The preset is locked and never cloned. My rules are evaluated first; copy
  individual preset rules or whole groups to override them.
- Rebuilt My rules editor: item classes, base types, quick attribute/slot
  chips, rarity, ilvl range, sockets, links, quality, stack, map tier,
  Continue, style, search and drag reordering.
- Added predefined templates: uniques, 6-links, T15 maps, quality gems, top
  currency, top divination cards, ilvl 80 rares and hide normal/magic gear.
- Added From Scratch mode with Hide everything or Show everything; phase and
  strictness are hidden there.
- Added conflict warnings, an item test box, rules-only share codes, and
  full-build code import/export.
- My rules follow the selected build, so changing phase, strictness or theme
  keeps them.
- Saved builds store selection + My rules only; presets always regenerate. Old
  whole-set clones and saved builds are discarded with a notice.
- Share links that carry a build code now restore the build instead of dropping
  the code.
- Clicking the FilterPath title resets the filter, with a confirmation when
  there are unsaved changes.

## 0.11.2 — 2026-11-21

Steam library-aware filter paths.

- Folder guidance now explains that `steamapps` lives inside each Steam
  library, not the home folder.
- Shows the default Proton path, an extra-library example, and a `find` command
  to locate the prefix.
- Clarifies that `.filter` files go directly into
  `Documents/My Games/Path of Exile`, with no `filters` subfolder.
- Updates the builder install steps with the same wording.

## 0.11.1 — 2026-11-21

Demo capture, build codes and merged saving.

- Ctrl+V on the demo immediately imports a valid item block; Clear pasted was
  removed.
- Demo labels use independent random X and Y with overlap avoidance, and
  Randomize draws a new subset.
- The demo follows the latest builder selection through BroadcastChannel and
  session fallback.
- Copy code carries the selection and rules; Import code restores the whole
  build. The JSON file picker and duplicate share-code panel are gone.
- Saved builds store custom rule deltas, rebase them onto the latest presets,
  and flag unsaved changes; refreshing warns first.
- Save build and the filters folder are merged: local save plus file write when
  a folder is connected.
- Folder guidance covers Windows and Proton paths, allows any folder, and
  offers a download fallback.
- The league dropdown uses a compact custom chevron.

## 0.11.0 — 2026-11-21

Directory sync.

- Save the filter directly into the PoE filters folder in Chromium browsers.
- The folder handle is remembered in IndexedDB; write permission is requested on
  demand.
- Lists existing .filter files with their FilterPath version and flags stale
  files.
- Overwrites ask for confirmation and keep the previous contents as
  `<name>.filter.bak`.
- Never deletes or modifies unrelated files; Firefox and Safari keep the
  download flow.

## 0.10.2 — 2026-11-21

Demo replaces the builder preview.

- Removed the inventory preview from the builder; the loot simulator is now the
  single preview surface.
- Demo labels spread across the full background height and randomize on load and
  on Randomize.
- Hovering a demo label opens the game-style item tooltip automatically;
  tapping pins it on touch.
- Removed the redundant strictness explanation block.
- Deleted the unused paper-doll and icon code.

## 0.10.1 — 2026-11-21

Meta picking, import code, random drops and item tooltips.

- Meta mode: any skill can be picked across families; only the ascendancies
  recorded for that skill are offered, with their snapshot share.
- Renamed the filter copy button to "Copy filter" and reduced advanced import to
  a single "Import code" field; the JSON file picker is gone.
- The loot simulator randomizes a fresh subset of drops on load and on
  Randomize; pasted items are highlighted as new.
- Clicking an item in the inventory preview opens a game-style tooltip with
  requirements, sockets and the matching rule.
- Inventory tiles now show rarity labels and stronger rarity borders.
- Removed per-section strictness; one global strictness applies to the whole
  filter.

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