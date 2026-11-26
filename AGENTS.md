# AGENTS.md

Onboarding for agents working in this repository. Read this first, then
[PLAN.md](./PLAN.md) for the design rationale and constraints, and
[CHANGELOG.md](./CHANGELOG.md) for release history.

## What this is

BuildPath builds **build-specific Path of Exile 1 loot filters in three
clicks**. The user picks an archetype (family, ascendancy or meta build), a
phase and a strictness, and downloads a valid `.filter`.

- Generated entirely client-side; no account, no network calls at runtime.
- Static site on GitHub Pages at project path `/buildpath/`.
- Positioning, non-goals and the "why" behind every constraint live in
  [PLAN.md](./PLAN.md). Do not re-litigate recorded decisions.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173/buildpath/
npm test           # runs presets:build, then vitest
npm run build      # presets:build + tsc -b + vite build
npm run typecheck  # tsc -b
```

Data scripts (only needed when touching generated data):

```bash
npm run presets:build    # YAML -> src/generated/presets.json, schema-validated
npm run extract:repoe    # refresh base data and registries from the RePoE export
REPOE_REF=<commit> npm run extract:repoe   # override the pinned export commit
npm run economy:refresh  # poe.ninja economy tiers
npm run meta:add         # append/edit a league snapshot skill (manual capture)
```

Build pipeline (needs a pinned PoB checkout at `.cache/pob/src` and LuaJIT +
`lua-utf8`; never part of `npm test`):

```bash
npm run builds:build      # validate src/builds/*.yaml -> src/generated/builds/
npm run builds:calibrate  # must-pass + must-fail gates, committed report
npm run builds:verify     # PoB gates per checkpoint + the published PoB code
npm run builds:publish-pobs # release only: create pobb.in pastes and link map
npm run builds:check      # every published code loads in PoB with the same counts
```

`validate-builds.yml` runs the offline chain in CI; `builds:build` is also chained into
`npm test` and `npm run build`, so committed build JSON can never go stale.

`npm test` and `npm run build` both run `presets:build` first, so the compiled
presets are always fresh before tests or a build.

## Architecture

```
src/core/      framework-free (no React imports) — the domain
  archetypes/  types, validator, curated matrix
  filter/      rule model, presets, emit, validator, generator, golden filters
  preview/     first-match rule matcher and sample items
  data/        base types (generated), economy, overrides
  rules/       custom rules, keys, templates, share codes
src/ui/        wizard, changelog, URL state, preview, rule editor
src/sync/      download, clipboard, File System Access (folder writing)
src/meta/      accessors over the generated presets
src/presets/   YAML sources (families, ascendancies, leagues) + JSON schemas
src/generated/ compiled JSON presets, economy — committed
scripts/       YAML compiler and data extractors
```

- Multi-page Vite build: `index.html` (builder), `changelog.html` (static
  release page), `demo.html` (loot simulator).
- No router: wizard state lives in the URL hash, which gives shareable links.
- YAML is the editable preset source; the browser only ever imports the
  compiled JSON. YAML is validated with JSON Schema (Ajv) at build time.

## Hard conventions (do not break)

- `src/core` must **not** import React.
- Emit output is deterministic: stable section/rule order, LF line endings.
- Filters are **ASCII-only** (asserted in tests).
- **Never** put a unique item name in a `BaseType` condition — the game rejects
  the entire filter. Reference the base type instead.
- No network, no secrets, no analytics in the browser.
- Presets are YAML; compiled JSON is committed and schema-validated.
- "My rules" are keyed by selection; presets always regenerate from the latest
  preset version.
- Keep old share links working until 1.0.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`,
  `test:`). Never bundle unrelated changes.

## Constraints worth knowing before you change behaviour

- **OAuth is frozen**, so sync means the filesystem (File System Access API),
  not an account upload. See PLAN.md §2.2.
- **poe.ninja economy only** — the builds API is closed to third parties. Meta
  snapshots are captured by hand with `meta:add`; never scrape the builds API.
- The **`BaseType` registry is the safety net**: every name in every generated
  filter must exist in `src/core/data/known-base-types.json`. A typo must fail
  the build, not the user's filter. RePoE gaps are added to the reviewed
  `base-types-extra.json`; bases RePoE still lists but the live game has
  dropped or renamed are removed via the reviewed `base-types-removed.json`.
  Adding or removing a name is checked against the game's own item data, since
  one unknown name makes the client refuse the entire filter.
- Generated data (`base-types.json`, `known-base-types.json`,
  `src/generated/*.json`) is committed so builds never depend on the network.

## Testing

- Unit tests sit next to the code as `*.test.ts`; run with `npm test`.
- Golden filters pin version `dev`; a separate test pins `9.9.9` to cover the
  header and the stable file name.
- Preset audit tests check every family, ascendancy and meta build across all
  phase/strictness combinations for unused-class, wrong-base and 4-link leaks.
- Behaviour audit (`src/core/audit/`): a labelled drop catalog is run through
  the real matcher for every build; `report.test.ts` asserts the recorded
  outcomes, `golden.test.ts` pins the compact summary. The same report renders
  `tests.html`. Regenerate the golden with `AUDIT_WRITE=1 npm test`.
- Ascendancy registry (`ascendancies.expected.ts`) pins the ladder list; the
  YAML must match it exactly.
- CI runs `npm test` before every deploy (`.github/workflows/deploy.yml`).

## Release workflow

1. Bump `package.json` version.
2. Add the release to **both** `src/changelog.ts` and `CHANGELOG.md`.
3. Run `builds:calibrate`, `builds:verify` and then `builds:publish-pobs`
   (network: it creates a public pobb.in paste per build). Commit the updated
   `builds/pob-links.json`; the test fails if a link's code hash is stale.
4. Commit, tag `v<version>`, then push the commit **and the tag**
   (`git push origin master --follow-tags`). An unpushed tag is invisible to
   GitHub.
5. The release workflow (`.github/workflows/release.yml`) creates the GitHub
   Release from the matching `CHANGELOG.md` section when the tag is pushed.
6. The deploy workflow runs `npm test` + `npm run build` and publishes to Pages.

Related workflows:

- `economy.yml` — daily cron refreshes tiers, regenerates the golden filters
  when tiers move, and opens a PR if anything changed.
- `validate-meta.yml` — runs `npm test` on PRs touching presets/meta.
- `meta-reminder.yml` — monthly issue to remind about a snapshot refresh.

## Where to look

| Task | Start here |
|---|---|
| Change a preset / family / ascendancy | `src/presets/*.yaml` |
| Budget gear / archetype gear profiles | `src/builds/gear/` (`budgets.yaml`, `profiles.yaml`, `affixes.yaml`, `eldritch.yaml`) |
| Gate thresholds, checkpoints, leveling budgets | `scripts/builds/gates.yaml`, `src/builds/config/checkpoints.yaml` |
| Pantheon and bandit data | `src/builds/config/pantheon.yaml` |
| Build header art and one-click PoB assets | `public/builds/` |
| Change filter output | `src/core/filter/` (esp. `generate.ts`, `emit.ts`) |
| Custom rules, templates, share codes | `src/core/rules/` |
| Rule matching / preview | `src/core/preview/match.ts` |
| Behaviour audit page / report | `src/core/audit/`, `src/ui/TestsPage.tsx` |
| Base types / economy data | `src/core/data/`, `src/generated/` |
| Wizard / UI / URL state / shared header | `src/ui/` (`SiteHeader.tsx`, `InventoryPanel.tsx`, `TreeThumbnail.tsx`) |
| Folder writing / download | `src/sync/` |
| Add a league snapshot | `npm run meta:add`, `src/presets/leagues/` |

## Legal

This product isn't affiliated with or endorsed by Grinding Gear Games in any
way. Base item data from RePoE; economy data, when shown, from poe.ninja. The
disclaimer stays visible in the UI.
