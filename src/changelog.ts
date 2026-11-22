export interface ReleaseCommit {
  sha: string;
  message: string;
}

export interface Release {
  version: string;
  date: string;
  title: string;
  notes: string[];
  commits: ReleaseCommit[];
  /** GitHub compare range, e.g. "v0.2.0...v0.3.0". */
  compare?: string;
}

export const REPO_URL = 'https://github.com/lordgreg/filterpath';

export const RELEASES: Release[] = [
  {
    version: '0.22.0',
    date: '2026-11-22',
    title: 'League first, stale-filter cleanup and more chips',
    notes: [
      'The league is now the first choice, at the top of the builder; the current league stays preselected and Standard is the fallback.',
      'A connected filters folder can remove its outdated FilterPath filters, along with their .bak copies, in one click.',
      'The rule editor chips now cover every equipment slot plus one-hand weapons.',
      'A behaviour audit page runs a labelled drop catalog through the real matcher for every build, with the outcomes pinned in tests and a golden summary.',
    ],
    commits: [],
    compare: 'v0.21.0...v0.22.0',
  },
  {
    version: '0.21.0',
    date: '2026-11-22',
    title: 'Soft / Strict / Uber, graded maps and the new ascendancies',
    notes: [
      'The three strictness tiers are now Soft, Strict and Uber. Old share links and saved builds keep working.',
      'Maps are graded by tier — T15 over T14 over T11 — and divination cards and fragments now hide their low tiers as strictness rises.',
      'Warden (Ranger), Luminary and Reliquarian (Scion) replace Raider, and the Covens seed gains the ten missing skills.',
    ],
    commits: [],
    compare: 'v0.20.0...v0.21.0',
  },
  {
    version: '0.20.0',
    date: '2026-11-22',
    title: 'Preset tiers, currency tiers and folder help',
    notes: [
      'The three strictness tiers now step clearly: Normal, Strict and Very Strict raise the white and blue item-level floors, and only the build’s own bases are shown. Normal is the loosest (a beginner default), Very Strict keeps only high-ilvl bases.',
      'Magic flasks are visible again in endgame, where the all-Magic hide used to remove them, and 4-links show in every leveling preset and in Endgame Normal.',
      'Very Strict keeps tier-2 currency — Chaos, Alchemy, Vaal, Regal, Fusing and the rest — and hides low-tier uniques instead of over-hiding orbs.',
      'The economy tier lists now actually apply, so Strict no longer drops good currency: only the vendor tier (scrolls, transmutes, catalysts) is hidden.',
      'The builder drops the unusable “Folder path (reference)” field; the Windows and Linux filter paths now sit inside the How to install section.',
    ],
    commits: [],
    compare: 'v0.19.1...v0.20.0',
  },
  {
    version: '0.19.1',
    date: '2026-11-22',
    title: 'Hide Cloth Belt in the Minion preset',
    notes: [
      'The Minion family preset now hides normal, magic and rare Cloth Belts, matching the Necromancer ascendancy.',
      'The exclusion moved from the Necromancer ascendancy to the Minion family, which is the default preset and the one the Necromancer actually uses.',
      'Unique Cloth Belts such as Fated Cloth Belt remain visible.',
    ],
    commits: [],
    compare: 'v0.19.0...v0.19.1',
  },
  {
    version: '0.19.0',
    date: '2026-11-22',
    title: 'Category backgrounds and build-specific base exclusions',
    notes: [
      'The Rarity theme now uses category backgrounds: S-tier orbs get deep magenta, best jewels violet, divination cards navy, quality flasks emerald, fragments amber, gems teal, jewels indigo and league viscera burnt orange.',
      'Divine Orb and Mirror of Kalandra are S-tier; high-value unique bases share the S-tier backdrop, while best jewels keep their own violet.',
      'Category colours only restyle items the preset already shows; visibility is unchanged. High contrast and Muted stay uniform.',
      'Necromancer builds now exclude Cloth Belt, whose stun-threshold implicit a summoner cannot use. Unique Cloth Belts remain visible.',
      'Caster builds, including Elementalist, now exclude Iron Ring, whose physical attack implicit is useless for spells. Unique Iron Rings remain visible.',
      'The demo pool and item parser accept league Viscera drops, which have no Rarity line.',
    ],
    commits: [],
    compare: 'v0.18.2...v0.19.0',
  },
  {
    version: '0.18.2',
    date: '2026-11-22',
    title: 'Hide Gold Rings while leveling',
    notes: [
      'Gold Ring, the Item Rarity base, is hidden in Leveling Normal, Strict and Very Strict.',
      'Normal, Magic and Rare Gold Rings are hidden; unique Gold Rings such as Andvarius remain visible.',
      'Endgame is unchanged: an ilvl 80+ Gold Ring can still show if the rare floor allows it.',
    ],
    commits: [],
    compare: 'v0.18.1...v0.18.2',
  },
  {
    version: '0.18.1',
    date: '2026-11-22',
    title: 'Paste currency items into the demo',
    notes: [
      'The item parser now accepts Rarity: Currency, Gem and Divination Card, so orbs no longer fail with “No item blocks found”.',
      'Stack Size lines such as 1/20 now parse as the current stack (1) instead of an invalid number.',
      'Divine, Exalted, Chaos and Regal orbs can be pasted into the demo and item tester; their matching rule and alert are used.',
      'The demo pool now includes Divine, Mirror, Exalted, Chaos and Regal orbs.',
    ],
    commits: [],
    compare: 'v0.18.0...v0.18.1',
  },
  {
    version: '0.18.0',
    date: '2026-11-22',
    title: 'Demo click sounds',
    notes: [
      'Clicking an item in the loot simulator now plays the alert from its matching filter rule.',
      'Quest items, named orbs, uniques, currency and other rules with an alert are audible; rules without an alert stay silent.',
      'The demo synthesises short chimes approximating the game’s built-in sounds rather than shipping GGG audio files.',
      'Added a Sound toggle next to Show hidden; the preference is remembered.',
    ],
    commits: [],
    compare: 'v0.17.0...v0.18.0',
  },
  {
    version: '0.17.0',
    date: '2026-11-22',
    title: 'Quest alerts and named orb sounds',
    notes: [
      'Quest items always show and play the default alert (sound 1, volume 300), even in a From Scratch hide-all filter.',
      'Chaos, Exalted, Divine and Mirror of Kalandra use the game’s built-in Sh voice lines: ShChaos, ShExalted, ShDivine and ShMirror.',
      'The named orb rules still respect the currency tier cutoff, so Chaos stays hidden on Very Strict.',
      'Quest items are parsed by the item tester and demo, with a green Quest label colour.',
    ],
    commits: [],
    compare: 'v0.16.0...v0.17.0',
  },
  {
    version: '0.16.0',
    date: '2026-11-22',
    title: 'Stable filter filenames and preset auto-sync',
    notes: [
      'Filter filenames no longer include the version: filterpath-<name>-<phase>-<strictness>.filter. From Scratch uses hide-all/show-all.',
      'The filter header now records the preset hash, so the site can tell whether a filter file was built from older presets.',
      'When the connected filter file is stale, the site updates it automatically (keeping a .bak) and shows “Your filter was updated with the latest presets.”',
      'Saved builds and imported codes with an older preset hash show a refresh notice; the preview always regenerates with the latest presets.',
      'Existing versioned files need one download to create the stable filename; after that, preset updates sync automatically.',
    ],
    commits: [],
    compare: 'v0.15.3...v0.16.0',
  },
  {
    version: '0.15.3',
    date: '2026-11-22',
    title: 'Browser-specific folder guidance',
    notes: [
      'Only Brave gets the brave://file-system-access flag instructions.',
      'Chrome, Chromium and Edge get a “should be supported” message with policy/extension checks and no flag.',
      'Firefox and Safari get a “use a Chromium browser or download” message, because neither implements the API.',
      'Unknown browsers get the Brave flag plus the general support summary.',
    ],
    commits: [],
    compare: 'v0.15.2...v0.15.3',
  },
  {
    version: '0.15.2',
    date: '2026-11-22',
    title: 'Brave flag guidance everywhere',
    notes: [
      'The brave://file-system-access flag instructions now appear for every unsupported browser, even if Brave detection fails.',
      'Copy and Reload actions sit together in the amber browser-support callout.',
      'README now has a Folder writing browser support section for Chrome, Chromium, Edge, Brave, Firefox and Safari.',
    ],
    commits: [],
    compare: 'v0.15.1...v0.15.2',
  },
  {
    version: '0.15.1',
    date: '2026-11-22',
    title: 'Brave folder-writing guidance',
    notes: [
      'Brave disables the File System Access API by default; the folder panel now says so instead of a generic “download only”.',
      'Added the exact flag, a Copy brave:// flag button and a Reload after enabling button.',
      'Other unsupported browsers now point to Chrome, Chromium or Edge and keep the download fallback.',
    ],
    commits: [],
    compare: 'v0.15.0...v0.15.1',
  },
  {
    version: '0.15.0',
    date: '2026-11-21',
    title: 'Rarity-first default colors',
    notes: [
      'Replaced the slot-colored Classic theme with a Rarity theme: gear text and borders follow Normal, Magic, Rare and Unique instead of weapon/armour/accessory.',
      'All gear uses a black background; Magic is blue, Rare is yellow and Unique is orange.',
      'Currency is default gold, divination cards pale blue, gems teal, maps tan and map fragments gold.',
      'Six-socket rules are split by rarity so a six-socket item also gets its rarity color.',
      'High contrast and Muted remain; Muted now uses a black background.',
    ],
    commits: [],
    compare: 'v0.14.5...v0.15.0',
  },
  {
    version: '0.14.5',
    date: '2026-11-21',
    title: 'Leveling Strict hides everyday Magic gear',
    notes: [
      'Leveling Strict now hides Magic gear below item level 80.',
      'Magic items on a base the build allows still show at ilvl 80+, as a crafting or upgrade outlier.',
      'Wrong-base Magic items stay hidden even at ilvl 80+.',
      'This hides the reported ilvl 43 Magic Topaz Ring while keeping the 80+ exception.',
    ],
    commits: [],
    compare: 'v0.14.4...v0.14.5',
  },
  {
    version: '0.14.4',
    date: '2026-11-21',
    title: 'Seed data is labelled honestly',
    notes: [
      'Meta snapshots now declare provenance: seed or captured.',
      'Seed snapshots show “Curated seed updated <date>”, call the numbers seed weights, and no longer claim measured percentages.',
      'Captured snapshots keep “Captured <date>” and measured percentages.',
      'PLAN now records that a real poe.ninja builds capture is blocked and that My rules are the resolved overlay mode.',
    ],
    commits: [],
    compare: 'v0.14.3...v0.14.4',
  },
  {
    version: '0.14.3',
    date: '2026-11-21',
    title: 'Hide wrong-base gear inside used classes',
    notes: [
      'Items in a used class but the wrong base type are now hidden, e.g. strength helmets and strength/dexterity body armours in the minion preset.',
      'Leveling 4+ link highlights are limited to the build’s usable slots and bases; a 4-link two-hand sword no longer appears in a minion filter.',
      'Unmatched items still default to visible, so the junk rules now include a base-level remainder hide for restricted classes.',
      'Added regression items: rare sceptre, one-hand sword, thrusting sword, magic strength helmet, magic strength/dexterity body armour and a 4-link two-hand sword.',
    ],
    commits: [],
    compare: 'v0.14.2...v0.14.3',
  },
  {
    version: '0.14.2',
    date: '2026-11-21',
    title: 'Hide rares in unused slots',
    notes: [
      'Rare items in slots the build does not use are now hidden at every phase and strictness, not only Endgame Very Strict.',
      'This removes noise such as rare sceptres and one-hand swords from the minion preset while keeping rare wands, shields and other used slots visible.',
      'Unmatched items still default to visible; the added hide rule closes that gap for unused equipment classes.',
    ],
    commits: [],
    compare: 'v0.14.1...v0.14.2',
  },
  {
    version: '0.14.1',
    date: '2026-11-21',
    title: 'Composed section presets',
    notes: [
      'Filter presets are now composed from named section presets: gear, gems, currency, maps, uniques and junk.',
      'Section values and generated filters are unchanged; the UI still exposes one global strictness.',
      'Each section preset has a stable id such as preset-gems-endgame-strict for tests, debugging and future section-specific tuning.',
    ],
    commits: [],
    compare: 'v0.14.0...v0.14.1',
  },
  {
    version: '0.14.0',
    date: '2026-11-21',
    title: 'Template coverage badges',
    notes: [
      'Templates now show an “In preset” badge when the current preset already guarantees the same outcome.',
      'Coverage respects phase and strictness: T15 maps are not covered while leveling, and quality-gem and top-currency cutoffs change with strictness.',
      'Six sockets count as covering six links, because a six-link always has six sockets.',
      'Clicking an “In preset” template still adds a copy so you can override its styling, with a notice explaining it is redundant.',
    ],
    commits: [],
    compare: 'v0.13.1...v0.14.0',
  },
  {
    version: '0.13.1',
    date: '2026-11-21',
    title: 'Reference folder path field',
    notes: [
      'Added a Folder path field for pasting the filters folder location, with Copy and Use suggested path buttons.',
      'The field is reference-only: browsers cannot grant access to a typed path, so Choose folder still connects the folder.',
      'The picker tip explains Ctrl+L on Linux, the address bar on Windows and Cmd+Shift+G on macOS.',
      'Pasting a path that stops at Documents now warns that the game folder is My Games/Path of Exile inside it.',
    ],
    commits: [],
    compare: 'v0.13.0...v0.13.1',
  },
  {
    version: '0.13.0',
    date: '2026-11-21',
    title: 'Filter names, folder writing and save updates',
    notes: [
      'Filter files now use filterpath-<name>-<phase>-<strictness>-<version>.filter. From Scratch uses hide-all or show-all instead of phase and strictness.',
      'The build name is optional: empty names fall back to a readable slug from the selection, e.g. minion or lightning-arrow-deadeye.',
      'A typed name changes the filename and the demo label immediately, before the build is saved.',
      'The builder and demo both show the exact filter being edited, including when you switch to the demo.',
      'The main Download button writes into the connected filters folder first, asks before overwriting, and falls back to a browser download.',
      'The folder panel detects Windows, Linux/Proton or macOS and shows the matching path first; the other platform stays behind a disclosure.',
      'Choosing another folder runs a read/write probe and reports permission problems, with a copyable chmod hint on Linux and folder-permission steps on Windows.',
      'Saved builds now show an Update button next to Load/Delete for the build you loaded; Save creates a copy.',
    ],
    commits: [],
    compare: 'v0.12.0...v0.13.0',
  },
  {
    version: '0.12.0',
    date: '2026-11-21',
    title: 'Advanced rules rework and From Scratch mode',
    notes: [
      'The preset is now locked and never cloned. My rules are evaluated first; copy individual preset rules or whole groups to override them.',
      'Rebuilt My rules editor: item classes, base types, quick attribute/slot chips, rarity, ilvl range, sockets, links, quality, stack, map tier, Continue, style, search and drag reordering.',
      'Added predefined templates: uniques, 6-links, T15 maps, quality gems, top currency, top divination cards, ilvl 80 rares and hide normal/magic gear.',
      'Added From Scratch mode with Hide everything or Show everything as the starting point; phase and strictness are hidden there.',
      'Added conflict warnings, an item test box, rules-only share codes, and full-build code import/export.',
      'My rules follow the selected build, so changing phase, strictness or theme keeps them.',
      'Saved builds now store selection + My rules only; presets always regenerate. Old whole-set clones and saved builds are discarded with a notice.',
      'Share links that carry a build code now restore the build instead of dropping the code.',
      'Clicking the FilterPath title resets the filter, with a confirmation when there are unsaved changes.',
    ],
    commits: [],
    compare: 'v0.11.2...v0.12.0',
  },
  {
    version: '0.11.2',
    date: '2026-11-21',
    title: 'Steam library-aware filter paths',
    notes: [
      'Folder guidance now explains that steamapps lives inside each Steam library, not the home folder.',
      'Shows the default Proton path, an extra-library example, and a find command to locate the prefix.',
      'Clarifies that .filter files go directly into Documents/My Games/Path of Exile, with no filters subfolder.',
      'Updates the builder install steps with the same library-aware wording.',
    ],
    commits: [
      {
        sha: '479ee66',
        message: 'fix: explain Steam library paths for folder sync (0.11.2)',
      },
    ],
    compare: 'v0.11.1...v0.11.2',
  },
  {
    version: '0.11.1',
    date: '2026-11-21',
    title: 'Demo capture, build codes and merged saving',
    notes: [
      'Ctrl+V on the demo immediately imports a valid item block; Clear pasted was removed.',
      'Demo labels use independent random X and Y with overlap avoidance, and Randomize draws a new subset.',
      'The demo follows the latest builder selection through BroadcastChannel and session fallback.',
      'Copy code carries the selection and rules; Import code restores the whole build. The JSON file picker and duplicate share-code panel are gone.',
      'Saved builds store custom rule deltas, rebase them onto the latest presets, and flag unsaved changes; refreshing warns first.',
      'Save build and the filters folder are merged: local save plus file write when a folder is connected.',
      'Folder guidance covers Windows and Proton paths, allows any folder, and offers a download fallback.',
      'The league dropdown uses a compact custom chevron.',
    ],
    commits: [
      {
        sha: '56b4104',
        message: 'feat: demo capture, build codes and merged saving (0.11.1)',
      },
    ],
    compare: 'v0.11.0...v0.11.1',
  },
  {
    version: '0.11.0',
    date: '2026-11-21',
    title: 'Directory sync',
    notes: [
      'Save the filter directly into the PoE filters folder in Chromium browsers.',
      'The folder handle is remembered in IndexedDB; write permission is requested on demand.',
      'Lists existing .filter files with their FilterPath version and flags stale files.',
      'Overwrites ask for confirmation and keep the previous contents as <name>.filter.bak.',
      'Never deletes or modifies unrelated files; Firefox and Safari keep the download flow.',
    ],
    commits: [
      {
        sha: '1489334',
        message: 'feat: directory sync with version detection and backups (0.11.0)',
      },
    ],
    compare: 'v0.10.2...v0.11.0',
  },
  {
    version: '0.10.2',
    date: '2026-11-21',
    title: 'Demo replaces the builder preview',
    notes: [
      'Removed the inventory preview from the builder; the loot simulator is now the single preview surface.',
      'Demo labels spread across the full background height and randomize on load and on Randomize.',
      'Hovering a demo label opens the game-style item tooltip automatically; tapping pins it on touch.',
      'Removed the redundant strictness explanation block.',
      'Deleted the unused paper-doll and icon code.',
    ],
    commits: [
      {
        sha: '1c8c74c',
        message: 'feat: replace builder preview with the loot simulator (0.10.2)',
      },
    ],
    compare: 'v0.10.1...v0.10.2',
  },
  {
    version: '0.10.1',
    date: '2026-11-21',
    title: 'Meta picking, import code, random drops and item tooltips',
    notes: [
      'Meta mode: any skill can be picked across families; only the ascendancies recorded for that skill are offered, with their snapshot share.',
      'Renamed the filter copy button to "Copy filter" and reduced advanced import to a single "Import code" field; the JSON file picker is gone.',
      'The loot simulator randomizes a fresh subset of drops on load and on Randomize; pasted items are highlighted as new.',
      'Clicking an item in the inventory preview opens a game-style tooltip with requirements, sockets and the matching rule.',
      'Inventory tiles now show rarity labels and stronger rarity borders.',
      'Removed per-section strictness; one global strictness applies to the whole filter.',
    ],
    commits: [
      {
        sha: 'fdd9c68',
        message: 'fix: meta picking, import code, random drops and item tooltips (0.10.1)',
      },
    ],
    compare: 'v0.10.0...v0.10.1',
  },
  {
    version: '0.10.0',
    date: '2026-11-21',
    title: 'Economy tiers and the daily refresh',
    notes: [
      'Filter rules now use poe.ninja economy tiers for currency, fragments, divination cards and high-value unique bases.',
      'Tiering converts chaos to divine, filters names to valid BaseTypes, and falls back to static lists when data is missing.',
      'Hand-written overrides in src/presets/economy-overrides.yaml always win.',
      'A daily GitHub Actions workflow refreshes the snapshot and opens a PR when tiers change; manual dispatch is available.',
    ],
    commits: [
      {
        sha: 'afb2a85',
        message: 'feat: add economy tiers and daily refresh (M2b/M2c)',
      },
    ],
    compare: 'v0.9.1...v0.10.0',
  },
  {
    version: '0.9.1',
    date: '2026-11-21',
    title: 'Game-like loot simulator and always-on sections',
    notes: [
      'The loot simulator now uses an original game-like ground background.',
      'Drops are scattered as overlapping in-game-style labels, with a Scatter button.',
      'Clicking a label shows the matching rule and reason.',
      'Removed the section toggles: all sections are always included, and advanced clones control overrides.',
    ],
    commits: [
      {
        sha: 'd54704c',
        message: 'feat: game-like loot simulator and always-on sections (0.9.1)',
      },
    ],
    compare: 'v0.9.0...v0.9.1',
  },
  {
    version: '0.9.0',
    date: '2026-11-21',
    title: 'Themes, per-section strictness and saved builds',
    notes: [
      'Added three filter themes: Classic, High contrast and Muted.',
      'Per-section strictness for gear, gems, currency, maps and uniques; the global choice still sets all five.',
      'Saved builds in localStorage, with load and delete.',
      'Theme and section strictness round-trip through share links and clone keys.',
      'The filter header records non-default section strictness.',
    ],
    commits: [
      {
        sha: '883ff8f',
        message: 'feat: add themes, per-section strictness and saved builds (M2a)',
      },
    ],
    compare: 'v0.8.0...v0.9.0',
  },
  {
    version: '0.8.0',
    date: '2026-11-21',
    title: 'Loot simulator, style editing and share links',
    notes: [
      'Added a loot simulator page that shows drops with their filter labels.',
      'Paste item text from the game to add it to the simulation; parses class, rarity, base, item level, sockets, links, quality, stack size and map tier.',
      'Per-rule style editing: text, border, background, font size and alert sound.',
      'Share codes can now be copied as a link; opening the link imports the clone automatically.',
      'The builder header links to the simulator with the current selection.',
    ],
    commits: [
      {
        sha: 'ec8a45e',
        message: 'feat: add loot simulator, style editing and share links (0.8.0)',
      },
    ],
    compare: 'v0.7.0...v0.8.0',
  },
  {
    version: '0.7.0',
    date: '2026-11-21',
    title: 'Advanced rules, locked presets and clones',
    notes: [
      'Every generated rule is shown in a locked, section-grouped pane.',
      'Whole-set clones are stored in localStorage and replace the generated rules for that exact selection.',
      'Rule editor: enable, reorder, duplicate, delete, change action, comment, rarity, item level and Continue.',
      'New rules can be built from DEX/STR/INT requirement chips, Head, Weapon 2H and Weapon ranged.',
      'RePoE base data now keeps attribute requirements for accurate chips.',
      'Export/import JSON and compressed share codes, capped at 8 KB with a file fallback.',
      'Stale clones warn when the locked preset changes and never merge silently.',
    ],
    commits: [
      {
        sha: 'a4bba89',
        message: 'feat: add advanced rules, locked presets and clones (M2g)',
      },
    ],
    compare: 'v0.6.0...v0.7.0',
  },
  {
    version: '0.6.0',
    date: '2026-11-21',
    title: 'Independent family, ascendancy and meta modes',
    notes: [
      'Replaced the cascade with three independent modes: by family, by ascendancy and by meta build.',
      'Ascendancy mode uses a default family loadout, e.g. Juggernaut two-hand axe or Deadeye bow.',
      'Meta mode lists every snapshot skill grouped by family, then the ascendancy.',
      'Presets moved to YAML under src/presets, compiled to JSON with JSON Schema validation.',
      'Mode-aware file names and share links; old cascade and archetype links still resolve.',
      'meta:add now edits YAML and rebuilds the compiled presets.',
    ],
    commits: [
      {
        sha: '6f70b51',
        message: 'feat: add independent family, ascendancy and meta modes (M2f)',
      },
    ],
    compare: 'v0.5.0...v0.6.0',
  },
  {
    version: '0.5.0',
    date: '2026-11-21',
    title: 'Inventory preview with original icons',
    notes: [
      'Added a paper-doll preview: weapon, offhand, all four armour slots, belt, amulet, two rings, jewel and two flasks.',
      'Added the 12 x 5 inventory grid with representative drops, including the reported leak cases.',
      'Original FilterPath SVG icons per equipment and loot class; no GGG art.',
      'Tapping a tile shows the matching rule, its index and whether the item is shown or hidden.',
      'Shown/hidden counts and a show-hidden toggle make strictness changes visible.',
      'Moved the full-width preview above the generated filter text.',
    ],
    commits: [
      { sha: 'cbb83f9', message: 'feat: add inventory preview with original icons (M2d)' },
    ],
    compare: 'v0.4.0...v0.5.0',
  },
  {
    version: '0.4.0',
    date: '2026-11-21',
    title: 'Family, skill and ascendancy selection',
    notes: [
      'Replaced the flat 12-build grid with three steps: family, skill, ascendancy.',
      'Added a league selector with Covens and Standard snapshots, 20 skills each.',
      'Mapped all 19 ascendancies to armour, shield and jewel tags.',
      'Skills own weapon and offhand; two-handed skills drop the offhand.',
      'Compact file names such as FilterPath-v0.4.0-necromancer-summon-skeletons-lev-normal.filter.',
      'Old archetype share links now resolve to the closest new selection.',
      'Added the manual meta:add CLI, schema tests, a PR validation workflow and a monthly refresh reminder.',
    ],
    commits: [
      {
        sha: '5b97db7',
        message: 'feat: add family, skill and ascendancy selection (M2e)',
      },
    ],
    compare: 'v0.3.1...v0.4.0',
  },
  {
    version: '0.3.1',
    date: '2026-11-21',
    title: 'Changelog page and selection plan',
    notes: [
      'Fixed the changelog link by serving changelog.html as a separate page.',
      'Documented the three-step selection model: family, then skill, then ascendancy.',
      'Recorded the remaining open plan items and the M2e acceptance criteria.',
    ],
    commits: [
      { sha: '49caadd', message: 'fix: serve the changelog as its own page' },
    ],
    compare: 'v0.3.0...v0.3.1',
  },
  {
    version: '0.3.0',
    date: '2026-11-21',
    title: 'Changelog, matcher and leak proof',
    notes: [
      'Added the in-site changelog with releases and commit links.',
      'Added a rule matcher shared with the generated filter, as groundwork for the inventory preview.',
      'Added regression fixtures for the four items reported as leaking.',
      'The download panel now shows the exact in-game filter name.',
      'Install notes now explain that online filters and local files are separate.',
    ],
    commits: [
      { sha: 'b0f3f76', message: 'feat: share filter rules with a preview matcher' },
      { sha: 'bb84fff', message: 'feat: add an in-site changelog' },
    ],
    compare: 'v0.2.0...v0.3.0',
  },
  {
    version: '0.2.0',
    date: '2026-11-21',
    title: 'Versioned filters and safer BaseType names',
    notes: [
      'Filter header and file name include the build version and filter format.',
      'Every emitted BaseType is validated against a generated registry in CI.',
      'Unique names are no longer used in BaseType rules, which made the client reject the whole filter.',
      'Install path corrected to Documents/My Games/Path of Exile, including the Proton prefix.',
    ],
    commits: [
      { sha: '6d8ae5e', message: 'fix: correct the filter install folder' },
      { sha: '063d9d2', message: 'fix: only emit BaseType names the game accepts' },
      { sha: '990c54e', message: 'feat: version generated filters' },
      { sha: 'a9b7e46', message: 'docs: record M0-M1 lessons and plan preview and directory sync' },
    ],
    compare: 'v0.1.0...v0.2.0',
  },
  {
    version: '0.1.0',
    date: '2026-11-21',
    title: 'First working generator',
    notes: [
      '12 archetypes across all 7 classes, with leveling and endgame presets.',
      'Normal, Strict and Very Strict.',
      'Gear, gem, currency, map/fragment and unique sections with toggles.',
      'Deterministic emitter, syntax validator and golden filters.',
      'URL-hash sharing, download, copy and a mobile action bar.',
      'GitHub Pages deployment with tests in CI.',
    ],
    commits: [
      { sha: '9b22944', message: 'feat: scaffold FilterPath M0' },
      { sha: 'ee13717', message: 'chore(ci): update Pages workflow actions' },
      { sha: '8fabd45', message: 'feat: generate build-specific filters (M1)' },
    ],
  },
];

export function commitUrl(sha: string): string {
  return `${REPO_URL}/commit/${sha}`;
}

export function compareUrl(range: string): string {
  return `${REPO_URL}/compare/${range}`;
}

export function releaseUrl(version: string): string {
  return `${REPO_URL}/releases/tag/v${version}`;
}