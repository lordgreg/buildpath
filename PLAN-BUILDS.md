# BuildPath — Plan

> Revision 12. See §16 for the council reviews and what each round changed.

Verified build guides, with the loot filter as one output instead of the whole
product.

BuildPath inherits a static, account-free site can generate a correct,
build-specific `.filter`. This plan turns the same engine inside out: a **build**
becomes the primary object, and the guide, the PoB code and the filter are all
renderings of it.

Read [PLAN.md](./PLAN.md) first for the constraints that shaped the filter
engine (BaseType namespace, no OAuth, static hosting, deterministic emit).
Nothing here re-litigates those. This document records what is new, what is
deliberately re-opened, and why.

---

## 1. The problem

Finding a build means hunting across a dozen sites, each with a different
league, patch and gear assumption, and none of them telling you whether the
numbers are real or vibes. Filters are the same problem one layer down —
FilterBlade needs a character import; everyone else guesses from family tags.

## 2. The thesis

> Do not ask a model to invent a build. Read the league, prove the build, and
> let the model write the sentences.

Three sources of truth, each doing only what it is good at:

| Source | Answers | Trust |
|---|---|---|
| Game data (PoB `TreeData`/`Gems`, RePoE), diffed per PoB tag | What changed, what is legal | Machine, exact |
| Hand-curated seeds (`src/builds/*.yaml`), informed by reading public build pages by hand | Which build is worth proving, and its leveling/skill intent | Editorial, gated by the oracle |
| PoB headless (Lua calc engine in CI) | Does *this* build hit the numbers | Oracle, reproducible |
| A model | Why, when to respec, what to press | Draft only, human-signed prose |

Corollaries, each of which is a test in this repo's style:

- **Every number on a page is machine-derived.** Prose states numbers only
  through placeholders resolved from the build JSON (§12.2).
- **Every published build is a PoB code that loads clean**, generated from the
  build JSON, round-tripped through PoB's parser in CI.
- **"Best" is replaced by "passes the published gates"**, with the gate report
  visible on the page.
- **SSF is the gate, not a badge.** Trade only changes ordering and upgrade
  paths.

## 3. Competitive position

Checked while picking a name; all three do part of this already.

- **Exile to Exile** — phased guide + in-game filter from official game files
  (PoE2 only today). Closest feature overlap.
- **PoB Redux** — desktop app on PoB's engine with a build optimiser, an AI
  assistant and an MCP server. That is our Phase 3, shipped by someone else.
- **Exile Helper** — PoB's engine server-side, PoB code import/export.

What none of them do: reproducibility and evidence as the product (pinned
patch, gate report, committed build JSON), and no account, no backend, no
runtime network. The differentiator is **"every number is
machine-derived and reproducible"**, not "AI writes guides". The README must
say that, not the reverse.

## 4. Decisions

| # | Decision |
|---|---|
| D1 | Breadth tier: per-ascendancy pages only where a gate-passing build exists. No popularity claims anywhere, because there is no population data (S2–S5). |
| D2 | "Best possible" = passes published gates, PoB code attached. No subjective verdict. |
| D3 | Machine gates publish; humans review prose only. |
| D4 | Spike the public ladder API and re-open PLAN.md §2.3 with evidence. **Closed:** the spike ran (S2–S5) and the recorded decision stands — no ladder ingest of any kind. |
| D5 | No session cookies, ever. Triggered in P0: character trees answer `Forbidden`, so there is no ladder ingest. |
| D6 | PoB pinned as a **CI-only** oracle (Lua). Never in the browser, never a runtime dependency. |
| D7 | Patch facts come from PoB `TreeData`/`Gems` diffs between tags, not from prose changelogs. |
| D8 | SSF is the pass/fail gate for every flagship; trade is a badge on upgrade paths. |
| D9 | Pantheon: one recommended default plus a one-line situational note. |
| D10 | Filter phases stay `leveling \| endgame` × `soft \| strict \| uber`. A true third phase is backlog. |
| D11 | Rename to **BuildPath**. Repo and directory already renamed; the code-side rename is two queued commits. |
| D12 | Nightly **verification** refresh (patch facts + gates, no fetching from pathofexile.com); publisher enforces a 72h age gate per league; weekly re-verification. |
| D13 | Site: rebrand in place at the existing Pages deploy. No second repo until 1.0, then revisit `src/core` extraction. |
| D14 | Build data: reviewed YAML seeds (`src/builds/`) + pipeline output committed as JSON. |
| D15 | Filter gains `mode=build`; a build's `SlotSpec`s override family/ascendancy. Reuses the existing resolve/emit path. |
| D16 | Leveling gems: reviewed YAML, model-drafted, human-signed. Leveling tree: derived, never invented. No per-act quest-reward table in v1. |
| D17 | Pantheon and bandit data: hand-maintained reviewed YAML. No scraping of poedb. |
| D18 | poe.ninja snapshots stay as the fallback source; `meta:add` stays. |
| D19 | PoB delivery: a PoB **code** plus a copy button and a link to pob.cool/poe1. No `.xml` download. |
| D20 | Gate thresholds live in one YAML the maintainer can tune; calibration run guards against wrong gates in both directions. |
| D21 | Filter output is deterministic **for a fixed preset hash**, not byte-stable across economy deploys — the economy snapshot is part of the preset hash by design. See §7.6. |
| D22 | `verifiedAt` and gate files are rewritten only when a value moves (no daily churn), through a rolling PR. |
| D23 | Gear at each checkpoint is **synthesised** from a reviewed budget file plus per-build overrides, never hand-written per build. Unknown mod ids fail the build (§7.7). |
| D24 | The published PoB code is the `maps-red` gear set, and the page says so. One code, one named checkpoint. |
| D25 | `factsHash` covers a **declared** input list per guide section, not every resolvable path. |
| D26 | One build per (main skill, ascendancy). A second seed for a pair is rejected, never published as a near-duplicate under a suffixed id. |
| D27 | The game patch identity comes from the PoB tag. While PoB has no tag for the live patch, nothing is verified and the site says **"waiting for PoB"** rather than verifying against last patch's data. |
| D31 | **No pathofexile.com API calls, ever** — not in CI, not in the browser, not once. Build content is hand-curated; the oracle is PoB; the only network calls in the repo remain the existing RePoE export and poe.ninja economy refresh. |
| D28 | Prose is drafted at most twice, then either signed or published as `auto-retry`; breadth pages are `auto-breadth`. A build publishes when its `summary` is `signed` or `auto-breadth`. Every section records its sign-off. |
| D29 | Ascendancy points are explicit per lab: `ascendancyOrder` entries carry `{ node, lab }`, and each checkpoint assumes the labs reachable by that act. |
| D30 | Leveling point budgets are a reviewed per-patch YAML, never derived from quest count at runtime. |

## 5. Requirements

Hard rules — a PR that violates one of these is rejected, same as the existing
"hard conventions" in AGENTS.md.

- **R1** Prose may only state numbers through `{{placeholder}}` tokens that
  resolve from the build JSON (§12.2). Unresolved placeholder or a raw numeral
  outside the allowlist fails the build.
- **R2** No published build without a gate report for every checkpoint, each
  evaluated against that checkpoint's own gear set.
- **R3** No published build without a PoB code that round-trips through PoB.
- **R4** No build is published in the first 72h of a league. The previous
  league's builds stay visible, stamped "previous patch, unverified". Hand-made
  builds are no exception: the tree may have moved.
- **R5** `src/core/**` stays React-free; the gate report, id derivation and tree
  derivation are framework-free and deterministic.
- **R6** No network in the browser. Build pages read committed JSON only.
- **R7** No cookies or session secrets from any account other than the
  maintainer's own, and none at all if the spike shows trees need one.
- **R8** Every name a filter or a build emits passes the existing registries:
  `known-base-types.json`, `known-classes.json`, `src/meta/skill-names.json`,
  `ascendancies.expected.ts`. Unique item names never reach a `BaseType`.
- **R9** Filters stay ASCII-only, deterministic, LF. Unchanged.
- **R10** A stale build is delisted, not silently kept. Staleness = patch hash
  moved and the build was not re-verified.
- **R11** No request to `pathofexile.com` or `api.pathofexile.com` from this
  project, in any form, at build time or run time (D31).
- **R12** A repaired build never passes itself off as the seed it started from:
  the seed and the repaired tree are both shown, and repair beyond its bound
  rejects the build (§7.5).

## 6. Non-goals

- PoE 2 (unchanged from PLAN.md).
- A build planner or an in-browser PoB. We link out.
- Editing a published build by hand on the site. Builds are data; changes are a
  PR.
- A second filter phase axis.
- Optimising the whole tree (global optimum). Seed-plus-bounded-repair only.
- Per-act quest-reward gem availability data.
- Mirroring poe.ninja pages or competing with them on profile browsing.

## 7. Architecture

### 7.1 The `Build` object

```jsonc
{
  "schemaVersion": 2,
  "id": "lightning-arrow-deadeye",
  "patch": "3.29.0",
  "pob": { "ref": "2.51.0", "luaJIT": "2.1", "code": "eNq…" },
  "verifiedAt": "2026-12-01T00:00:00Z",
  "provenance": {
    "source": "seed", "league": "covens",
    "seedHash": "…",
    "tags": { "depth": "softcore", "ssf": true }
  },
  "class": "Ranger",
  "ascendancy": "Deadeye",
  "ascendancyOrder": [ { "node": "gathering-winds", "lab": 1 }, { "node": "…", "lab": 2 } ],
  "mainSkill": "Lightning Arrow",

  "leveling": {
    "brackets": [
      { "until": 12,  "skills": ["…"] },
      { "until": 28,  "skills": ["…"] },
      { "until": 68,  "skills": ["…"] }
    ]
  },
  "bandit": "kill-all",
  "pantheon": { "major": "lunaris", "minor": "gruthkul", "note": "…" },

  "tree": {
    "endgame": [12345, 67890],
    "checkpoints": {
      "act5": [], "act10": [], "maps-early": [], "maps-red": [], "pinnacle": []
    },
    "respec": [ { "atStep": "act10", "taken": [], "dropped": [] } ]
  },
  "gearSets": {
    "act5":       { "budget": "leveling",   "items": [], "gemLevels": { "main": 5 } },
    "act10":      { "budget": "ssf-start",  "items": [], "gemLevels": { "main": 18 } },
    "maps-early": { "budget": "ssf-start",  "items": [], "gemLevels": { "main": 20 } },
    "maps-red":   { "budget": "ssf-week1",  "items": [], "gemLevels": { "main": 20, "supports": 20 } },
    "pinnacle":   { "budget": "trade",      "items": [], "gemLevels": { "main": 20, "supports": 20 } }
  },
  "links": {
    "leveling": [ { "gem": "Lightning Arrow", "supports": ["…"] } ],
    "mapping": [ … ], "bossing": [ … ]
  },
  "uniques": {
    "core": [ {
      "displayName": "Hyrri's Ire",
      "slot": "body",
      "baseType": "Zodiac Leather",
      "ablationDrop": 0.34, "ssfSource": "divination card / …"
    } ],
    "optional": [ … ]
  },
  "config": { "flasks": "declared-uptime", "enabledKeys": ["…"] },
  "gates": {
    "act5": { "pass": true, "dps": 1200, "ehp": 900, "maxHit": 1800, "mana": "ok" }
    // all five checkpoint keys are required; the rest are rendered the same way
  },
  "repair": { "added": [], "removed": [], "evals": 812, "nodeDelta": 8, "status": "within-bound" },
  "guide": {
    "summary":  { "text": "…", "status": "signed", "signed": { "by": "…", "at": "…" },
                  "facts": ["gates.pinnacle.dps", "uniques.core"], "factsHash": "…" },
    "leveling": { "text": "…", "status": "auto-retry", "signed": null, "facts": [], "factsHash": "…" },
    "maps":     { … },
    "bossing":  { … }
  },
  "filter": { "slots": { … }, "phases": ["leveling", "endgame"] }
}
```

Rules:

- **Checkpoints** are a closed enum defined by `src/builds/config/checkpoints.yaml`
  (shipped: `until-12 | until-28 | until-68 | maps-early | maps-red |
  pinnacle`). A checkpoint is a level bracket — level, passive points, labs,
  gear budget and gem cap — so one key drives the gate report, the tree, the
  gems and the gear. Earlier revisions split "gate checkpoints" from "guide
  steps"; P1 shipped one enum, and the page uses the same key as its step. The
  five-key `act5 | act10 | …` set never shipped (§16, revision 11).
- `tree.checkpoints[cp]` is a **subset** of `tree.endgame`, asserted by test
  with valid topological order.
- `gearSets` is keyed by the same checkpoint enum and names one `budget`; the
  items are synthesised from `src/builds/gear/<budget>.yaml` (§7.7), so five
  hand-written item sets per build are never needed.
- `uniques[].displayName` may be a unique item name; `uniques[].baseType` is the
  base the filter highlights, and it must be the base `filter.slots[slot]`
  resolves to — asserted by test, so there is exactly one source of truth for
  what the filter shows (R8).
- `config` is what PoB was evaluated with. `enabledKeys` must be a subset of the
  whitelist in `gates.yaml`; a test enforces it, so the XML PoB tested is the
  XML the user imports.
- `filter.slots` uses the existing `SlotSpec` shape, so the filter derives from
  the build the same way it derives from an ascendancy today.
- `gates` requires **all five** checkpoint keys and every one `pass: true`;
  anything else leaves the build unpublished (R2).
- `gearSets[cp].items` is produced by the synthesiser (§7.7). A build YAML only
  carries overrides — the slot whose base the build actually needs.
- `pob.code` is the XML of the `maps-red` gear set (D24), so the code a reader
  imports matches the checkpoint the page calls "what we tested".
- `id` is unique across the catalogue: exactly one build per (main skill,
  ascendancy). A second seed for the same pair is rejected, never published as a
  near-duplicate under a suffixed id (D26).
- `ascendancyOrder` entries carry the lab that grants them. The `act5` checkpoint
  assumes lab 1 (2 points), `act10` assumes labs 1–2 (4 points), so a gate never
  evaluates a tree with ascendancy points the player cannot have (D29).
- `patch` is the game version of the PoB tag we verified against. With no PoB
  tag for the live league, every build is delisted and the site says **"waiting
  for PoB"** (D27) — verifying against last patch's data would be a silent lie.
- `guide` is **per section** (`summary | leveling | maps | bossing`), each with
  its own `status` (`signed | auto-breadth | auto-retry`), `signed`, declared
  `facts` and `factsHash`. Publication requires `guide.summary.status ∈
  { signed, auto-breadth }`; `auto-breadth` is only valid for a non-flagship
  breadth page, and every other section may be `auto-retry` (D1, D28). The build
  YAML is the authoring home; the JSON carries the resolved values.
- `guide.*.text` is the only model-written field. `factsHash` pins the declared
  facts it was written against; a fact change invalidates that section only.

### 7.2 Pipeline

```
PoB tag diff ──► patch facts (gems, tree, mods)   → src/generated/patch-facts.json
hand-curated seeds (src/builds/*.yaml) — editorial input, reviewed by PR
                                   │
                                   ▼
                    seed ─► PoB oracle ─► verify ─► repair ─► gates
                                   │
                                   ▼
              src/generated/builds/index.json + builds/<id>.json (committed)
                                   │
                 model prose (placeholders) ─► guide.* with factsHash
                                   ▼
                     builds.html / build.html  +  buildpath-<build>-*.filter
```

| Script | Job |
|---|---|
| `scripts/builds/patch-facts.mjs` | Diff PoB `TreeData`/`Gems` between two pinned tags; write the fact set. |
| `scripts/builds/verify.mjs` | Seed → per-checkpoint PoB evaluation, gate evaluation, leave-one-out ablation. |
| `scripts/builds/repair.mjs` | Bounded deterministic hill-climb (§7.5). |
| `scripts/builds/derive-leveling.mjs` | Reverse-topological pruning of `endgame` to the reviewed point budget per step (`src/builds/leveling-points.yaml`, D30). |
| `scripts/builds/synthesize-gear.mjs` | Budget constraints → concrete items, each line validated by effect (§7.7). |
| `scripts/builds/write-guide.mjs` | Facts → prose with placeholders; then the claim checks run. |

`builds:refresh` chains them for the nightly workflow; each is runnable alone so
a failure has a name. Nothing in the chain touches the network except the pinned
PoB clone (D31). Patch facts are consumed by three things: the gate
evaluator (tree/gem validity), the registry checks (R8), and prose facts. They
also drive delisting (R10).

`builds/index.json` is the only file `builds.html` loads: `id`, name,
ascendancy, main skill, patch, status, `verifiedAt`, tags — about
1 KB per build, capped at 40 published builds. When more than 40 are admissible
the kept set is deterministic: flagships first, then descending gate margin
(`min over checkpoints of measured/threshold`), then id ascending.
`builds/<id>.json` carries the rest and is fetched only on the detail page.

**Patch facts** — `src/generated/patch-facts.json` records the PoB ref, the game
version and content hashes of `TreeData` and `Gems`. Every build stores that
hash, so "verified against a fact set that has since moved" is detectable
offline, without a network call (R10).

**Prose loop** — `write-guide.mjs` drafts a section from its declared facts, runs
the §12.2 checks, and on failure retries once with the failure text appended. A
second failure sets `guide.<section>.status: auto-retry`, still placeholder-resolved
and still checked. Publication requires `guide.summary.status ∈
{ signed, auto-breadth }`, the latter only on a non-flagship breadth page; every
other section may be `auto-retry` (D1, D28).

### 7.3 PoB oracle

- Pinned to a PoB release tag (`POB_REF`) and a pinned runner image; cloned into
  `.cache/pob`, run with LuaJIT 5.1. Never bundled, never shipped, never
  referenced from `src/`. S1 (§15) gives the working recipe: PoB's
  `runtime/lua` on `LUA_PATH`, `lua-utf8` on `LUA_CPATH`, one warm process, XML
  reload per evaluation. A tag is only acceptable once
  `Classes/CompareBuySimilar.lua` parses under stock LuaJIT — `v2.69.0` does
  not, and a bump must re-check it. The three-line fix is committed as
  `scripts/builds/pob/luajit-compat.patch` and applied by
  `validate-builds.yml`; `lua-utf8` is built there with luarocks, since Ubuntu
  ships no package for it.
- Loads a generated XML, reads `CombinedDPS`, `TotalEHP`,
  `PhysicalMaximumHitTaken`, `Life`, `EnergyShield`, resistances, mana cost and
  unreserved mana.
- The same XML serialiser produces the PoB code for the published page (D19), so
  "what we tested" and "what you import" are the same bytes by construction.
- **Spike criteria (P0), replacing the old latency rule:** (a) pinned PoB loads
  headless at all; (b) two runs produce bit-identical numbers; (c) the *total*
  budget holds — 8 builds × 5 checkpoints × ~200 repair evaluations, target
  under 30 minutes on the CI runner. Latency per single build is irrelevant.
- **Cancel criterion:** if (a) or (b) fails, this plan is rebuilt around a
  pure-TS approximation and "passes gates" becomes "passes our best guess".
  Stop and re-plan.
- **If only (c) fails** — the likely outcome — the fallbacks are, in order:
  keep one long-lived Lua process and reload the XML per evaluation; restrict
  repair to the failing checkpoint only; raise the budget and record the reason
  and the measured rate in §15. Failure of (c) never cancels the feature, it
  changes how much repair search is affordable.

### 7.4 Why there is no ladder ingest

Decided in P0 and meant to stop the question being re-opened. Evidence in §15.

- Character trees answer `{"error":{"code":6,"message":"Forbidden"}}` without a
  session. A session means cookies, which D5 forbids outright — and only ~62% of
  ladder entries are even public.
- What remains reachable is the ladder *list*: rank, level, ascendancy name and
  account. No skills, no tree, no gear. It cannot produce or verify a build.
- The list sits on the official host with published rate-limit headers, but the
  Developer Docs sanction only resources in the API Reference or Data Exports,
  and `/ladders` is in neither. A site whose pitch is "nothing to hide" should
  not carry a standing gray area for a popularity widget.
- So: no ladder calls at all (D31). Build content is hand-curated seeds plus the
  PoB oracle; breadth is gate-only pages with **no popularity claim**. PLAN.md
  §2.3's original conclusion — curated matrix plus lawful data sources — stands,
  now with measurements behind it.

### 7.5 Determinism, identity and repair

Everything below is asserted by tests, because "same input, different site" is
the failure mode that erodes trust in a catalogue.

**Build id** — `slug(mainSkill)` + `-` + `slug(ascendancy)`, e.g.
`lightning-arrow-deadeye`. Stable across runs, leagues and renames, so a
published `build.html#build=…` link keeps working until 1.0.

**Main skill** — declared in the seed YAML, and validated against
`src/meta/skill-names.json` so a typo cannot become a build. One build per
(main skill, ascendancy) (D26).

**Seeds** — `src/builds/<id>.yaml` is the editorial input: main skill,
ascendancy, intended links and gear budget per checkpoint, leveling brackets and
prose. It is reviewed by PR like any preset. The pipeline never invents a seed;
it proves, repairs within bounds, and either passes or rejects it.


**Repair** — bounded and deterministic: seeded RNG, candidate order from
`TreeData` id asc; allowed moves are a single node swap, a single support swap,
and a change of candidate base within the same budget line (never a
hand-written item — D23). Every move is recorded in `repair.added/removed`.
Candidate destinations are **unallocated nodes only**. Bound:
`nodeDelta ≤ 10` and `≤ 8%` of allocated points. Status `within-bound` publishes;
`exceeded` rejects the build (R12). The page always shows seed vs repaired, so
a reader can see what the optimiser changed.

Stop rule: repair halts at the first evaluation where every checkpoint passes,
or at 200 evaluations per checkpoint, whichever comes first. `repair.evals`
counts actual PoB evaluations, so the S1 budget (8 builds × 5 checkpoints × 200)
is the worst case and the recorded number explains any run that hit it.

**Commit discipline** — `verifiedAt` and gate values are written only when a
value moves (D22), through a rolling PR, exactly like `chore/economy`.

**Leveling checkpoints** — derived by reverse-topological pruning of `endgame`
(drop a node once nothing depends on it) until the allocated count equals the
budget in `src/builds/leveling-points.yaml` for that step. The budget is a
human-reviewed per-patch table (D30); deriving it from quest counts at runtime is
what breaks on every league.

### 7.6 Filter determinism

Filters are deterministic **for a fixed preset hash**. They are *not*
byte-stable across days: `presets.json` embeds the economy snapshot, so an
economy tier move changes the hash and the filter (PLAN.md Phase 5). That is the
desired behaviour and the existing sync panel already reports it. P1 acceptance
therefore asserts (a) identical output for a fixed hash, and (b) the build page
displays the hash and header line so a stale file is identifiable.

### 7.7 Gear synthesis

Gates are only as honest as the items PoB evaluates them against, and
hand-writing five item sets per build does not scale to 19 ascendancies.

- `src/builds/gear/<budget>.yaml` (`leveling`, `ssf-start`, `ssf-week1`, `trade`)
  describes a budget as **constraints, not items**: candidate classes per slot,
  max affix count, minimum roll tier, ilvl band, link count, quality, and
  forbidden mod families (influence, veiled, essence-only, fractured).
- `scripts/builds/synthesize-gear.mjs` emits one concrete item per slot: base
  type picked deterministically from the budget's candidates (lowest ilvl, then
  alphabetical), affixes chosen by a reviewed priority list per slot and family,
  rolls at the midpoint of the allowed tier.
- **Every synthesised line is validated by effect, not by name.** PoB item text
  carries display mod lines (`+100 to maximum Life`), not mod ids, and it drops
  a line it cannot parse **silently** (S6, §15). So for each line the pipeline
  asserts (a) the item's parsed-mod count rises by exactly one and (b) the stat
  the line claims moves by the expected amount. Either check failing fails the
  build. This is `known-base-types.json` discipline: the game and the oracle
  both fail silently, so we fail loudly.
- Deterministic: seeded by `(buildId, checkpoint)`; no RNG, no network.
- Every synthesised item is rendered on the page as the "budget gear" table, so
  a reader can see what the gate assumed and disagree with it.
- Spike **S6** (§11) is the proof; it ran in P0 and passed (§15).

## 8. Gates

Config lives in `scripts/builds/gates.yaml` (D20). Defaults, to be tuned:

| Checkpoint | Gear budget | Gates |
|---|---|---|
| `act5` | `leveling` (template set) | res capped, life ≥ 1200 |
| `act10` | `ssf-start`: rares only, ≤3 useful mods, ilvl 68–75 bases, no influence, ≤5-link, gems 18/0%, no clusters, no awakened | res capped, life ≥ 2200 |
| `maps-early` | `ssf-start` + 5-link | EHP ≥ 20k, max phys hit ≥ 8k, clear DPS ≥ 400k |
| `maps-red` | `ssf-week1`: 6-link, 20/20 gems, clusters, core uniques allowed | EHP ≥ 30k, max phys hit ≥ 12k, single-target ≥ 2M |
| `pinnacle` | `trade`, uncapped | single-target ≥ 5M, or an explicit boss-timer allowance |

**Honest-config whitelist** — one fixed config per archetype, recorded in
`Build.config` and enforced by test: only self-applied buffs, declared flask
uptime, charges only if the build generates them, no enemy debuffs the build
cannot apply, no "target is shocked by someone else".

**Ablation** is leave-one-out: swap one core unique for its rare equivalent,
recalc, record `ablationDrop`. Full subset search is 2ⁿ and is out of scope.

**Calibration runs in both directions** — the gates' own regression test:

- **10 must-pass builds**: hand-built references that a competent player would
  ship, **re-geared per checkpoint by the same synthesiser** (§7.7). They cover
  `maps-early`, `maps-red` and `pinnacle`; the act checkpoints are covered by the
  must-fail set plus the P1 reference build, because their leveling trees arrive
  with derivation (P3). A failure means the gate is too strict; re-gearing is
  what stops a trade-geared build from trivially clearing an `ssf-start` gate.
- **10 must-fail builds** (uncapped res at `maps-red`, `act10` tree at T16,
  no sustain, 4-link at T16, no defensive layer, zero-damage-link swap, and so
  on). A pass means the gate is too loose — the failure that actually publishes
  bad builds.

Numeric comparisons use an explicit tolerance (integers exact, percentages
±1%), and the calibration report is committed.

## 9. The build page

**Guide steps** are the checkpoint keys (`until-12 | until-28 | until-68 |
maps-early | maps-red | pinnacle`), mapped onto the two filter phases (§10). A
step is a level bracket, not a filter phase; the page never calls one a "phase".

| Ask | Where it lives |
|---|---|
| Leveling skills | `leveling.brackets` (reviewed YAML, gem names registry-checked) |
| Pantheon | `pantheon` — default + situational note |
| Ascendancy 1→4 | `ascendancyOrder`, with lab breakpoints tied to tree checkpoints |
| Optional uniques | `uniques.core` vs `uniques.optional`, split by ablation, with the SSF source |
| Passive tree path | `tree.checkpoints` as an ordered path; `tree.respec` marks the respec boundary |
| Works at every stage | the gate strip: act5 / act10 / maps / red maps / pinnacle, each pass/fail |
| SSF | the SSF gate result and each core unique's self-found route |
| Filter while leveling | the step's filter download, right where that step starts |

Stale or failed builds render a banner and are excluded from `builds.html`
(R10).

### 9.1 Prose lifecycle

1. **Draft** — the section is written from its declared facts only.
2. **Check** — placeholders resolve, digits stay inside the closed token set,
   `factsHash` matches (§12.2).
3. **Retry once** with the failure text appended; a second failure sets
   `guide.<section>.status: auto-retry`, still checked, marked unsigned.
4. **Sign** — `signed: { by, at }` in the build YAML (authoring home), resolved
   into `guide.<section>.signed` and `status: signed` in the JSON. A build
   publishes when `guide.summary.status` is `signed` or `auto-breadth`; the
   other sections may publish as `auto-retry` (D1, D3, D28).
5. **Invalidate** — when the patch hash or a declared fact moves, the `factsHash`
   stops matching, the build is delisted, and the section must be re-drafted and
   re-signed before it returns. Nothing renders stale prose with new numbers.

## 10. Site

Rename to BuildPath (D11, D13): repo and directory done; `base`,
`package.json`, workflows, docs and favicon still to land. One Pages deploy.

- `builds.html` — league selector, flagships first, then breadth pages. No
  popularity widget: there is no population data (D1, §7.4).
- `build.html#build=<id>&step=<act1…act10|maps|boss>` — the page above. Hash
  routes, same no-router rule as the builder; `step` only ever holds a guide
  step value, never a checkpoint id.
- `index.html` — the existing builder, introduced as "Filter", with
  `mode=build&build=<id>` preselecting a build.
- Filter phase mapping (D10):

| Guide step | Filter |
|---|---|
| Acts 1–10 | `leveling` × `soft` |
| Early maps | `leveling` × `strict` |
| Endgame / bossing | `endgame` × `strict` or `uber` |

## 11. Phases

**P0 — spikes (2–3 days, go/no-go).** Six spikes, each with a written
pass/fail note in §15:

| # | Spike | Pass criteria |
|---|---|---|
| S1 | PoB headless | loads; two runs bit-identical; 8×5×200 evals < 30 min |
| S2 | Ladder list | HTTP 200 without auth from CI; class/level/rank present |
| S3 | Ladder trees | character tree fetched without a cookie |
| S4 | Character → PoB XML | round-trips into PoB with the same tree, links and item count, and **every ladder node id maps to a `TreeData` node (mismatch count 0)** |
| S5 | Terms | operative API clauses quoted into §7.4 |
| S6 | Synthesised gear | a budget-synthesised set loads in PoB with the expected mods applied per item; a bogus mod id fails the build |

If S1 (a) or (b) fails: stop and re-plan. If only S1 (c) fails: apply the
fallback ladder in §7.3 and record the measured rate. S2–S5 already ran; their
outcome is in §15 and the no-ladder decision in §7.4 stands.

**P0.5 — rename.** Two `chore:`/`refactor:` commits, documented in §16 of the
changelog.

**P1 — walking skeleton (landed in 0.54.0).** One hand-built reference build
end to end: `Build` type in `src/core/builds/`, `synthesize-gear.mjs`,
`verify.mjs`, `gates.yaml`, per-checkpoint gate report, PoB code generation,
`mode=build` filter, `build.html`, `src/builds/*.yaml` + schema + drift test.
Acceptance: page numbers equal JSON numbers, filter identical for a fixed preset
hash, goldens cover the new output, and every gate number is labelled
**uncalibrated** on the page until P3. Repair, ablation and leveling derivation
are deliberately absent from P1.

The drift test runs in a new `validate-builds.yml` job with the PoB cache, not in
`npm test`: it needs Lua and minutes, and `npm test` must stay fast and offline.

What shipped, where it differs from the text above:

- The done criterion for R3 is two tests, not one: `npm test` decodes each
  published code and compares its tree, items and gems with the gate report
  (offline, milliseconds), and `npm run builds:check` loads it in the pinned PoB
  inside `validate-builds.yml` (Lua, minutes).
- The checkpoint set is the six in `src/builds/config/checkpoints.yaml`
  (`until-12 | until-28 | until-68 | maps-early | maps-red | pinnacle`), not the
  five-key enum in §7.1. A checkpoint is a level bracket — it carries the tree,
  gems and gear a character can actually have — so separate act-5 and act-10
  keys duplicated `until-68` without adding a measurement (§16, revision 11).
- `synthesize-gear.mjs` never became its own script: gear synthesis lives in
  `verify.mjs`, next to the oracle run that consumes it, because a set that is
  not immediately measured has no reason to exist.


**P2 — seeded catalogue.** Three hand-built seeds through the whole chain
(synthesise → verify → gates → derive leveling → publish). No fetching: the only
network call is the pinned PoB clone. Acceptance: nightly workflow green,
deterministic ids and `seedHash` across two runs, and each seed either passes
every checkpoint or is rejected with a named reason.

**P2 status (in progress: two of three seeds).** `summon-skeletons-necromancer`
(caster/minion) and `lightning-arrow-deadeye` (bow) both pass all six
checkpoints. Gear is now profile-aware: `src/builds/gear/profiles.yaml` supplies
the bases and affixes an archetype wears, while `budgets.yaml` stays the shared
test condition, so "ssf-week1" means the same thing for every build.

Findings that changed the pipeline, recorded so they are not re-learned:

- **Ascendancy points were counted but never applied.** The planner recorded
  which notables the labs allow, but the XML omitted them, so every gate report
  measured a build with no ascendancy at all. They are now emitted with the
  small passives that connect them, and PoB's parsed node count is asserted
  against the planner's.
- **The planner walked into cluster-jewel-only nodes** (`Position Proxy`,
  `Medium Jewel Socket`), which PoB drops silently. They are excluded, and any
  future mismatch fails the build instead of shrinking the tree.
- **PoB cannot compute a minion with Unholy Might headless**: the minion's skill
  list comes back empty and DPS is 0. The summoner takes Bone Barrier instead of
  Unnatural Strength; a gate must measure the build, not a tool bug.
- **Flasks were listed but never equipped.** The guide's flasks are now in the
  XML and active (declared uptime), because a build with its flasks is the build
  the reader plays.
- **The act DPS floors were minion-shaped.** 60 DPS at level 12 and 600 at 28
  only admitted builds with several bodies; a 3-link bow does 37 and 471. The
  floors are now 25 and 350, with both measurements recorded in `gates.yaml`.

**P3 — repair, breadth pages, leveling derivation, ablation, calibration.**
Acceptance: calibration green in both directions; the three P2 seeds keep
passing; leveling path is a proven subset with valid order.

**P4 — prose + flagships.** 6–8 flagship builds, placeholder checks, breadth
pages where a gate-passing build exists (D1). Acceptance: R1–R4 enforced by
tests, human sign-off on prose only.

**P5 — per-phase filters, staleness delisting, league workflow, changelog.**
Acceptance: a patch bump delists every unverified build and the site says so.

## 12. Testing

### 12.1 Behaviour

- Gate report golden per build, with the pinned PoB ref, LuaJIT version and
  runner image recorded in the golden's header; numeric tolerance explicit.
- Tree subset test: every checkpoint ⊆ `endgame`, topological order valid.
- PoB round-trip: JSON → XML → code → PoB parse → same tree, links, item count.
- Registry tests: gems, bases, ascendancies, pantheon ids and bandit ids all
  exist in the reviewed registries; no unique name in any emitted `BaseType`.
- Catalogue invariants: ids are unique and match (main skill, ascendancy); no
  two builds share the pair (D26).
- Ascendancy points: every `ascendancyOrder` entry carries `lab ∈ 1…4`, each
  node appears once, and the count of entries with `lab ≤ k` never exceeds the
  points available at that checkpoint (2 for `act5`, 4 for `act10`).
- Determinism: two full runs over the cached input produce byte-identical
  `builds/` output **excluding `guide`**. Prose is model-written and is not part
  of the nightly chain; it is regenerated and signed as an explicit step (§9.1).
- PoB lag: with no PoB tag for the live patch, the catalogue renders the
  "waiting for PoB" state and publishes nothing (D27).
- Filter: existing golden/audit suites extend to `mode=build`.
- Seeds: every `src/builds/*.yaml` validates against the schema and resolves to
  exactly one build; an orphan seed or an orphan generated build fails the build.
- Calibration: 10 must-pass and 10 must-fail.

### 12.2 The prose claim check (R1)

Prose is markdown with `{{path|format}}` placeholders, e.g.
`{{gates.pinnacle.dps|dps}}` → `2.31M`. Formats are a closed set, each with one
rounding rule:

| Format | Renders |
|---|---|
| `dps`, `k` | `2.31M`, `12.4k` (two decimals under 10, one above, unit suffix) |
| `int` | `1234` (no separators) |
| `pct` | `34%` (integer) |
| `link` | `6-link` |
| `lv` | `20/20` |
| `res` | `75%` |
| `tier` | `T16` |
| `act` | `Act 5` |
| `patch` | `3.29.0` |

- Every placeholder must resolve, or the build fails.
- Prose may contain digits only inside a **closed token set**: `{{…}}`
  placeholders, `T<n>`, `<n>-link`, `<n>/<n>`, `Act <n>`, a patch version,
  `+<n>`. Anything else fails — `T16` and `6-link` are the two that a naive
  digit scan would otherwise flag on every valid draft.
- **`factsHash` covers declared inputs, not every path.** Each guide section
  declares `facts: [gates.pinnacle.dps, uniques.core, …]` in the build YAML, and
  the hash covers only those. Adding a new gate metric must not invalidate every
  prose file in the catalogue.
- Prose whose hash no longer matches its declared facts is rejected, not
  silently rendered.

## 13. Risks

| Risk | Mitigation |
|---|---|
| PoB oracle not usable headless | S1 cancel criterion; re-plan before P1 |
| Character → PoB mapping lossy | S4 spike; round-trip assertion |
| Model prose drifts from facts | placeholders + `factsHash` (R1) |
| Gates too strict / too loose | calibration in both directions |
| Optimiser overfits or drifts | bounded repair, `nodeDelta`, seed-vs-repaired view (R12) |
| "Best build" expectation | gate report + reproduction steps on every page |
| Seeds reflect the maintainer's taste, not the meta | gates decide publication; no page claims popularity (D1); breadth only where a build passes |
| League launch breaks everything | 72h gate (R4), delist on patch bump, keep-last-good |
| Two filters for one build | one object; builder `mode=build` reads the same JSON |
| PoB licence / vendoring | CI-only clone at a pinned tag; no PoB code in `src/` or the bundle |
| Golden brittleness | pinned image + PoB ref, explicit tolerance |
| `builds/` monolith too big | index + per-build JSON (§7.2) |
| Rename breaks old links | accepted (D11); changelog note |

## 14. Open items

- **Breadth depth** (D1): how many per-ascendancy pages to publish — decide
  after 1.0, on the evidence of which ones pass gates. No popularity data
  exists, so no plan depends on it.
- **True third filter phase** (D10): ~18 new preset entries, goldens, audit
  expectations, filenames. Only if the two-phase mapping proves awkward.
- **`src/core` extraction** (D13): after 1.0, only if a second site exists.
- **Per-act quest-reward gem data** (D16): dropped from v1; revisit if the
  bracket list proves too coarse.
- **Gate numbers**: §8 defaults are a starting point, tuned by calibration.

## 15. Spike results

Filled in during P0. Empty means P0 has not run.

| # | Result | Evidence | Decision |
|---|---|---|---|
| S1 | **pass** | PoB `v2.69.0` source loads headless under stock LuaJIT 2.1 and returns `CombinedDPS`, `Life`, `EnergyShield`, `TotalEHP`, `PhysicalMaximumHitTaken`, resists, mana. Three loads of one XML are byte-identical; median 0.141 s/eval in a warm process, so 8×5×200 projects to **21 min** (< 30 min target). Needs `lua-utf8` on `LUA_CPATH` and PoB's `runtime/lua` on `LUA_PATH`. `Classes/CompareBuySimilar.lua` at that tag has three Luau-syntax lines that make stock LuaJIT refuse to boot; a three-line patch fixes it (`spike/pob`). | Debug-only oracle, one warm process, XML reload per evaluation. Pin the tag only after that file is clean; check it on every PoB bump. |
| S2 | **pass** | `api.pathofexile.com/ladders` (and the `www` host) answer unauthenticated: 200 entries per call, `total` 15000, headers `X-Rate-Limit-Policy: ladder-view`, `X-Rate-Limit-Ip: 5:5:10,10:10:30,15:10:300`. The `class` field carries **ascendancy** names (Ascendant, Pathfinder, Necromancer, Warden…) for ascended characters, so an ascendancy distribution needs no character data at all. A `public` flag is present on ~62% of entries. | Usable for distribution only; skills and trees are not in the payload. |
| S3 | **fail** | `character-window/get-passive-skills?account=…&character=…` returns `{"error":{"code":6,"message":"Forbidden"}}` with a plain UA and with browser-ish headers. An application-level auth gate, not a bot block. | **D5 applies.** No session cookies, so no character trees, no skills, no ladder-derived builds. |
| S4 | **blocked** | Nothing to map: S3 yields no character data. PoB itself already ships `loadBuildFromJSON`, which ingests the official character response, so the mapping costs nothing if access ever returns. | Not a design risk any more — just unreachable. |
| S5 | **caution (decided: drop)** | The Developer Docs limit sanctioned use to "resources defined in our API Reference or listed in our Data Exports" and forbid "any other internal website APIs". `/ladders` is on the official host with published rate-limit headers but is **not** in the reference; character endpoints require OAuth and "We are currently unable to process new applications". The UA format they ask for is OAuth-prefixed with a contact. | Maintainer decision (§14). If allowed: distribution only, ≤5 requests/5 s, cached daily, never a character call. |

| S6 | **pass, with a correction** | Item text carries display mod lines, not mod ids. `+100 to maximum Life` applies exactly (100 vs 87 flat = +41 life through the build's increased-life); `+100 to maximum Nonsense` is dropped **silently** — same number of stat lines, one fewer parsed mod, gate computed on a weaker item. | Gates assert **parsed-mod count delta and stat delta per line** (§7.7 revised). No mod-id registry exists to lean on. |

## 16. Revision history

### Council review

One delegate (`openrouter/deepseek/deepseek-v4.1-flash-1017`), reviewed against
AGENTS.md and PLAN.md.

| Round | Score | Outcome |
|---|---|---|
| 1 | 6/10 | three blockers: schema could not express the gates, byte-stability unsatisfiable, non-deterministic clustering |
| 2 | 8/10 | passed the skill threshold |
| 3 | 9/10 | internal contradictions: quest-point phrasing, guide-prose determinism, missing S1(c) decision |
| 4 | 9/10 | step enum vs checkpoint enum, and the `guide` object could not hold per-section sign-off |
| 5 | 9/10 | `auto-breadth` could never satisfy the publication rule (a round-4 regression) |
| 6 | 9/10 | the same rule still had a stale copy in §7.2, the section the pipeline obeys |

### Revision 12 — second seed, and what it exposed

P2's first non-minion seed (`lightning-arrow-deadeye`) runs through the whole
chain. Adding it exposed four measurement bugs that a single caster seed had
hidden; all are fixed in the pipeline rather than worked around, and §11's P2
status lists them. In the plan's own terms:

- **D29 is now real.** Ascendancy points are emitted with their connecting
  passives, so a lab budget in `checkpoints.yaml` actually limits what the gate
  evaluates.
- **D23 (budget vs profile).** `budgets.yaml` is the test condition; the new
  `gear/profiles.yaml` is what an archetype wears under it. A second build
  cannot silently re-gear itself a different test.
- **§8's act gates** are survivability gates again in practice: the DPS floors
  are low enough that a 3-link attack build passes, which the previous numbers
  did not.
- **Flasks** are evaluated, not merely listed, which settles the "declared
  uptime" half of the config question: no other belt is assumed.

Still open: three seeds are the P2 target; the catalogue has two. Repair,
ablation, leveling derivation and calibration remain P3.

### Revision 11 — P1 landed

P1 shipped in 0.54.0. What that changed in this document:

- **One artefact for R3, two checks.** `npm test` decodes every published code
  and compares its tree, items and gems with the gate report; `npm run
  builds:check` loads it in the pinned PoB inside `validate-builds.yml`. The
  offline half is fast enough for the normal suite, the Lua half is not.
- **The checkpoint enum is the shipped one.** `checkpoints.yaml` defines six
  level brackets (`until-12`, `until-28`, `until-68`, `maps-early`, `maps-red`,
  `pinnacle`), and a checkpoint carries its own level, points, labs, gear budget
  and gem cap. The five-key `act5 | act10 | maps-early | maps-red | pinnacle`
  enum and the separate display-only guide steps in revisions 1–10 are
  superseded: act 5 and act 10 as separate machine checkpoints duplicated
  `until-68` without measuring anything new.
- **Gear synthesis stayed in `verify.mjs`.** A synthesised set has no purpose
  outside the evaluation that consumes it, and a separate script invited the two
  to drift.
- **`checkedAt` follows D22 in code.** Re-verifying unchanged numbers no longer
  rewrites the stamp, so the nightly job produces no diff.
- Gate numbers are still uncalibrated (§14): P3's must-pass and must-fail sets
  are what turn them into claims.

### Revision 10 — ladder dropped

Maintainer decision after S2–S5: **no ladder ingest of any kind** (D31).

- §2's evidence row is now hand-curated seeds; §7.4 became "why there is no
  ladder ingest", with the measurements, so it is not re-opened.
- Clustering, sample thresholds and the ladder pipeline stage are gone. Seeds are
  reviewed YAML; the pipeline proves, repairs within bounds, and accepts or
  rejects.
- P2 is now "seeded catalogue", calibration uses hand-built must-pass builds,
  and no page claims popularity.
- R11 became "no request to pathofexile.com, ever".

### Revision 9 — after the S2–S5 spikes

- S2 passes: the ladder answers unauthenticated and its `class` field carries
  ascendancy names, so a distribution heatmap needs no character data.
- S3 fails: character trees return `Forbidden`. **D5 is in force** — no ladder
  character data, therefore no mined builds and no mined skills.
- S4 is unreachable and no longer a design risk: PoB's `loadBuildFromJSON`
  already ingests the official character response.
- S5 raises a policy question that is now the top open item: `/ladders` is on
  the official host with published rate limits but is not in the API Reference.
- Consequence for P2–P4: build *content* comes from hand-curated seeds plus the
  PoB oracle, exactly as D1's escape hatch already allowed. The ladder's only
  possible contribution is population counts.

### Revision 8 — after the S1 and S6 spikes

- S1 and S6 ran and passed; results, numbers and the working PoB recipe are in
  §15, with reproduction steps on `spike/pob-oracle`.
- §7.7 corrected: PoB item text carries display mod lines, not mod ids, and
  silently drops what it cannot parse. Synthesis is validated by **parsed-mod
  count and stat delta per line**, not by an id registry.
- §7.3 records the pinning prerequisite: PoB `v2.69.0` ships three Luau-syntax
  lines that make stock LuaJIT refuse to boot, so a tag is only pinnable once
  that file parses.

### Revision 7 — after round 6

- §7.2's prose loop now states the same publication rule as §7.1, D28 and §9.1.
- Grepped every remaining mention of `signed`/`auto-*`: the four live copies agree;
  the revision-history entries are marked as superseded where they differ.

### Revision 6 — after round 5

- Publication rule now accepts `guide.summary.status ∈ { signed, auto-breadth }`,
  so a breadth page can publish (D1) while flagships still require sign-off.
- D28 and §9.1 step 3 no longer reference the removed `guide.status` field.

### Revision 5 — after round 4

- `guide` is a per-section map, each with its own `status`, `signed`, declared
  `facts` and `factsHash`; publication requires a signed `summary` (D28).
  Superseded in revision 6, which also accepts `auto-breadth`.
- §7.2 and §9.1 now state the same publication rule in the same words.
- `build.html#…&step=` is restricted to guide-step values (`act1…act10 | maps |
  boss`), never a checkpoint id.

### Revision 4 — before round 3

Gap hunt on my side plus round 2's residual list:

- D26 one build per (main skill, ascendancy); competing clusters dropped.
- D27 PoB-lag policy: no tag for the live patch means "waiting for PoB", never
  verification against the previous patch.
- D29 ascendancy points per lab, so act checkpoints cannot assume impossible
  points.
- D30 reviewed leveling point budgets, and §7.5 says how the pruning uses them.
- §9.1 prose lifecycle: draft → check → one retry → sign → invalidate.
- §7.2 patch-facts content hashes; §12.1 catalogue invariants, lab-point check,
  two-run byte-identical determinism, and the waiting-for-PoB state.

### Revision 3 — after round 2

- P1/P3 contradiction fixed: `verify.mjs`, `gates.yaml` and `synthesize-gear.mjs`
  move into P1; repair, ablation, clustering and leveling derivation stay in P3;
  P1 numbers are labelled **uncalibrated**. Drift test gets a named CI job
  (`validate-builds.yml`).
- §7.7 gear synthesis specified, with D23 and spike **S6**: budgets are
  constraints, items are synthesised deterministically, and an unknown mod id
  fails the build.
- Must-pass calibration builds are re-geared per checkpoint (§8), closing the
  vacuous-pass direction.
- `uniques[].filter` removed: one source of truth for filter bases, asserted by
  test.
- `tree.respec[].at` renamed `atStep` so guide steps and checkpoints cannot
  collide.
- Repair stop rule and eval accounting stated.
- `factsHash` covers a declared input list (D25); §12.2 gains the format table
  and the closed digit-token set.
- Sparse SSF coverage called out so the heatmap cannot read as "nobody plays it".

### Revision 2 — after round 1

- `Build` schema rewritten: per-checkpoint `gearSets`, `config`, `leveling`,
  `uniques` split into `displayName`/`filter`, `repair`, canonical checkpoint
  enum.
- Filter determinism restated as "fixed preset hash" (D21) instead of the
  unsatisfiable byte-stability claim.
- PoB spike criterion changed from latency to load + determinism + total budget;
  S4 (character → PoB XML) and S5 (terms) added.
- Calibration extended with 10 must-fail builds.
- Determinism section added: id derivation, main-skill detection, clustering,
  sample threshold, repair bounds, commit discipline.
- Prose claim check (R1/§12.2) defined with placeholders and a numeral
  allowlist.
- `src/builds/` YAML home, schema and drift test added to P1.
- `builds.json` split into index + per-build files.

### Declined

- **Per-act quest-reward gem table**: no lawful data source inside our
  constraints (no poedb scraping, absent from RePoE and PoB `Gems`); the bracket
  list is enough. Open item, not a gap.
- **Folding builds into `npm run presets:build`**: the PoB pipeline must never sit
  inside `npm test` or the filter build.
- **Relaxing R4** so hand-made builds may publish in a league's first 72h: a
  moved tree invalidates them too.

## 17. Links

- Builder: https://lordgreg.github.io/buildpath/
- Builds: https://lordgreg.github.io/buildpath/builds.html
- Loot simulator: …/demo.html
- Behaviour audit: …/tests.html
- Changelog: …/changelog.html
