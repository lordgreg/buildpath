# FilterPath — Plan

Build-specific Path of Exile 1 loot filters in three clicks.

Pick an archetype (`Necromancer minions`, `Cyclone`, `Lightning Arrow`), pick
levelling or endgame, download a `.filter`. No account, no loot simulator, no
hundred-item editor.

**Status:** M2e and M2d shipped at **v0.5.0** — three-step selection, league
snapshots, and the paper-doll/inventory preview with original icons. M2a
(themes and saved presets), M2b/M2c (economy) and M3 (directory sync) remain.

---

## 1. Positioning

FilterBlade already has "Auto-Adjust for build", but it requires a PoE login
and a character import, and it is a general filter editor. FilterPath competes
on **time to a working filter**, not on features.

| | FilterBlade | FilterPath |
|---|---|---|
| Account required | yes, for build adjust and sync | no |
| Input | character import or manual | 3 clicks |
| Scope | full editor + simulator | opinionated generator |
| Runtime | backend + database | static, GitHub Pages |

### Non-goals (v1)

- PoE 2, Ruthless, SSF-specific tuning
- Loot simulator, per-item rule editor, filter import/round-trip
- i18n
- Runtime calls to poe.ninja or pathofexile.com from the browser
- Monetisation of any kind

---

## 2. Constraints that shaped the design

### 2.1 Filters cannot match mod rolls

A `.filter` block matches item properties: `BaseType`, `Class`, `Rarity`,
`ItemLevel`, `DropLevel`, `AreaLevel`, `Sockets`, `LinkedSockets`,
`SocketGroup`, `Quality`, `StackSize`, `HasExplicitMod`, `HasEnchantment`,
`Corrupted`, `Mirrored`, and influence flags. It cannot ask "does this wand have
+1 to minion gems".

Consequences:

- Archetypes select **base types, item classes and tags**, not rolled stats.
- `HasExplicitMod` needs exact internal mod names and breaks between patches.
  Use it only where verified; `keyMods` is documentation, not a rule source.
- "Minion wand" means *bases tagged `weapon_can_roll_minion_modifiers`*, not
  "wands that rolled a minion mod".

### 2.2 OAuth is frozen; sync means the filesystem

- The official API supports `POST /item-filter` with scope `account:item_filter`.
- GGG's docs: **"We are currently unable to process new applications."**
  New OAuth clients cannot be registered.
- Web apps must be **confidential clients** (server-held secret, registered
  HTTPS domain). GitHub Pages can never perform the token exchange.
- Public clients (PKCE) must redirect to `127.0.0.1`, so a hosted web app cannot
  use that route either.
- FilterBlade's sync works because its confidential client predates the freeze.
  We cannot borrow its credentials.

Therefore M3 is **local folder sync**: the File System Access API writes the
filter straight into `Documents/My Games/Path of Exile`. OAuth upload stays
behind the same `FilterSync` interface for if GGG reopens registration.

### 2.3 poe.ninja: economy yes, builds no

- Builds/profiles API is explicitly closed to third parties (load and privacy
  reasons). The curated archetype matrix is the only lawful route.
- Reading the public builds pages by hand and summarising the top skills is
  fine; automated fetching is not. The GGG ladder alternative needs an OAuth
  client, and registration is frozen.
- Economy endpoints are a supported public surface:
  - `GET /poe1/api/economy/leagues`
  - `GET /poe1/api/economy/stash/current/currency/overview?league=&type=Currency|Fragment`
  - `GET /poe1/api/economy/stash/current/item/overview?league=&type=…`
- Rules we must follow: conditional requests (ETag), ~15 min upstream refresh,
  descriptive User-Agent with contact, no aggressive polling, proxy/cache on
  our side, no stability guarantee.
- A GitHub Actions cron is the "own backend": fetch, compute tiers, commit,
  deploy. Users never call the API.

### 2.4 Base item data

RePoE `base_items.json` trimmed to `name`, `itemClass`, `tags`, `dropLevel`,
`width`, `height`. Committed so builds are offline and reproducible. Refresh
with `npm run extract:repoe` (pin `REPOE_REF` for reproducibility).

The same extractor writes `known-base-types.json`, the registry of every name
the game accepts in a `BaseType` condition. RePoE lags on some new items
(`Fracturing Orb`, `Hinekora's Lock`), so a small reviewed supplement,
`base-types-extra.json`, is merged in. Every generated filter is validated
against this registry in CI.

### 2.5 Versioning

Filters must be identifiable once they leave the browser, because the in-game
dropdown only shows the file name.

- `package.json` version is injected at build time as `__APP_VERSION__`
  (Vite `define`); the UI shows the same value.
- `FILTER_FORMAT_VERSION` in `src/core/filter/version.ts` tracks the emitted
  structure. Bump it when a consumer must notice a change.
- Header: `# FilterPath <app version> - filter format <n>`.
- File name: `FilterPath-v<app version>-<build>-<phase>-<strictness>.filter`,
  so the dropdown shows exactly which version produced the file.
- A version bump therefore creates a new file name; old files are never
  silently overwritten by a download. Directory sync (M3b) reads the header to
  detect and update stale FilterPath files.
- Goldens pin `dev`; a separate test pins `9.9.9` to cover the format line and
  the sanitised file name.

### 2.6 Client validation: the `BaseType` namespace

The game validates every name in every `BaseType` condition and **rejects the
whole filter** on the first unknown one. Two consequences:

- Unique item names are not base types. `BaseType "Aegis Aurora"` aborts the
  filter; filters reference `Champion Kite Shield` instead. Until M2b, all
  uniques share one generic rule.
- Currency and divination card names *are* base types, so they can be listed
  directly. poe.ninja's item overview exposes a `baseType` field for uniques,
  which M2c should use to turn prices into valid filter rules.

`known-base-types.json` plus the CI test is the safety net. One typo fails the
build instead of the user's filter.

### 2.7 Lessons from M0–M1

| What happened | Durable fix |
|---|---|
| OAuth registration frozen, so no account upload | Local folder sync; API stays behind an interface |
| poe.ninja builds API closed | Curated matrix, economy data only |
| Filter put in `steamapps/common/Path of Exile/filters` and not listed | Correct path is `Documents/My Games/Path of Exile` inside the Proton prefix |
| Dropdown looked populated but only had online filters | `OnlineFilters/` is a separate source; local files are files |
| `BaseType "Aegis Aurora"` made the client reject the entire filter | Generic unique rule + BaseType registry test |
| RePoE missing `Fracturing Orb`, `Hinekora's Lock` | Reviewed supplement merged into the registry |
| RePoE has no `int_shield` tag | Intersect broader tags with `Class` (e.g. `int_armour` + `Shields`) |
| Non-ASCII text in comments is pointless risk | Filters are ASCII-only, asserted in tests |
| Reported leaks (normal gloves, magic axe, low magic armour) | All four items were from an **online filter still selected** (`item_filter` in `production_Config.ini` pointed at `OnlineFilters/PVzj7BcL`), not FilterPath. Added matcher fixtures proving FilterPath hides them and surfaced the exact in-game name |
| Client caches the filter list after a file changes | Reopen the dropdown or restart; documented in install steps |
| "changelog" did nothing | The link used a hash route inside an app that owns the hash. The changelog is now a separate `changelog.html` Vite entry |
| Pages workflow used Node 20-era actions | Action majors kept current (`checkout@v7`, etc.) |
| A filter that parses can still be functionally wrong | In-game smoke test is part of M1's definition of done |

### 2.8 Verifying which filter the game is running

The dropdown mixes local files and online filters, so "the filter loaded" does
not prove the right one is selected.

- The selected local filter must appear as `FilterPath-v<version>-...` in the
  in-game dropdown.
- Online filters live in `OnlineFilters/` under
  `Documents/My Games/Path of Exile` and use opaque IDs. `item_filter=<id>` in
  `production_Config.ini` identifies the active one.
- Items already on the ground may keep labels from the previously active filter
  until they are re-rendered.
- The site shows the exact in-game name next to Download; use it as the check.

### 2.9 Build selection model (M2e)

The flat list of 12 curated builds is a placeholder. The selector becomes three
steps, coarse to specific:

1. **Family** — the gear baseline, independent of class:
   - `caster` — int; wand/sceptre + ES or spirit shield; ES or ES/EV armour.
   - `minion` — int; minion wand + minion shield; armour/ES.
   - `bow` — dex; bow + quiver; evasion.
   - `melee` — str or str/dex; one- or two-hander + shield; armour.
   - `hybrid` — dex/int; claw/dagger + shield; evasion/ES.
2. **Archetype** — a concrete skill from a league snapshot of poe.ninja's
   builds pages, filtered by family. Examples: caster → Hexblast, Detonate
   Dead, Righteous Fire; minion → Summon Skeletons, Raise Spectre; bow →
   Lightning Arrow, Toxic Rain; melee → Cyclone, Boneshatter; hybrid →
   Frost Blades, Hexblast Mines.
3. **Ascendancy** — only ascendancies of classes that can play the skill.
   Drives the attribute bias, defence mix and reviewed exception overrides.
   The skill owns weapon/offhand; the ascendancy owns armour and attributes.

A league selector sits above the family step. It defaults to the current league
and exposes older snapshots read-only.

Resolution:

```
BuildProfile = resolveProfile(family, skill, ascendancy)
```

- Weapon and offhand come from the family, overridden by skill exceptions
  (Righteous Fire sceptre, Cyclone two-hander, bow skills + quiver).
- Armour tags come from the ascendancy's class and defence bias, intersected
  with the family's baseline.
- Attributes and jewel base come from the ascendancy.
- Accessories and flasks use shared defaults.
- File name: `FilterPath-v<ver>-<asc>-<skill>-<lev|end>-<strictness>.filter`,
  e.g. `FilterPath-v0.4.0-necro-spectre-lev-strict.filter`.
- URL: `#league=...&family=...&skill=...&ascendancy=...&phase=...&strictness=...&sections=...`.

Data:

- `src/meta/ascendancies.ts`: all 19 ascendancies with class, attributes,
  defence bias and a small reviewed exception table.
- `src/meta/leagues/<id>.json`: one snapshot per league, with `league`,
  `capturedAt`, `source` and skills. Each skill carries `name`, `family`,
  `classes`, `ascendancies` and `playShare`. Target at least 4 skills per
  family, about 20 per league.
- `src/meta/leagues/index.json`: league order, newest first, marks the current
  league.
- Capture is **manual** from poe.ninja's public builds pages because the builds
  API is closed to third parties. Reading the pages and summarising the top
  skills is the intended escape hatch; automated fetching is not.
- Capture windows: within the first 48 hours of a league and after the first
  balance patch; monthly as a backstop. Twenty entries take roughly 15-20
  minutes.
- Skill names are validated against RePoE's `gems.json`; `meta:add` offers that
  list, so the curator selects a gem instead of typing a name. Popularity,
  classes and ascendancies remain human-curated.
- A local CLI (`npm run meta:add`) appends or edits a skill; changes land
  through a PR.
- If poe.ninja ever grants API access or GGG reopens OAuth registration, the
  source can be swapped behind a `MetaSource` interface without changing the
  JSON shape.
- The selector shows "Meta snapshot from poe.ninja builds, captured \<date\>"
  with a link to the build pages.
- A `workflow_dispatch` Action validates meta PRs and opens a league-start
  refresh reminder. It never fetches builds data.
- A family-only fallback covers skills missing from the snapshot.

Migration: the 12 current builds become seed skill entries. A compatibility
adapter keeps old share links and the golden tests working during the switch.

**Done:** five family cards; skills filtered by family; ascendancies filtered by
the skill's classes; changing skill changes weapon/offhand; changing ascendancy
changes armour/attributes; share links restore all three; old links still open
a sensible profile.

---

## 3. Stack

- React 19 + Vite 8 + TypeScript 5.9, Tailwind 4
- Multi-page Vite build: builder (`index.html`) + static changelog
  (`changelog.html`)
- Vitest for unit and golden-file tests
- GitHub Pages via Actions, project path `/filterpath/`
- No router: wizard state lives in the URL hash (shareable links for free)
- No secrets in the client, ever

---

## 4. Layout

```
src/
  core/                  no React imports
    archetypes/
      types.ts           Archetype and SlotSpec
      validate.ts        runtime validation
      data/matrix.ts     interim twelve curated builds
      index.ts           registry
    meta/                families, ascendancies, league snapshots (M2e)
      ascendancies.ts     class, attributes, defence bias, exceptions
      leagues/<id>.json  one skill snapshot per league
      leagues/index.json league order and current league
    filter/
      types.ts           rule model, styles
      presets.ts         leveling/endgame x strictness
      emit.ts            deterministic .filter serializer
      validate.ts        syntax validator
      version.ts         filter format version
      generate.ts        config -> filter text
      junk.ts            hides for irrelevant gear
      rules/             gear, currency, gems, maps, uniques
      __golden__/        representative generated filters
    data/
      base-types.json    generated, committed
      known-base-types.json  every valid BaseType, generated
      base-types-extra.json  reviewed supplement for RePoE gaps
      resolve.ts         slot spec -> base types
      economy.json       generated by M2c, committed
      overrides.json     hand-written, wins over fetched prices
    tiering.ts           price -> tier, pure (M2b)
    preview/
      match.ts           first-match evaluation, Continue support
      samples.ts         reported leaks + representative drops
  ui/                    wizard, preview, URL state
    Changelog.tsx        release history page
    preview/             inventory preview components (M2d)
  sync/                  download | clipboard | fileSystem | (future) api
    handles.ts           IndexedDB storage for directory handles (M3a)
    fileSystem.ts        pick, list, read, write (M3a/M3b)
  changelog.ts           release and commit data for the site
scripts/
  extract-repoe.mjs
  meta-add.mjs           manual league snapshot editor (M2e)
  refresh-economy.mjs    M2c
```

Unit tests sit next to the code (`*.test.ts`).

### Data model

`Archetype` (see `src/core/archetypes/types.ts`):

```jsonc
{
  "id": "necro-minions",
  "name": "Necromancer Minions",
  "class": "Witch",
  "ascendancy": "Necromancer",
  "summary": "…",
  "leveling": true,
  "verifiedFor": "Covens",
  "slots": {
    "weapon": {
      "itemClasses": ["Wand"],
      "tags": ["weapon_can_roll_minion_modifiers"]
    },
    "offhand": {
      "itemClasses": ["Shield"],
      "tags": ["focus_can_roll_minion_modifiers"]
    },
    "body": {
      "itemClasses": ["Body Armour"],
      "tags": ["int_armour"],
      "defence": ["armour", "energy-shield"]
    }
  },
  "attributes": ["int"],
  "keyMods": ["+1 to Level of all Minion Skill Gems"],
  "skills": ["Summon Skeletons", "Raise Zombie", "Raise Spectre"]
}
```

Every slot must resolve to real bases through `bases`, `tags` or `itemClasses`.
A resolution test runs against `base-types.json`, so a tag typo fails CI instead
of producing an empty rule.

`economy.json`:

```jsonc
{
  "league": { "id": "covens", "name": "Covens" },
  "fetchedAt": "2026-11-21T06:00:00Z",
  "source": "poe.ninja",
  "tiers": {
    "currency": { "Divine Orb": 1, "Chaos Orb": 3 },
    "uniqueBase": { "Leather Belt": 1, "Heavy Belt": 1 }
  }
}
```

Unique prices arrive keyed by unique name, but filter rules need the **base
type**. The refresh script maps each unique to poe.ninja's `baseType` field and
tiers the base types; unique names remain UI labels only.

`overrides.json` maps a base type (or currency/card name) to a forced tier and
always wins.

---

## 5. Milestones

### M0 — Foundation

- [x] Name, scope, framework decided
- [x] Vite/React/TS/Tailwind scaffold, `base: '/filterpath/'`
- [x] Archetype type + validator + sample, tests
- [x] RePoE extractor and committed `base-types.json`
- [x] GitHub Actions deploy, `.nojekyll`, MIT, disclaimer
- [x] Name availability spot-check (GitHub repo created as `lordgreg/filterpath`)
- [x] First successful deploy

**Done:** app is live on Pages, `npm test` and `npm run build` pass in CI.

### M1 — Pick and download

- [x] 12 archetypes covering all 7 classes
- [x] Leveling and endgame presets; Normal/Strict/Very Strict
- [x] Section toggles: gear, gems, currency, maps/fragments, uniques
- [x] Live `.filter` preview, download, copy to clipboard, share link in hash
- [x] Syntax validator on emitted output; golden files for representative builds
- [x] Version in the filter header and file name (app + filter format)
- [x] Loaded successfully in the game client (Linux/Proton, Covens)
- [x] In-site changelog with releases and commit links
- [x] Exact in-game filter name shown next to Download
- [x] Three-step selection (M2e) shipped in 0.4.0

Implementation notes:

- Archetypes live in one matrix file, `src/core/archetypes/data/matrix.ts`.
  These 12 builds are interim: M2e replaces the selector with family → skill →
  ascendancy.
- Gear rules resolve RePoE tags to base-type lists; slots with no tags use the
  filter `Class` instead, so future bases keep working.
- Rare item-level floors: preset threshold for weapons/armour, 68 for
  accessories, jewels and flasks.
- Currency tiers are hand-maintained until M2b replaces them with prices.
- Uniques are highlighted generically. Unique names are **not** valid
  `BaseType` values; the game rejects the whole filter if one appears.
- Every emitted `BaseType` is checked against `known-base-types.json` (RePoE
  plus a small reviewed supplement) so a bad name fails CI.
- Deep links: `#archetype=...&phase=...&strictness=...&sections=gear,gems,...`.
- In-game file name is `FilterPath-v<version>-<build>-<phase>-<strictness>`,
  e.g. `FilterPath-v0.3.0-necro-minions-leveling-strict`.

**Done:** a generated filter loads in-game with no errors, hides junk, and
highlights the archetype's bases. *(Confirmed 2026-11-21.)*

### M2a — Customize

Theme (colours, sounds), per-section strictness, saved presets in
`localStorage`, mobile layout.

**Done:** a returning user regenerates their filter in under 30 seconds.

### M2b — Content depth

Unique, divination card and gem rules; economy-aware tiers from a hand-refreshed
snapshot; manual override file.

Unique tiering must map unique names to their base types (poe.ninja provides
`baseType`). Multiple uniques can share a base, so a chase-item rule highlights
the whole base family; that is acceptable and must be labelled as such in the UI.

**Done:** tiering matches current prices for the top 50 traded items, and
overrides win.

### M2c — Economy automation

- Workflow: daily 06:00 UTC + `workflow_dispatch`
- Steps: leagues → categories (Currency, Fragment, DivinationCard, Scarab,
  Essence, Oil, Fossil, UniqueWeapon, UniqueArmour, UniqueAccessory,
  UniqueFlask, UniqueJewel) → tiering → schema validation
- Opens a PR (`chore(economy): refresh tiers for <league>`); no PR on failure
- ETag cache between runs; UA
  `FilterPath/x.y (contact: lordgreg@users.noreply.github.com)`
- Economy affects only currency/unique/div-card highlighting, never gear bases

**Done:** a valid PR appears with refreshed tiers; a simulated schema break
leaves the previous file and fails the job.

### M2e — Three-step selection

Ships before M2d so the preview reflects the final model.

- [x] Data model: `Family`, `Skill`, `Ascendancy`, `BuildProfile` resolver
- [x] Ascendancy table: all 19, with class, attributes, defence bias and a
  reviewed exception table
- [x] League snapshots: Covens + Standard seed, at least 4 skills per family
  (20 total), with a league selector
- [x] `npm run meta:add` CLI and meta schema validation
- [x] `workflow_dispatch` Action that validates meta PRs and opens a
  league-start reminder
- [x] Three-step UI replacing the flat 12-build grid
- [x] League, family, skill and ascendancy encoded in the share link and file name
- [x] Compatibility adapter for old share links and existing goldens
- [x] Tests: meta schema, league/family filtering, ascendancy filtering,
  profile resolution

Implementation notes:

- `src/meta/families.ts`, `ascendancies.ts`, `leagues/*.json`, `index.ts` and
  `resolve.ts`; `compileFilter` accepts either a legacy `archetypeId` or a
  `selection`.
- Compact file name:
  `FilterPath-v0.4.0-necromancer-summon-skeletons-lev-normal.filter`.
- The snapshot is manual by design; `meta:add` validates gem names against
  RePoE's catalog, and scripts/basetypes tests fail CI on bad data.
- A monthly reminder workflow opens one issue when the snapshot is due.

**Done:** the selector goes family → skill → ascendancy; changing skill changes
weapon/offhand, changing ascendancy changes armour/attributes; old links still
open a sensible profile.

### M2d — Visual inventory preview

See what the filter does before downloading it.

- [x] `src/core/preview/samples.ts`: reported leak fixtures plus
  representative drops — bases per archetype slot, junk white/magic gear, low-
  and high-ilvl rares, currency, a divination card stand-in, a unique, a gem,
  a map.
- [x] `src/core/preview/match.ts`: evaluate generated rules against an item
  (first match wins, `Continue` respected). Pure, unit-tested, and reused by
  the syntax tests.
- [x] `src/ui/preview/InventoryPreview.tsx`: equipment panel (weapon, offhand,
  helmet, body, gloves, boots, belt, amulet, two rings, two flasks) plus a 12x5
  inventory grid. Every tile shows the item name and rarity colour, with a
  shown/hidden state. Hidden tiles are dimmed; a "show hidden" toggle reveals
  them.
- [x] Paper-doll layout, side by side on desktop and stacked on mobile:

  ```
  EQUIPMENT                         INVENTORY (12 x 5)
  -------------                     ------------------
  Weapon      Offhand               [ tile ] [ tile ] [ tile ] ...
  Helmet      Body armour           [ tile ] [ tile ] [ tile ] ...
  Gloves      Boots                 [ tile ] [ tile ] [ tile ] ...
  Belt        Amulet                [ tile ] [ tile ] [ tile ] ...
  Ring 1      Ring 2                ...
  Jewel       Life/Utility flasks
  ```

  Armour slots are first-class: helmet, body armour, gloves and boots each get
  a fixed tile, plus weapon, offhand, belt, amulet, two rings, a jewel and two
  flasks (life and utility).
- [x] Each tile shows the base name, rarity colour, an original FilterPath SVG
  class icon and a shown/hidden badge. Tapping or hovering a tile explains the
  decision with the matching rule's comment and index from `evaluateRules()`.
- [x] A header summarises "N shown / M hidden" overall and per panel, so a
  strictness change is visible at a glance.
- [x] The preview is a simulation of FilterPath's decision for representative
  bases, not a game render; it does not imply real stat rolls.
- [x] Original SVG icons per equipment and loot class, drawn for FilterPath. No
  GGG assets. Text and CSS remain the fallback when an icon is missing.
- [x] Live updates with build, phase, strictness and section toggles.

Implementation notes:

- `src/core/preview/paper-doll.ts` resolves one rare base per slot from the
  selected build's own base lists, so the equipment panel changes with family,
  skill and ascendancy.
- `src/ui/preview/ClassIcon.tsx` holds the original 24x24 line icons.
- The full-width preview sits below the selector and summary, above the raw
  filter text; the old right-column preview was too narrow for the grid.

**Done:** every armour slot has at least one fixture and changes state with the
archetype; switching phase or strictness visibly changes which sample items are
shown; a normal ilvl 5 helmet is hidden while an ilvl 86 rare ring is shown;
tapping a tile shows why; the preview loads no external assets.

### M3 — Directory sync

**Feasibility:** yes on Chromium, with limits.

- `showDirectoryPicker({ mode: 'readwrite' })` grants access to a user-chosen
  folder. GitHub Pages can use it; no backend involved.
- Directory handles are structured-cloneable. Store them in **IndexedDB**, not
  `localStorage`; `localStorage` only keeps the preference flag.
- Permission is per origin and may return to `prompt` after a restart.
  `requestPermission()` needs a user gesture, so sync is **on demand**: the user
  clicks "Save to folder". No background watcher, no silent writes.
- Reading is supported too: enumerate `.filter` files, read them, parse the
  FilterPath header (`FilterPath <version> - filter format <n>`).
- Firefox and Safari do not implement the picker; they keep the download flow.
- Linux/Proton: the user picks
  `compatdata/238960/pfx/drive_c/users/steamuser/Documents/My Games/Path of Exile`.
  Flatpak browsers may need filesystem permission for `/mnt` before the folder
  is visible.
- Safety: never delete or overwrite unrelated files; write a `.bak` copy before
  replacing; ask before overwriting a file FilterPath did not generate.

#### M3a — Pick, remember, write

- Folder picker, writability check, handle stored in IndexedDB.
- "Save to folder" writes the current filter; overwrite confirmation.
- Re-request permission on return visits with a clear explanation.
- Download remains the fallback.

**Done:** pick the folder once, reload the page, one click writes the filter;
cancelling changes nothing.

#### M3b — List, detect, update

- List local `.filter` files, read headers, show app version and filter format.
- Detect stale FilterPath files and offer "Update".
- Keep the previous version as `.bak`; never auto-delete.
- Show which files are not FilterPath's, and leave them untouched unless the
  user explicitly picks one.

**Done:** an old `v0.1` filter is flagged; updating writes `v0.2` and keeps the
old file as a backup; unrelated filters in the folder are unchanged.

---

## 6. Testing

- Unit: archetype validation, tag resolution against base data, tiering, emit
- Version: header line and file name pinned at `9.9.9`; format version asserted
- BaseType registry: every name in every generated filter must exist in
  `known-base-types.json`; unique item names are explicitly rejected
- Golden: full filter output per archetype/preset, diffed as text
- Syntax: a small parser that checks every block's conditions and actions
- M2d: matcher tests for first-match-wins, `Continue`, and hidden gear
- M2e: meta schema, league/family filtering, profile resolution, compatibility adapter
- M3: mock directory handle; permission, backup, overwrite and no-delete paths
- M2c: refresh script run against fixture JSON, schema failure path tested
- CI runs `npm test` before every build

---

## 7. Conventions

- `src/core` must not import React
- Emit output is deterministic: stable section and rule order, LF line endings
- Filters are ASCII-only
- Never use a unique item name in a `BaseType` condition
- No network in the browser
- No secrets, no analytics
- Conventional Commits
- On every release: bump `package.json`, add the release to
  `src/changelog.ts` and `CHANGELOG.md`, tag `v<version>`, then deploy
- The poe.ninja skill snapshot is captured by hand with `meta:add`; never scrape
  the builds API
- Meta changes land by PR; the validation Action must pass
- Keep old share links working until 1.0
- Every archetype carries `verifiedFor`; bump it when checked against a league
- Disclaimer stays visible: *"This product isn't affiliated with or endorsed by
  Grinding Gear Games in any way."*

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Matrix goes stale each league | `verifiedFor` + changelog + checklist per league |
| Meta snapshot misses a new meta skill | `capturedAt`, family-only fallback, manual refresh each league |
| Manual meta edits drift or break the schema | `meta:add` CLI, schema test in CI, validation Action on PRs |
| League snapshots accumulate with old schemas | migration test and a schema version field per snapshot |
| Skill → class/ascendancy mapping is wrong | resolver tests; UI only offers allowed classes |
| Old share links break after M2e | compatibility adapter and a migration test |
| `HasExplicitMod` breaks between patches | prefer tags/classes; review before use |
| Unknown `BaseType` aborts the whole filter | `known-base-types.json` + CI test + supplement file |
| Filter placed in a folder the game does not scan | Install docs with the Proton path; M3 folder picker |
| Online filters mistaken for local files | Docs call out `OnlineFilters/`; the site shows the exact in-game name |
| A different filter stays selected and looks like a leak | Verify section 2.8; matcher fixtures prove FilterPath's behaviour |
| poe.ninja schema drift | schema validation, keep-last-good, PR review |
| Actions schedule delayed or disabled after inactivity | `workflow_dispatch`; economy drift only affects tiering |
| Chromium-only folder sync | download fallback everywhere |
| Stored directory handle loses permission | explicit re-request flow, no silent writes |
| Flatpak browser cannot see the Proton prefix | manual download fallback, documented |
| Versioned files accumulate in the filters folder | M3b detects stale versions, writes `.bak`, never auto-deletes |
| RePoE dataset changes | commit output, pin `REPOE_REF`, diff in review |
| GGG policy changes | static, non-commercial, disclaimer, no internal endpoints |

---

## 9. Open items

- Whether to expand the paper doll from two to five flask slots
- How off-meta skills behave: family-only fallback or a manual "add skill" field
- Verify the Windows filter path (`Documents/My Games/Path of Exile`) in the
  install copy, not just Proton
- Decide how M3b handles old versioned files: keep as `.bak`, archive, or offer
  removal (default: keep and flag)
- Add the poe.ninja attribution wording to the selector (currently present in
  the league row and footer)
- Repository is live at https://lordgreg.github.io/filterpath/
- Changelog is live at https://lordgreg.github.io/filterpath/changelog.html