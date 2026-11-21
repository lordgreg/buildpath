# FilterPath — Plan

Build-specific Path of Exile 1 loot filters in three clicks.

Pick an archetype (`Necromancer minions`, `Cyclone`, `Lightning Arrow`), pick
levelling or endgame, download a `.filter`. No account, no loot simulator, no
hundred-item editor.

**Status:** v0.15.3 adds browser-specific folder guidance on top of rarity-first
colors, Leveling Strict Magic floors, seed labels, wrong-base gear hiding,
section presets, template coverage, filter naming, folder writing and
saved-build updates. Remaining work is manual QA; real meta capture is blocked
by poe.ninja’s closed builds API.

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

### 2.9 Build selection modes (M2f)

Selection is **three independent modes**, not a cascade. Tabs at the top; phase,
strictness are common below in every mode; all filter sections are always
included, and advanced rules can override or hide anything.

1. **Family (A)** — `caster`, `minion`, `bow`, `melee`, `hybrid`. No class or
   skill. The profile comes from the family preset:
   - caster — int; wand/sceptre + ES or spirit shield; ES or ES/EV armour.
   - minion — int; minion wand + minion shield; armour/ES.
   - bow — dex; bow + quiver; evasion.
   - melee — str or str/dex; one- or two-hander + shield; armour.
   - hybrid — dex/int; claw/dagger + shield; evasion/ES.
2. **Ascendancy (B)** — a flat list grouped by class. The ascendancy preset
   gains a `defaultFamily` / default loadout: Necromancer → minion, Deadeye →
   bow, Juggernaut → melee, Occultist → caster, Trickster → hybrid.
3. **Meta build (C)** — league selector, all snapshot skills grouped by family,
   then ascendancy. The family is derived from the skill. Snapshots stay
   manual.

Resolution:

- A: `profile(family)`.
- B: `profile(ascendancy.defaultFamily)` with the ascendancy's armour,
  attributes and exception overrides.
- C: `profile(skill.family)` with the skill's weapon/offhand overrides and the
  ascendancy's armour/attributes.

Common:

- Phase and strictness apply in every mode; sections are always included.
- File names:
  - `FilterPath-v<ver>-family-<family>-<lev|end>-<strictness>.filter`
  - `FilterPath-v<ver>-<ascendancy>-<lev|end>-<strictness>.filter`
  - `FilterPath-v<ver>-<ascendancy>-<skill>-<lev|end>-<strictness>.filter`
- URL: `#mode=family|ascendancy|meta&...`.
- Old cascade links and the 12 interim links resolve to the closest mode.

Data:

- All presets are YAML under `src/presets/`, compiled to JSON at build time and
  validated with a JSON Schema. The browser never parses YAML.
- `families.yaml`, `ascendancies.yaml` (with `defaultFamily`), and
  `meta/<league>.yaml` snapshots.
- `src/meta/leagues/<id>.json` is replaced by the compiled snapshot.
- Every snapshot declares `provenance: seed` or `provenance: captured`. Seed
  snapshots use curated skill weights and placeholder ascendancy splits; the UI
  labels them as placeholders. A manual capture flips the field to `captured`.
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
  through a PR. A validation Action checks meta PRs, and a monthly reminder
  opens an issue.
- The selector shows "Curated seed updated \<date\>" for seed snapshots and
  labels weights as `seed weight`; captured snapshots show "Captured \<date\>"
  and measured percentages instead.

**Done:** four tabs; family mode needs no class; ascendancy mode uses its
default loadout; meta mode lists all skills grouped and derives the family;
From Scratch needs only a starting point; share links restore the mode; old
links still resolve.

### 2.10 Advanced rules (M2g, revised in 0.12.0)

The preset is **locked and never cloned**. Users add rules on top of it.

- **My rules first** — custom rules are evaluated before every preset rule, so a
  copied preset rule overrides it until the copy is disabled or deleted.
- **Copy, not clone** — copy one preset rule or a whole section into My rules.
  The preset stays visible and untouched.
- **Rule editor** — action, classes, base types, rarity, item level range,
  sockets, links, quality, stack size, map tier, `Continue`, comment and style.
  Rules can be enabled, reordered by drag or buttons, duplicated and deleted.
- **Templates** — uniques, 6-links, T15+ maps, quality gems, top currency, top
  divination cards, ilvl 80+ rares, and hide normal/magic gear. Templates the
  current preset already covers show an “In preset” badge; clicking still adds
  a copy so styling can be overridden.
- **Warnings and search** — catch-all rules that shadow later rules are flagged;
  identical rules are flagged; preset rules are searchable.
- **Item test** — paste one item to see which custom or preset rule decides it.
- **Sharing** — full-build codes carry selection + My rules; rules-only codes
  carry just My rules.
- **Saved builds** — store selection + My rules only. Presets regenerate from
  the latest data. Old whole-set clones are discarded.

**Done:** the preset cannot be edited; copying a rule/group overrides it; My
rules survive reload and share codes; conflict warnings and the item test work.

### 2.11 Filter identity, filenames and folder writing (M2j, 0.13.0)

- **One identity** — the builder and demo show the exact filename being edited.
  The build name travels in the share hash, so the demo never shows a stale
  filter.
- **Filename pattern** — `filterpath-<name>-<phase>-<strictness>-<version>.filter`.
  From Scratch collapses phase/strictness into `hide-all` or `show-all`.
- **Automatic name** — an empty name resolves from the selection: family id,
  ascendancy id, `<skill>-<ascendancy>`, or `custom`. A typed name is slugified
  and applies immediately.
- **Folder guidance** — the browser detects Windows, Linux/Proton or macOS and
  shows the matching folder first. The other platform stays behind a disclosure.
- **Custom folder** — a reference path field stores the location you paste; the
  native picker still grants access, and a temporary write proves read/write
  access. Failures show a copyable `chmod u+w` hint on Linux or
  folder-permission steps on Windows. Browsers never expose the absolute path.
- **Download** — when a folder is connected, Download writes there first, asks
  before overwriting and falls back to a browser download.
- **Saved builds** — loading marks a build as active; its row gets `Update`,
  which overwrites name, selection and My rules. Top-level Save creates a copy.

**Done:** a named filter downloads as
`filterpath-my-vortex-endgame-strict-0.13.0.filter`; the demo shows the same
name; a read-only folder is reported before saving; Update keeps the saved id.

---

## 3. Stack

- React 19 + Vite 8 + TypeScript 5.9, Tailwind 4
- Multi-page Vite build: builder (`index.html`) + static changelog
  (`changelog.html`)
- YAML presets compiled to JSON by a build script; JSON Schema validation with
  Ajv. No YAML parser in the browser.
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
    meta/                data accessors over generated presets
      ascendancies.ts     lookup and rank helpers
      families.ts         lookup helpers
      leagues/            (removed; see src/presets/leagues)
    presets/             YAML sources: families, ascendancies, leagues (M2f)
    generated/           compiled JSON presets, committed (M2f)
    rules/               custom rules, keys, templates and share codes (M2g)
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
    rules/               locked pane and rule editor (M2g)
  sync/                  download | clipboard | fileSystem | (future) api
    handles.ts           IndexedDB storage for directory handles (M3a)
    fileSystem.ts        pick, list, read, write (M3a/M3b)
  changelog.ts           release and commit data for the site
scripts/
  build-presets.mjs      YAML -> JSON + schema validation (M2f)
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
  filter `Class` instead, so future bases keep working. Leveling 4+ link rules
  use the same per-slot target, so they never highlight unusable classes.
- Magic floors: Leveling Normal 10+, Leveling Strict 80+ on an allowed base,
  and no Magic on Very Strict or any Endgame preset.
- Rare item-level floors: preset threshold for weapons/armour, 68 for
  accessories, jewels and flasks. Rares in slots the build does not use are
  hidden at every phase and strictness. Used classes with restricted bases get
  a final Hide so wrong bases do not fall through to the default visible state.
- Currency tiers are hand-maintained until M2b replaces them with prices.
- Uniques are highlighted generically. Unique names are **not** valid
  `BaseType` values; the game rejects the whole filter if one appears.
- Every emitted `BaseType` is checked against `known-base-types.json` (RePoE
  plus a small reviewed supplement) so a bad name fails CI.
- Deep links: `#archetype=...&phase=...&strictness=...&sections=gear,gems,...`.
- In-game file name is
  `filterpath-<name>-<phase>-<strictness>-<version>.filter`, e.g.
  `filterpath-necro-minions-leveling-strict-0.13.0.filter`.

**Done:** a generated filter loads in-game with no errors, hides junk, and
highlights the archetype's bases. *(Confirmed 2026-11-21.)*

### M2a — Customize

- [x] Rarity-first default colors, High contrast, Muted
- [x] One global strictness for the whole filter (per-section strictness removed in 0.10.1)
- [x] Saved builds in `localStorage` with load and delete
- [x] My-rules keys follow the selected build, not phase, strictness or theme
- [x] Non-default section strictness recorded in the filter header
- [x] Mobile layout

Implementation notes:

- `src/core/filter/themes.ts` post-processes generated rules, so themes apply to
  custom rules as well. The default theme uses rarity for gear text and borders,
  default gold for currency, pale blue for cards, teal for gems, tan for maps
  and black backgrounds. Six-socket rules are split per rarity.
- Saved builds live in `src/ui/presets/storage.ts`; they store the full wizard
  state, not just the selection.
- My-rules keys follow the selected build, so changing phase, strictness or
  theme keeps the same rules.

**Done:** a returning user regenerates their filter in under 30 seconds.

### M2b — Content depth

- [x] Economy snapshot generated from poe.ninja's supported economy endpoints
- [x] Tiers for currency, fragments, divination cards and unique bases
- [x] Unique names mapped to their base types; high-value bases get a loud rule
- [x] Hand-written overrides in `src/presets/economy-overrides.yaml` win
- [x] Names filtered to valid BaseTypes so the client never rejects a filter
- [x] Static fallbacks when the snapshot is missing or a category is empty

**Done:** currency, divination and unique highlighting follow the snapshot;
overrides win; every emitted name passes the BaseType registry.

### M2c — Economy automation

- [x] Workflow: daily 06:00 UTC + `workflow_dispatch`
- [x] Categories: Currency, Fragment, DivinationCard, UniqueWeapon,
  UniqueArmour, UniqueAccessory, UniqueFlask, UniqueJewel
- [x] Tiering converts chaos to divine; large unique categories group by base
- [x] Opens a PR (`chore(economy): refresh tiers`) only when the file changes
- [x] User-Agent
  `FilterPath/x.y (contact: lordgreg@users.noreply.github.com)`
- [x] Economy affects only currency/unique/div-card highlighting, never gear bases
- [x] CI runs the full test suite before the PR is opened

**Done:** a changed snapshot produces a PR; an unchanged snapshot exits cleanly.

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
- Only the ascendancies recorded in `topAscendancies` are offered; their
  `ascendancyShares` drive the seed weights until a real capture is available.
- A skill can be picked across families; the family is derived from the skill.

**Done:** the selector goes family → skill → ascendancy; changing skill changes
weapon/offhand, changing ascendancy changes armour/attributes; old links still
open a sensible profile.

### M2e — Initial cascade selector (superseded)

Shipped in 0.4.0. Family → skill → ascendancy was a cascade; the agreed model
is three independent modes in M2f. Kept for history and legacy-link mapping.

### M2f — Three selection modes

- [x] `BuildProfile` refactor: class and ascendancy optional
- [x] Family mode: family preset only, no class or skill
- [x] Ascendancy mode: flat list grouped by class, `defaultFamily` per ascendancy
- [x] Meta mode: league, all skills grouped by family, then ascendancy
- [x] Shared phase and strictness below every mode; sections always on
- [x] Mode-aware file names and share links; old links adapt
- [x] YAML presets under `src/presets/`, compiled to JSON at build time
- [x] JSON Schema validation for every preset file
- [x] Tests: mode resolution, default loadouts, preset compilation, legacy links

Implementation notes:

- `scripts/build-presets.mjs` validates every YAML file with Ajv and writes
  `src/generated/presets.json` with a preset version hash.
- `meta:add` edits the YAML snapshot and index timestamps, then rebuilds and
  validates.
- `Archetype.class` and `.ascendancy` are optional; family mode has neither.
- Ascendancy mode applies the default family and its own armour/defence tags.
- Legacy cascade links and the interim archetype links map to meta mode.

**Done:** the three tabs work independently; ascendancy mode derives its loadout;
meta mode lists all skills grouped; phase/strictness apply everywhere; sections
are always included; old links still resolve.

### M2g — Advanced rules

- [x] Preset locked; no whole-set clone
- [x] My rules evaluated before the preset
- [x] Copy one preset rule or a whole section
- [x] Editor: classes, bases, rarity, ilvl range, sockets, links, quality,
  stack, map tier, Continue, comment and style
- [x] Drag and button reordering, enable, duplicate, delete
- [x] Templates for uniques, 6-links, T15 maps, gems, currency, cards and rares
- [x] Search, catch-all/duplicate warnings and an item test box
- [x] Full-build and rules-only share codes
- [x] Saved builds store only selection + My rules; old clones discarded
- [x] Tests: custom-first ordering, scratch base, templates, config keys
- [x] Filter names, folder OS detection, write probe and saved-build updates

Implementation notes:

- `src/core/filter/generate.ts` composes `[...customRules, ...presetRules]`.
- `src/core/filter/presets.ts` composes the full preset from named gear, gems,
  currency, maps, uniques and junk section presets (`preset-gems-endgame-strict`).
  The UI still exposes one global strictness.
- `src/core/rules/templates.ts` holds the locked template rules.
- `src/core/rules/key.ts` keys My rules per selected build; phase, strictness
  and theme never hide them.
- `src/ui/rules/storage.ts` stores My rules; `src/ui/presets/storage.ts` stores
  saved builds with their custom rules.
- My rules are the overlay mode: custom rules run before the preset, so no
  separate whole-set clone or overlay UI is needed.

### M2h — Loot simulator

- [x] Separate `demo.html` page, reachable from the builder with the selection
- [x] Original game-like ground background
- [x] Drops scattered as overlapping in-game-style labels, with a Randomize button
- [x] A fresh random subset of drops on load and on every Randomize
- [x] Pasted items are highlighted as new on the overlay
- [x] Hovering a label opens the game-style tooltip; tapping pins it on touch
- [x] Labels spread across the full background height
- [x] Click a label to inspect the matching rule
- [x] Paste one or more in-game item blocks to add them
- [x] Parse class, rarity, base, item level, sockets, links, quality, stack size and map tier
- [x] Shown/hidden counts and a show-hidden toggle
- [x] Tests for the paste parser

**Done:** pasting the four reported items shows the same shown/hidden outcome as
the game; labels use the filter's colours and font size.

### M2i — From Scratch mode

- [x] Fourth root mode beside family, ascendancy and meta
- [x] Choose Hide everything or Show everything as the starting point
- [x] Phase and strictness hidden in this mode
- [x] Templates and My rules are the only sources of rules
- [x] Mode-aware filename and URL
- [x] FilterPath title resets with an unsaved-changes confirmation

**Done:** a from-scratch hide-all filter with only “Show all uniques” added
emits the expected rules and in-game filename.

### M2j — Filter identity, filenames and folder writing

- [x] Exact filename shown in the builder and demo
- [x] `filterpath-<name>-<phase>-<strictness>-<version>.filter`
- [x] From Scratch uses `hide-all` / `show-all`
- [x] Optional name with an automatic slug fallback
- [x] OS detection with matching Windows or Linux/Proton guidance
- [x] Custom folder picker with a read/write probe
- [x] Permission hints, including a copyable `chmod u+w` command
- [x] Download writes to the connected folder first, then falls back
- [x] Update button for the loaded saved build; Save creates a copy
- [x] Reference folder path field with pasted-path hints
- [x] Template coverage badges that follow phase and strictness
- [x] Tests: slug/filename, platform detection, write probe, saved-build update

**Done:** a named filter downloads as
`filterpath-my-vortex-endgame-strict-0.13.0.filter`; the demo shows the same
name; a read-only folder is reported before saving; Update keeps the saved id.

### M2d — Visual inventory preview (superseded)

The builder preview was removed in 0.10.2; the loot simulator (M2h) is the
single preview surface.

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
- [x] Live updates with build, phase and strictness; all sections always on
- [x] Click an item for a game-style tooltip with requirements, sockets and the rule
- [x] Rarity labels and stronger borders so unique items are obvious

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
- Only Brave needs a flag (`brave://flags/#file-system-access-api`); Chrome,
  Chromium and Edge support folder writing by default, and Firefox/Safari do
  not implement it. The panel shows the matching message for the detected
  browser.
- Linux/Proton: the user picks
  `<Steam library>/steamapps/compatdata/238960/pfx/drive_c/users/steamuser/Documents/My Games/Path of Exile`.
  The library can be outside the home folder, e.g. `/mnt/<drive>/SteamLibrary`; `steamapps` is per library.
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

- [x] List local `.filter` files, read headers, show app version and filter format.
- [x] Detect stale FilterPath files and flag them.
- [x] Keep the previous version as `.bak`; never auto-delete.
- [x] Leave unrelated files untouched.

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
- M2f: YAML compilation, JSON Schema validity, mode resolution, default loadouts, legacy links
- Preset audit: every family, ascendancy and meta build across all phase/strictness
  combinations is checked for unused-class, wrong-base and 4-link gear leaks
- M2g: custom-first ordering, share-code compression, scratch base, templates
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
- Presets are YAML sources; compiled JSON is committed and validated
- My rules are keyed by selection; presets always regenerate from the latest
  preset version
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
| Share code grows too large | compress, cap the URL, fall back to file export |
| Custom rules shadow preset rules unexpectedly | custom-first notice, catch-all warning, per-rule copy |
| YAML preset and runtime data drift | compile at build time, commit generated JSON, schema test |
| `DEX item` means something different to the user | show the resolved base count and examples before applying |
| Rule order changes silently | explicit order in the editor, `Continue` tests, golden filters |
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

### Data capture (highest priority)

- Real poe.ninja builds capture is **blocked**: the builds API is closed. The
  current Covens and Standard snapshots are marked `provenance: seed`, and the UI
  labels their weights and ascendancy splits as curated placeholders. Replace
  them when a lawful capture source is available.
- Confirm the chip vocabulary beyond DEX/STR/INT, HEAD, 2H and RANGED.

### Product decisions

- Confirm the default family assigned to every ascendancy.
- Old versioned filters currently stay in the folder and are flagged stale;
  decide whether to offer archive/removal in addition to the `.bak` copy.

### Manual validation

- Verify the Windows filter path (`Documents/My Games/Path of Exile`) in the
  installed build, not just Proton.
- Run directory sync in Chromium: pick, remember, permission re-request,
  overwrite confirmation, `.bak` and stale badges.
- Check demo Ctrl+V capture, hover tooltip, Randomize and mobile.
- Copy a build code, reload, and Import code it back on the same and a different selection.
- Save a build with custom rules; confirm presets regenerate while My rules persist.
- Confirm the unsaved-changes prompt on refresh after editing.
- Dispatch the economy workflow once manually to confirm it opens a PR.

### Links

- Builder: https://lordgreg.github.io/filterpath/
- Demo: https://lordgreg.github.io/filterpath/demo.html
- Changelog: https://lordgreg.github.io/filterpath/changelog.html