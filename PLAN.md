# FilterPath — Plan

Build-specific Path of Exile 1 loot filters in three clicks.

Pick an archetype (`Necromancer minions`, `Cyclone`, `Lightning Arrow`), pick
levelling or endgame, download a `.filter`. No account, no loot simulator, no
hundred-item editor.

**Status:** M0, M1 and the M2d matcher groundwork shipped at **v0.3.0**. A
generated filter was loaded successfully in the game client on 2026-11-21.
M2a/M2b and the inventory UI are next.

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

---

## 3. Stack

- React 19 + Vite 8 + TypeScript 5.9, Tailwind 4
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
      data/matrix.ts     the twelve curated builds
      index.ts           registry
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
    preview/             filter matching against sample items (M2d)
    preview/match.ts     first-match evaluation, Continue support
    preview/samples.ts   reported leaks + representative drops
  ui/                    wizard, preview, URL state
    Changelog.tsx        release history page
    preview/             inventory preview components (M2d)
  sync/                  download | clipboard | fileSystem | (future) api
    handles.ts           IndexedDB storage for directory handles (M3a)
    fileSystem.ts        pick, list, read, write (M3a/M3b)
  changelog.ts           release and commit data for the site
scripts/
  extract-repoe.mjs
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
  "skills": ["Summon Skeletons", "Raise Zombie", "Summon Spectre"]
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

Implementation notes:

- Archetypes live in one matrix file, `src/core/archetypes/data/matrix.ts`.
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
- ETag cache between runs; UA `FilterPath/x.y (contact: …)`
- Economy affects only currency/unique/div-card highlighting, never gear bases

**Done:** a valid PR appears with refreshed tiers; a simulated schema break
leaves the previous file and fails the job.

### M2d — Visual inventory preview

See what the filter does before downloading it.

- [x] `src/core/preview/samples.ts`: reported leak fixtures plus
  representative drops — bases per archetype slot, junk white/magic gear, low-
  and high-ilvl rares, currency, a divination card stand-in, a unique, a gem,
  a map.
- [x] `src/core/preview/match.ts`: evaluate generated rules against an item
  (first match wins, `Continue` respected). Pure, unit-tested, and reused by
  the syntax tests.
- [ ] `src/ui/preview/InventoryPreview.tsx`: equipment panel (weapon, offhand,
  helmet, body, gloves, boots, belt, amulet, two rings, flasks) plus a 12x5
  inventory grid. Every tile shows the item name and rarity colour, with a
  shown/hidden state. Hidden tiles are dimmed; a "show hidden" toggle reveals
  them.
- [ ] No GGG art. Tiles are CSS/SVG with text and simple class glyphs, so the
  preview stays offline and licence-clean.
- [ ] Live updates with build, phase, strictness and section toggles.

**Done:** switching phase or strictness visibly changes which sample items are
shown; a normal ilvl 5 helmet is hidden while an ilvl 86 rare ring is shown;
the preview loads no external assets.

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
- Every archetype carries `verifiedFor`; bump it when checked against a league
- Disclaimer stays visible: *"This product isn't affiliated with or endorsed by
  Grinding Gear Games in any way."*

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Matrix goes stale each league | `verifiedFor` + changelog + checklist per league |
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

- Contact email for the poe.ninja User-Agent string (M2c)
- Whether the repo stays public (Pages on free plan requires it)
- Confirm `master` as the default branch in the Actions workflow if it is renamed
- Verify the Windows filter path (`Documents/My Games/Path of Exile`) in the
  install copy, not just Proton
- Decide how M3b handles old versioned files: keep as `.bak`, archive, or offer
  removal (default: keep and flag)
- Decide whether the M2d preview uses text-only tiles permanently (no GGG art)
  or adds original FilterPath illustrations
- Repository is live at https://lordgreg.github.io/filterpath/