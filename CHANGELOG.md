# Changelog

All notable changes to FilterPath. The same data powers the in-site changelog.

## 0.29.0 — 2026-11-22

Always show Labyrinth Treasure Keys.

- Labyrinth Treasure Keys (Item Class: Labyrinth Items) are now built-in quest
  items in every filter. They are shown with the quest styling, an alert sound
  and a green minimap dot, even in From Scratch hide-all.
- RePoE does not ship the Treasure Key base, so it is a reviewed entry in the
  base-type registry, checked against the game's own item text.

## 0.28.0 — 2026-11-22

Collapsible panels and resuming saved filters.

- The Generated filter window is now collapsible, exactly like Advanced rules.
  Both sections start collapsed and remember whether you opened them, so the
  layout stays the way you left it.
- A chevron in each collapsed section shows that it can be opened, and it turns
  to point down while the section is open.
- The Generated filter copy button is now a copy icon on the right of the
  header, next to the Rules, Bases and Lines counts and separated by a thin
  divider. It shows a check mark while the filter text is on the clipboard.
- Opening an empty builder now offers to resume what you already have: builds
  saved in this browser, and filters in a folder you connected earlier (grant
  access to list them).
- Each FilterPath filter in the connected folder has a Delete button next to
  Load, with a confirmation prompt, that removes the file and its .bak copy.

## 0.27.0 — 2026-11-22

Your last good filter, and one build code.

- Clicking the FilterPath title now starts a new, empty filter instead of
  jumping to a preset. Nothing is selected until you pick a way to build.
- A Reset button appears next to the "unsaved changes" badge and returns to the
  last saved state. Reloading the page, or leaving and coming back, does the
  same: unsaved edits are discarded and your last saved build is restored.
- Your last saved build is remembered on the device, so reopening the site
  brings it back. It is only updated when you download, write, save, update,
  import or load a build.
- Every FilterPath file now carries its build selection in the header, and each
  filter in the connected folder has a Load button, so you can switch to another
  saved filter exactly as it was generated.
- The builder keeps a single build code: Copy code and Import code both carry
  the whole build, including My rules. The separate share link and rules-only
  code are gone, and the Generated filter window has its own Copy button.
- Advanced rules is collapsed by default and shows how many locked preset rules
  and how many My rules the build has.

## 0.26.1 — 2026-11-22

One name for the loot simulator.

- The loot simulator is now called the same thing everywhere. The builder and
  audit nav links read "loot simulator" instead of "demo", and the builder
  preview caption reads "Open loot simulator". The redundant "Open loot
  simulator" button in the preset card is gone, since the preview card below it
  already links to the same place.

## 0.26.0 — 2026-11-22

Live loot preview in the builder.

- The builder now shows a small loot preview under the preset card. It uses the
  same rules and label styling as the loot simulator, so switching the theme,
  phase or strictness updates it in place. Click the preview to open the full
  simulator, where items can be pasted and inspected.

## 0.25.1 — 2026-11-22

Remove the sound-pack option.

- Removed the sound-pack selector. Filters always use the game's built-in alert
  sounds and the loot simulator keeps its chime preview, so nothing has to be
  downloaded or placed next to the filter.

## 0.25.0 — 2026-11-22

Themes and sound packs.

- Filter themes now share one structure: Rarity is the base and every other
  theme only swaps the colours. Added High contrast, Muted, Catppuccin, Dracula,
  Nord, Solarized Dark and Tokyo Night; old `classic` links open as Rarity.
- Quest items get a dark amber background, and Mirror of Kalandra and Divine Orb
  get a vivid chase box with dark text and a `PlayEffect` beam so they stand out
  immediately.
- Sound packs change the alert sounds. Default keeps the game's built-in sounds,
  while Super Mario, Street Fighter, Loom and Commodore 64 emit
  `CustomAlertSoundOptional`. Drop the matching `fp-*.mp3` files next to your
  filter and the loot simulator reads the same files for 1:1 playback.
- The minion family and the Necromancer now show only Leather Belt. The other
  belt bases are hidden and unique belts stay visible.

## 0.24.3 — 2026-11-22

Fix filters failing to load on stale custom rules.

- A custom rule that still listed a base the game has dropped (for example a
  preset rule copied before the last fix) made the whole filter fail to load.
  The generator now drops unknown base types and the stored rules are cleaned
  when loaded, so the editor shows the same rule the filter uses.

## 0.24.2 — 2026-11-22

Fix filters failing to load on removed base types.

- Generated filters no longer list seven base types the game has dropped or
  renamed, which made the client refuse the whole filter with "no base types
  found matching": Gauche, Sinistral and Southswing Gloves, Taxing, Gruelling
  and Debilitation Gauntlets, and Serpent Wand. The registry now strips them via
  a reviewed removal list, checked against the game's own item data.

## 0.24.1 — 2026-11-22

Hide the regen amulets in minion presets.

- The minion family and the Necromancer now hide normal, magic and rare Coral,
  Marble and Blue Pearl Amulets, whose life and mana regen implicits a summoner
  cannot use. Unique amulets stay visible.

## 0.24.0 — 2026-11-22

Custom-rule overrides and loot-simulator deep links.

- Two identical My rules are now named by number in the warning.
- Each custom rule shows which preset rule it overrides, with a click to jump
  to and highlight it.
- Writing the `.filter` counts as saved, so the "unsaved changes" badge clears
  on Download, Write file now, Save build or Update.
- Overwriting a FilterPath filter no longer asks; the previous version is still
  kept as `.bak`.
- The loot simulator can jump to the rule that decided a drop, and open the rule
  editor pre-filled from the item.

## 0.23.0 — 2026-11-22

Hide small gold piles.

- Gold piles below a per-strictness threshold are hidden, so only the larger
  piles keep a label; the floor rises from Soft to Uber (leveling 10/20/50,
  endgame 50/100/200). Gold is auto-collected, so a hidden pile only loses the
  ground label.

## 0.22.0 — 2026-11-22

League first, stale-filter cleanup and more chips.

- The league is now the first choice, at the top of the builder; the current
  league stays preselected and Standard is the fallback.
- A connected filters folder can remove its outdated FilterPath filters, along
  with their `.bak` copies, in one click.
- The rule editor chips now cover every equipment slot plus one-hand weapons.
- A behaviour audit page runs a labelled drop catalog through the real matcher
  for every build, with the outcomes pinned in tests and a golden summary.

## 0.21.0 — 2026-11-22

Soft / Strict / Uber, graded maps and the new ascendancies.

- The three strictness tiers are now Soft, Strict and Uber. Old share links and
  saved builds keep working.
- Maps are graded by tier — T15 over T14 over T11 — and divination cards and
  fragments now hide their low tiers as strictness rises.
- Warden (Ranger), Luminary and Reliquarian (Scion) replace Raider, and the
  Covens seed gains the ten missing skills.

## 0.20.0 — 2026-11-22

Preset tiers, currency tiers and folder help.

- The three strictness tiers now step clearly: Normal, Strict and Very Strict
  raise the white and blue item-level floors, and only the build's own bases are
  shown. Normal is the loosest (a beginner default); Very Strict keeps only
  high-ilvl bases.
- Magic flasks are visible again in endgame, where the all-Magic hide used to
  remove them, and 4-links show in every leveling preset and in Endgame Normal.
- Very Strict keeps tier-2 currency — Chaos, Alchemy, Vaal, Regal, Fusing and the
  rest — and hides low-tier uniques instead of over-hiding orbs.
- The economy tier lists now actually apply, so Strict no longer drops good
  currency: only the vendor tier (scrolls, transmutes, catalysts) is hidden.
- The builder drops the unusable "Folder path (reference)" field; the Windows
  and Linux filter paths now sit inside the How to install section.

## 0.19.1 — 2026-11-22

Hide Cloth Belt in the Minion family preset.

- The Minion family preset now hides normal, magic and rare Cloth Belts, matching
  the Necromancer ascendancy. Unique Cloth Belts remain visible.
- The exclusion moved from the Necromancer ascendancy to the Minion family, which
  is the default preset and the one the Necromancer actually uses.

## 0.19.0 — 2026-11-22

Category backgrounds and build-specific base exclusions.

- The Rarity theme now uses category backgrounds: S-tier orbs get deep magenta,
  best jewels violet, divination cards navy, quality flasks emerald, fragments
  amber, gems teal, jewels indigo and league viscera burnt orange.
- Divine Orb and Mirror of Kalandra are S-tier; high-value unique bases share the
  S-tier backdrop, while best jewels keep their own violet.
- Category colours only restyle items the preset already shows; visibility is
  unchanged. High contrast and Muted stay uniform.
- Necromancer builds now exclude Cloth Belt, whose stun-threshold implicit a
  summoner cannot use. Unique Cloth Belts remain visible.
- Caster builds, including Elementalist, now exclude Iron Ring, whose physical
  attack implicit is useless for spells. Unique Iron Rings remain visible.
- The demo pool and item parser accept league Viscera drops, which have no
  Rarity line.

## 0.18.2 — 2026-11-22

Hide Gold Rings while leveling.

- Gold Ring, the Item Rarity base, is hidden in Leveling Normal, Strict and Very
  Strict.
- Normal, Magic and Rare Gold Rings are hidden; unique Gold Rings such as
  Andvarius remain visible.
- Endgame is unchanged: an ilvl 80+ Gold Ring can still show if the rare floor
  allows it.

## 0.18.1 — 2026-11-22

Paste currency items into the demo.

- The item parser now accepts `Rarity: Currency`, `Gem` and `Divination Card`,
  so orbs no longer fail with “No item blocks found”.
- `Stack Size` lines such as `1/20` now parse as the current stack (`1`) instead
  of an invalid number.
- Divine, Exalted, Chaos and Regal orbs can be pasted into the demo and item
  tester; their matching rule and alert are used.
- The demo pool now includes Divine, Mirror, Exalted, Chaos and Regal orbs.

## 0.18.0 — 2026-11-22

Demo click sounds.

- Clicking an item in the loot simulator now plays the alert from its matching
  filter rule.
- Quest items, named orbs, uniques, currency and other rules with an alert are
  audible; rules without an alert stay silent.
- The demo synthesises short chimes approximating the game’s built-in sounds
  rather than shipping GGG audio files.
- Added a Sound toggle next to Show hidden; the preference is remembered.

## 0.17.0 — 2026-11-22

Quest alerts and named orb sounds.

- Quest items always show and play the default alert (sound 1, volume 300),
  even in a From Scratch hide-all filter.
- Chaos, Exalted, Divine and Mirror of Kalandra use the game’s built-in Sh voice
  lines: `ShChaos`, `ShExalted`, `ShDivine` and `ShMirror`.
- The named orb rules still respect the currency tier cutoff, so Chaos stays
  hidden on Very Strict.
- Quest items are parsed by the item tester and demo, with a green Quest label
  colour.

## 0.16.0 — 2026-11-22

Stable filter filenames and preset auto-sync.

- Filter filenames no longer include the version:
  `filterpath-<name>-<phase>-<strictness>.filter`. From Scratch uses
  `hide-all` / `show-all`.
- The filter header now records the preset hash, so the site can tell whether a
  filter file was built from older presets.
- When the connected filter file is stale, the site updates it automatically
  (keeping a `.bak`) and shows “Your filter was updated with the latest
  presets.”
- Saved builds and imported codes with an older preset hash show a refresh
  notice; the preview always regenerates with the latest presets.
- Existing versioned files need one download to create the stable filename;
  after that, preset updates sync automatically.

## 0.15.3 — 2026-11-22

Browser-specific folder guidance.

- Only Brave gets the `brave://flags/#file-system-access-api` instructions.
- Chrome, Chromium and Edge get a “should be supported” message with
  policy/extension checks and no flag.
- Firefox and Safari get a “use a Chromium browser or download” message,
  because neither implements the API.
- Unknown browsers get the Brave flag plus the general support summary.

## 0.15.2 — 2026-11-22

Brave flag guidance everywhere.

- The `brave://flags/#file-system-access-api` instructions now appear for every
  unsupported browser, even if Brave detection fails.
- Copy and Reload actions sit together in the amber browser-support callout.
- README now has a Folder writing browser support section for Chrome, Chromium,
  Edge, Brave, Firefox and Safari.

## 0.15.1 — 2026-11-22

Brave folder-writing guidance.

- Brave disables the File System Access API by default; the folder panel now says
  so instead of a generic “download only”.
- Added the exact flag, a Copy `brave://` flag button and a Reload after
  enabling button.
- Other unsupported browsers now point to Chrome, Chromium or Edge and keep the
  download fallback.

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