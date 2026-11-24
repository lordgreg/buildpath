# FilterPath — Plan

Build-specific Path of Exile 1 loot filters in three clicks.

Pick a family, an ascendancy or a meta build, then levelling or endgame, and
download a `.filter`. No account, no loot simulator, no hundred-item editor.

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
- A general filter editor with import/round-trip
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

Therefore sync is **local folder sync**: the File System Access API writes the
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

The source is the maintained RePoE export, not the frozen `brather1ng/RePoE`
repository (no pushes since 2022):

- `repoe-fork/repoe` holds the parser and schema; `repoe-fork/repoe-fork.github.io`
  holds the generated data that the extractor reads.
- The export is pinned to one commit of the data repository and recorded in
  `base-types.json`'s meta, so a run is reproducible. Bump the pin deliberately
  and review the diff.
- Exported `base_items.json` trimmed to `name`, `itemClass`, `tags`, `dropLevel`,
  `width`, `height`. Committed so builds are offline and reproducible. Refresh
  with `npm run extract:repoe` (`REPOE_REF=<commit>` overrides the pin).

The same extractor writes `known-base-types.json`, the registry of every name
the game accepts in a `BaseType` condition. Only item classes the filter
language knows (`class-map.json`) are admitted, so the export's internal
placeholder classes (`HiddenItem`, `RemovedItem`, `GhostItem`, ...) never enter
the registry and a typo still fails the build. A small reviewed supplement,
`base-types-extra.json`, covers names the export lags on. Bases the live game
has dropped or renamed (`Gauche Gloves`, `Serpent Wand`) are listed in the
reviewed `base-types-removed.json` and stripped from both the data and the
registry. Every generated filter is validated against this registry in CI, and
so is every name in the economy tiers: a tier list the registry cannot write
would make the game refuse the whole filter.

### 2.5 Versioning

Filters must be identifiable once they leave the browser, because the in-game
dropdown only shows the file name.

- `package.json` version is injected at build time as `__APP_VERSION__`
  (Vite `define`); the UI shows the same value.
- `FILTER_FORMAT_VERSION` in `src/core/filter/version.ts` tracks the emitted
  structure. Bump it when a consumer must notice a change.
- Header: `# FilterPath <app version> - filter format <n>` plus
  `# Presets: <preset hash>`.
- File name: `filterpath-<name>-<phase>-<strictness>.filter`; the version is
  deliberately **not** in the name, so the in-game selection survives releases.
- The header is the source of truth for staleness. Directory sync reads the
  preset hash and app version of the current file and tells the user it is
  outdated; Save rewrites it (keeping a `.bak`). An automatic rewrite happens
  only from a verified per-file snapshot stored next to the directory handle:
  the builder must still hold the exact selection and My rules the file was
  written with, the file must still hash to what FilterPath wrote, and the
  header must read back as expected. Anything else is reported for the user to
  check and save.
- Saved builds and imported codes carry the preset hash at creation time; an
  older hash produces a refresh notice while the preview regenerates.
- Goldens pin `dev`; a separate test pins `9.9.9` to cover the header and the
  stable file name.

### 2.6 Client validation: the `BaseType` namespace

The game validates every name in every `BaseType` condition and **rejects the
whole filter** on the first unknown one. Two consequences:

- Unique item names are not base types. `BaseType "Aegis Aurora"` aborts the
  filter; filters reference `Champion Kite Shield` instead. High-value uniques
  are highlighted by base type; the rest share one generic rule.
- Currency and divination card names *are* base types, so they can be listed
  directly. poe.ninja's item overview exposes a `baseType` field for uniques,
  which the refresh script uses to turn prices into valid filter rules.

`known-base-types.json` plus the CI test is the safety net. One typo fails the
build instead of the user's filter.

### 2.7 Lessons that shaped the design

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
| A filter that parses can still be functionally wrong | In-game smoke test is part of the definition of done |

### 2.8 Verifying which filter the game is running

The dropdown mixes local files and online filters, so "the filter loaded" does
not prove the right one is selected.

- The selected local filter appears as `filterpath-...filter` in the in-game
  dropdown; the header, not the filename, carries the version and preset hash.
- Online filters live in `OnlineFilters/` under
  `Documents/My Games/Path of Exile` and use opaque IDs. `item_filter=<id>` in
  `production_Config.ini` identifies the active one.
- Items already on the ground may keep labels from the previously active filter
  until they are re-rendered.
- The site shows the exact in-game name next to Download; use it as the check.

### 2.9 Build selection modes

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
3. **Meta build (C)** — the selected league's snapshot skills grouped by family
   or by seed weight, then ascendancy. The family is derived from the skill.
   Snapshots stay manual.

The **league is chosen first**, above the mode tabs; the current league is
preselected and Standard is the fallback. It drives the meta snapshots.

Resolution:

- A: `profile(family)`.
- B: `profile(ascendancy.defaultFamily)` with the ascendancy's armour,
  attributes and exception overrides.
- C: `profile(skill.family)` with the skill's weapon/offhand overrides and the
  ascendancy's armour/attributes.

Common:

- Phase and strictness apply in every mode; sections are always included.
- File names are stable across releases:
  - `filterpath-family-<family>-<lev|end>-<strictness>.filter`
  - `filterpath-<ascendancy>-<lev|end>-<strictness>.filter`
  - `filterpath-<skill>-<ascendancy>-<lev|end>-<strictness>.filter`
- URL: `#mode=family|ascendancy|meta&...`.
- Old cascade links and the 12 interim links resolve to the closest mode.

Data:

- All presets are YAML under `src/presets/`, compiled to JSON at build time and
  validated with a JSON Schema. The browser never parses YAML.
- `families.yaml`, `ascendancies.yaml` (with `defaultFamily`), and
  `leagues/<league>.yaml` snapshots.
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

### 2.10 Advanced rules

The preset is **locked and never cloned**. Users add rules on top of it.

- **My rules first** — custom rules are evaluated before every preset rule, so a
  copied preset rule overrides it until the copy is disabled or deleted.
- **Copy, not clone** — copy one preset rule or a whole section into My rules.
  The preset stays visible and untouched.
- **Rule editor** — action, classes, base types, rarity, item level range,
  sockets, links, quality, stack size, map tier, `Continue`, comment and style.
  Rules can be enabled, reordered by drag or buttons, duplicated and deleted.
- **Always-on alerts** — quest items always show with the default alert, even
  in From Scratch hide-all. Chaos, Exalted, Divine and Mirror use the built-in
  `ShChaos`/`ShExalted`/`ShDivine`/`ShMirror` voice lines.
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

### 2.11 Filter identity, filenames and folder writing

- **One identity** — the builder and the loot simulator show the exact filename
  being edited. The build name travels in the share hash, so the loot simulator
  never shows a stale filter.
- **Filename pattern** — `filterpath-<name>-<phase>-<strictness>.filter`. The
  version and preset hash live in the header. From Scratch collapses
  phase/strictness into `hide-all` or `show-all`.
- **Automatic name** — an empty name resolves from the selection: family id,
  ascendancy id, `<skill>-<ascendancy>`, or `custom`. A typed name is slugified
  and applies immediately.
- **Folder guidance** — the browser detects Windows, Linux/Proton or macOS and
  shows the matching folder first. The other platform stays behind a disclosure.
- **Custom folder** — a reference path field stores the location you paste; the
  native picker still grants access, and a temporary write proves read/write
  access. When the stored handle still has permission after a refresh, the
  read/write check runs automatically on load, so no manual "Test access" step
  is needed. Failures show a copyable `chmod u+w` hint on Linux or
  folder-permission steps on Windows. Browsers never expose the absolute path.
- **Download** — when a folder is connected, Download writes there first, asks
  before overwriting and falls back to a browser download.
- **Outdated notice** — on load, a stale connected filter is rewritten
  automatically when a verified snapshot proves it is the same build and the
  file is untouched; otherwise the panel reports it and Save rewrites it with
  the latest presets (keeping a `.bak`). See 2.5. Saved builds and imported
  codes with an older preset hash show a refresh notice.
- **Stale cleanup** — when the connected folder holds stale FilterPath filters,
  the sync panel offers a confirmed "Remove N outdated" action that deletes
  those files and their own `.bak` copies. Ownership means a `filterpath-` name
  and a FilterPath header in the leading comment block; the current file, newer
  or unrecognised versions, and a `.bak` FilterPath did not write are never
  touched, and neither are unrelated files.
- **Saved builds** — loading marks a build as active; its row gets `Update`,
  which overwrites name, selection and My rules. Top-level Save creates a copy.

---

## 3. Stack

- React 19 + Vite 8 + TypeScript 5.9, Tailwind 4
- Multi-page Vite build: builder (`index.html`) + static changelog
  (`changelog.html`) + loot simulator (`demo.html`) + behaviour audit
  (`tests.html`)
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
      data/matrix.ts     legacy twelve curated builds (old links + goldens)
      index.ts           registry
    rules/               custom rules, keys, templates, coverage, share codes
    filter/
      types.ts           rule model, styles
      presets.ts         leveling/endgame x strictness
      emit.ts            deterministic .filter serializer
      validate.ts        syntax validator
      version.ts         filter format version
      generate.ts        config -> filter text
      junk.ts            hides for irrelevant gear
      name.ts            file name and slug
      themes.ts          color themes
      classes.ts         RePoE item class -> filter Class
      rules/             gear, currency, gems, maps, uniques, league
      __golden__/        representative generated filters
    data/
      base-types.json    generated, committed
      known-base-types.json  every valid BaseType, generated
      known-classes.json     every valid Class, generated
      class-map.json         RePoE item class -> filter Class (reviewed)
      equipment-classes.json gear, flasks and jewels the slots resolve from (reviewed)
      base-types-extra.json  reviewed supplement for RePoE gaps
      base-types-removed.json  reviewed removals for dropped/renamed bases
      resolve.ts         slot spec -> base types
    preview/
      match.ts           first-match evaluation, Continue support
      samples.ts         reported leaks + representative drops
    audit/
      cases.ts           labelled drop catalog (one or more per category)
      report.ts          selection x case matrix + rule provenance
    demo/
      parse-item.ts      parses pasted in-game item text
    share/
      codec.ts           share-code encode and decode
  meta/                  accessors over the compiled presets
    ascendancies.ts      lookup and rank helpers
    families.ts          lookup helpers
    resolve.ts           selection -> BuildProfile
    types.ts             Family, Skill, Ascendancy, BuildSelection
    skill-names.json     gem-name catalog from RePoE
    skill-names-extra.json  reviewed supplement for translated gem names
  presets/               YAML sources
    families.yaml
    ascendancies.yaml
    ascendancies.expected.ts  reviewed ladder registry (id/name/class)
    economy-overrides.yaml
    leagues/             per-league skill snapshots
    schema/              JSON Schema for the YAML
  generated/             compiled presets + economy, committed
  sync/                  download | clipboard | fileSystem
    handles.ts           IndexedDB storage for directory handles
    fileSystem.ts        pick, list, read, write
    platform.ts          OS detection and folder hints
  ui/                    wizard, loot simulator, URL state
    Changelog.tsx        release history page
    TestsPage.tsx        behaviour audit page (tests.html)
    Wizard.tsx           builder shell
    demo/                loot simulator
    rules/               locked pane and rule editor
    presets/             saved-build storage
    save/                folder connect and save panel
  changelog.ts           release and commit data for the site
scripts/
  build-presets.mjs      YAML -> JSON + schema validation
  extract-repoe.mjs
  meta-add.mjs           manual league snapshot editor
  refresh-economy.mjs
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
    "currency": { "Divine Orb": 1, "Chaos Orb": 2 },
    "uniqueBase": { "Leather Belt": 1, "Heavy Belt": 1 }
  }
}
```

Unique prices arrive keyed by unique name, but filter rules need the **base
type**. The refresh script maps each unique to poe.ninja's `baseType` field and
tiers the base types; unique names remain UI labels only.

`src/presets/economy-overrides.yaml` maps a base type (or currency/card name)
to a forced tier and always wins over the fetched value.

---

## 5. Testing

- Unit: archetype validation, tag resolution against base data, tiering, emit
- Version: header pinned at `9.9.9`; stable file name asserted; preset hash parsed
- BaseType registry: every name in every generated filter must exist in
  `known-base-types.json`; unique item names are explicitly rejected
- Golden: full filter output per archetype/preset, diffed as text
- Syntax: a small parser that checks every block's conditions and actions
- Preview matcher: first-match-wins, `Continue`, and hidden gear
- Meta: schema, league/family filtering, profile resolution, compatibility adapter
- Presets: YAML compilation, JSON Schema validity, mode resolution, default
  loadouts, legacy links
- Preset audit: every family, ascendancy and meta build across all
  phase/strictness combinations is checked for unused-class, wrong-base and
  4-link gear leaks
- Custom rules: custom-first ordering, share-code compression, scratch base,
  templates
- Sync: mock directory handle; permission, backup, overwrite and no-delete paths
- Economy: refresh script run against fixture JSON, schema failure path tested
- Ascendancy registry: `ascendancies.yaml` matches the reviewed expected list
  (id/name/class); every `defaultFamily` is a real family; every
  `defenceTags`/`shieldTags`/`jewelTag` resolves to at least one base
- Behaviour audit: every selection x case matrix has an assertion, not just a
  fixture replay (see 5.1)
- CI runs `npm test` before every build

### 5.1 Behaviour audit

The `BaseType` and golden tests prove a filter *parses* and stays
byte-stable. They do not prove the preset *decides correctly* for every kind
of drop. The behaviour audit runs the real matcher (`evaluateRules`) over a
structured case catalog for **every** selection at every phase and strictness,
and turns the outcome into a report a human can read. It answers three
questions.

1. **Are the ascendancies correct?** The ladder list is hand-maintained and
   has no RePoE source. Mirror the `BaseType` pattern: a reviewed
   `src/presets/ascendancies.expected.ts` (id, name, class) is the source of
   truth, and a test asserts `ascendancies.yaml` matches it exactly. New or
   removed league ascendancies then fail the build until the expected list is
   reviewed, instead of silently shipping a wrong class or family.
2. **Do the predefined rules cover every kind of drop?** A
   `src/core/audit/cases.ts` catalog with one or more labelled cases per
   category: scrolls, orbs per tier, fragments, divination cards, maps across
   tiers, normal/magic/rare gear per class and slot base, flasks, gems
   (quality 0 and 20), jewels, uniques, quest items, plus the four reported
   leaks. Each case records the expected outcome per strictness, so the audit
   asserts intent rather than only replaying fixtures.
3. **Show or hide, and where does it come from?** The matrix becomes a report:
   rows are presets (`family:*`, `ascendancy:*`, `meta:*`), columns are cases.
   Each cell is shown/hidden **plus provenance** — the deciding rule's
   `section`, `id`, `comment` and its 1-based line range in the emitted
   `.filter`. "Shown by default (no rule matched)" is a distinct state from
   "shown by rule", so the visibility default can never mask a real decision.

Mechanism — one source of truth:

- `src/core/audit/report.ts` builds a serialisable report from `compileFilter`
  + `evaluateRules`. Framework-free, no network, deterministic order.
- The tests are the gate; the report is the data. `coverage-audit.test.ts`
  keeps its invariants, `src/core/audit/report.test.ts` asserts the catalog has
  an expected outcome for every case, and `src/core/audit/golden.test.ts` diffs
  the behaviour golden.
- `tests.html` (a fourth Vite entry, like `changelog.html`) renders the same
  report. Presets collapse by default; each cell names the rule and the
  emitted line, so a screenshot in a bug report points straight at the source.
  The page header carries the app version and preset hash, tying a report to
  one release.
- A **behaviour golden** (`__golden__/audit-summary`) pins the compact
  `selection -> case -> shown|hidden + rule id` summary, so an unintended rule
  reorder appears as a reviewable diff instead of a silent behaviour change.
  Regenerate it with `AUDIT_WRITE=1 npm test` once a diff is confirmed correct;
  the committed golden is what the suite diffs against.

Deployment: generate the report at build time and deploy it as part of the
Pages site. It is a view over `src/core`, so it stays offline
and always matches the deployed version, and a cell can be deep-linked from an
issue. The same generator also runs on PRs in `validate-meta.yml` and uploads
`tests.html` as an artifact, so a pre-merge report exists without a second
site. Only the behaviour golden is committed; the full report is not (too
noisy).

---

## 6. Conventions

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
- The behaviour audit page renders the same `src/core` report the tests assert;
  its data is never hand-written
- My rules are keyed by selection; presets always regenerate from the latest
  preset version
- Keep old share links working until 1.0
- Every archetype carries `verifiedFor`; bump it when checked against a league
- Disclaimer stays visible: *"This product isn't affiliated with or endorsed by
  Grinding Gear Games in any way."*

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Matrix goes stale each league | `verifiedFor` + changelog + checklist per league |
| Meta snapshot misses a new meta skill | `capturedAt`, family-only fallback, manual refresh each league |
| Manual meta edits drift or break the schema | `meta:add` CLI, schema test in CI, validation Action on PRs |
| League snapshots accumulate with old schemas | migration test and a schema version field per snapshot |
| Skill → class/ascendancy mapping is wrong | resolver tests; UI only offers allowed classes |
| Old share links break after the selection rewrite | compatibility adapter and a migration test |
| Share code grows too large | compress, cap the URL, fall back to file export |
| Custom rules shadow preset rules unexpectedly | custom-first notice, catch-all warning, per-rule copy |
| YAML preset and runtime data drift | compile at build time, commit generated JSON, schema test |
| `DEX item` means something different to the user | show the resolved base count and examples before applying |
| Rule order changes silently | explicit order in the editor, `Continue` tests, golden filters, behaviour golden |
| Ascendancy list drifts from the game | reviewed `ascendancies.expected.ts` + registry test, `verifiedFor` per league |
| Audit passes but a category is untested | cases catalog requires an expected outcome per category |
| `HasExplicitMod` breaks between patches | prefer tags/classes; review before use |
| Unknown `BaseType` aborts the whole filter | `known-base-types.json` + CI test + reviewed supplement/removal files |
| Filter placed in a folder the game does not scan | Install docs with the Proton path; folder picker |
| Online filters mistaken for local files | Docs call out `OnlineFilters/`; the site shows the exact in-game name |
| A different filter stays selected and looks like a leak | Verify section 2.8; matcher fixtures prove FilterPath's behaviour |
| poe.ninja schema drift | schema validation, keep-last-good, PR review |
| Actions schedule delayed or disabled after inactivity | `workflow_dispatch`; economy drift only affects tiering |
| Chromium-only folder sync | download fallback everywhere |
| Stored directory handle loses permission | explicit re-request flow, no silent writes |
| Flatpak browser cannot see the Proton prefix | manual download fallback, documented |
| Versioned files accumulate in the filters folder | sync flags stale versions and writes `.bak`; removal is a deliberate, confirmed user action over listed FilterPath files only |
| RePoE dataset changes | commit output, pin `REPOE_REF`, diff in review |
| GGG policy changes | static, non-commercial, disclaimer, no internal endpoints |

---

## 8. Open items

### Data capture (highest priority)

- Real poe.ninja builds capture is **blocked**: the builds API is closed. The
  Covens and Standard snapshots are `provenance: seed`, so the UI labels their
  weights and ascendancy splits as curated placeholders. The Covens seed now
  carries the current ascendancies and the named skills; replace the weights
  when a lawful capture source is available.

### Improvement roadmap

Reviewed by a three-model council (Claude Opus 5.5, GPT-6.2 Sol, Gemini 4
Neon), passed in round 3 (best scores 8, 8, 9). Each item is one Conventional
Commit; a behaviour change lands with its assertions and reviewed golden diff
in the same commit. Guiding rule: **sanitising never widens a rule** - a rule
that cannot be emitted safely is disabled with a notice, never written with a
condition removed or a name altered.

**Phase 0 - hotfix (done, 0.33.1 and 0.33.2).** CI on every PR with a
generated-data drift check; folder sync only touches files FilterPath wrote;
automatic folder writes paused; empty or all-unknown list conditions are
skipped instead of becoming catch-alls; custom rules validated fail-closed in
`compileFilter`; MinimapIcon/PlayEffect colours per GGG; loot simulator links
open Advanced rules and map the rule index correctly (`core/rules/focus.ts`).

**Phase 1 - exact matching and safe sync (0.34.0, code done; release waits on
the in-game smoke test).**

- Registries: reviewed `known-classes.json` (the game rejects unknown classes
  too) and an emit-safe name set; one all-selections test helper covering every
  skill x ascendancy pair and both scratch starts. **Done.**
- Parse-back test: emitted text, parsed by `validate.ts`, must equal
  `compiled.rules` field by field for all selections and hostile custom rules.
  **Done.**
- Emit `Class ==` / `BaseType ==`. Without `==` the game matches substrings:
  `Hide BaseType "Gold"` hides unique Gold Flask, Golden Mask and Gold Ring;
  card hides `"Hope"`, `"Hubris"`, `"Death"` hide Mortal Hope, Hubris Circlet,
  Death Bow; `"Ring"` gives every unique ring the S-tier alert. `HasExplicitMod
  "Veil"` stays a contains-match. Legacy partial classes expand to every
  containing registry class with a notice; registered terms narrow (`Daggers`
  no longer matches `Rune Daggers`) and are flagged. Bump
  `FILTER_FORMAT_VERSION`. **Done (format 2)**; the gate below is open.
- Structural `sanitizeRule` on decode and storage read: coerce, never throw,
  never drop a condition; bounded decompression; v1 codes keep working. **Done.**
- Re-enable automatic folder writes from a verified per-file snapshot
  (selection, the exact My rules written, text hash) stored next to the
  directory handle: current file only, header must round-trip, skipped in
  import sessions; ask before an import replaces existing My rules. **Done.**
- Preview parity: currency, gems and cards count as `Rarity Normal`; missing
  sockets/links/quality are 0 and stack size 1 (done). `Continue` keeps earlier
  style still needs the in-game check before it is modelled.

**Release gate for 0.34.0.** The exact-match syntax and format 2 are the first
change the game can reject outright, so the release waits on one in-game smoke
test: load a generated filter, confirm `Class == "Viscera"` and a
`BaseType ==` list behave, and check that a `Hide BaseType == "Gold"` rule no
longer hides Gold Flask, Golden Mask or Gold Ring.

**Phase 2 - base data source (0.35.0). Done.** `extract:repoe` now reads the
maintained `repoe-fork` export pinned to a commit of
`repoe-fork/repoe-fork.github.io` (export 3.30.0.4.3) instead of the frozen
`brather1ng/RePoE`, whose `REPOE_REF=3.27.0` 404s. Selection moved from RePoE
domains to the reviewed equipment classes, and the registry admits only item
classes the filter language knows, so placeholder classes stay out. All 18
previously missing economy names (Reliquary Keys, Valdo's Puzzle Box, Zorath's
Eyes) are in the registry; the golden diff is 64 newly admitted bases and no
removals; the behaviour summary did not change. Every economy tier name is now
asserted against the registry.

**Phase 3 - preset coverage (0.36.0). Done.**

- Show Empower/Enlighten/Enhance before the gem quality cutoff. **Done.**
- Show Large/Medium/Small Cluster Jewels at every rarity (hidden in every build
  today); abyss jewels per family (open question). **Done:** caster Hypnotic,
  minion Ghastly, melee Murderous, bow and hybrid Searching, at every rarity.
- Unique maps: early `Show Class == "Maps" Rarity Unique` with unique style;
  the theme honours `styleKind`. **Done**; the fragment repaint stays open.
- Levelling 4-links: highlight Normal/Magic, keep below-floor rares, keep the
  build's base targeting, exclude uniques. **Done.**
- Never hide 6-links: loud gear rule for non-uniques; unique 6-links after the
  top-tier unique Shows, before the low-tier Hide. **Done.**
- Economy overrides applied offline (`economy.json` stays raw, overrides
  compiled into `presets.json`, category membership checked) and reviewed
  floors for per-unit stackables, Stacked Deck and endgame fragments. **Done.**
- Leveling gems gate on `AreaLevel` if gems carry no `ItemLevel` (verify).
  **Not needed:** dropped gems carry an item level, so the gate stays on
  `ItemLevel`.
- Register the veiled category in the audit catalog. **Already done** with the
  0.32.0 veiled rules.

**Phase 4 - builder bugs (0.37.0). Done.** Typing spaces/commas in rule
conditions (draft list fields); Item test in emitted order
(`core/rules/order.ts`); From Scratch message reads its own base rule; veiled
rules excluded from overlap warnings and mod rules compare by containment;
`hasExplicitMod` counts as a condition in the editor helpers; `coverage.ts`
maps base types to plural filter classes; themes keep colours a custom rule sets
itself; a warnings badge shows while the generated filter is collapsed; the name
field commits on blur instead of regenerating per keystroke; storage failures
are reported and a render error shows a boundary instead of a blank page;
folder listings read only the header; magic items and thousands separators
parse; audit deep links decode.

**Phase 5 - data pipeline and CI (0.38.0). Done.** The economy refresh identifies
itself with the package version, uses a 15 s timeout with two retries, and
caches the ETag and last body per endpoint in `.cache/economy`, persisted by
`actions/cache`. Responses are validated before anything is computed, so a bad
payload leaves the committed snapshot (the last good one) untouched. Tier keys
are sorted and the file is only written when a tier moved, so a quiet day
produces no diff. Results go to one rolling PR (`chore/economy`) that is
force-updated instead of spawning a daily PR. `meta:add` keeps fields it is not
told to change, the audit artifact uploads the whole build so it runs, and a
test holds `CHANGELOG.md` and `src/changelog.ts` together from 0.20.0 on. Since
the compiled preset hash includes the economy snapshot, an economy-only deploy
flags every connected filter as preset-stale, which is what the sync panel
already reports.

**Phase 6 - polish.** Compress `demo-ground.png` (2 MB, also on the builder);
`tests.html` noindex; labels on unlabeled inputs; a test that `src/core` never
imports React; docs drift (README status, "no simulator", "Four modes",
removed reference path field, `ui/download.ts`, `core/share`, four Vite
entries, annotated tags).

**Backlog.** Full accessibility pass, simulator list view for mobile, split
`Wizard.tsx` and `AdvancedRules.tsx`, start-screen import, live My rules sync to
the simulator, strictness diff, build export file, GemLevel/transfigured
fields, PWA. **Cut:** a separate share link (single build code since 0.27),
base-type `<datalist>`, style-editor and rule-model expansion (drifts toward a
general editor), "create rule from item" in Item test (the simulator has it).

### Product decisions

- `standard.yaml` is a seed duplicate of the Covens seed; decide whether to keep
  it as a fallback or drop it.
- The `defaultFamily` assigned to each of the three new ascendancies (Warden →
  bow, Luminary and Reliquarian → caster) is a first guess; revisit it against
  the league.
- Behaviour audit: the Scion ladder currently has three entries (Ascendant,
  Luminary, Reliquarian); confirm this is intended for the target league and
  pin it in `ascendancies.expected.ts`.
- Use `==` for every `Class` and `BaseType` (recommended: yes).
- Move base data to the maintained RePoE fork pinned by SHA (recommended: yes,
  as its own release).
- Names that are not plain ASCII (`Maelström Staff`): drop from emission,
  never transliterate (recommended: yes).
- Levelling hides every white and every mana flask for every build: intended?
- After a release every other build's file counts as outdated and can be
  bulk-removed: keep, with the file list in the confirmation (recommended).
- Abyss jewels per family: caster Hypnotic Eye, minion Ghastly Eye, melee
  Murderous Eye, bow Searching Eye (recommended).

### Manual validation

- Verify the Windows filter path (`Documents/My Games/Path of Exile`) in the
  installed build, not just Proton.
- Run directory sync in Chromium: pick, remember, permission re-request,
  overwrite confirmation, `.bak` and stale badges, the outdated-file notice and
  Save, and "Remove N outdated" with a foreign filter and a foreign `.bak` in
  the folder (both must stay).
- Import a build code holding a malformed or unknown-base rule: the editor
  names it and the filter leaves it out.
- In-game levelling necromancer run: turn any mismatch into a matcher fixture
  and a labelled audit case.
- Check loot simulator Ctrl+V capture, hover tooltip, Randomize and mobile.
- Copy a build code, reload, and Import code it back on the same and a different selection.
- Save a build with custom rules; confirm presets regenerate while My rules persist.
- Confirm the unsaved-changes prompt on refresh after editing.
- Dispatch the economy workflow once manually to confirm it opens a PR.

### Links

- Builder: https://lordgreg.github.io/filterpath/
- Loot simulator: https://lordgreg.github.io/filterpath/demo.html
- Changelog: https://lordgreg.github.io/filterpath/changelog.html
