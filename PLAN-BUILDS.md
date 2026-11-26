# BuildPath — Plan

> Revision 25. The completed phase narratives, spike table and revision history
> were removed; the shipped state is summarised in §11, and the next breadth
> pass is the 15-build backlog in §16. Normative decisions, requirements and
> architecture are unchanged.

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
  "schemaVersion": 1,
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
      "until-12": [], "until-28": [], "until-68": [],
      "maps-early": [], "maps-red": [], "pinnacle": []
    },
    "respec": [ { "atStep": "until-68", "taken": [], "dropped": [] } ]
  },
  // The budget each checkpoint's gear is synthesised from; the shipped JSON
  // carries the resulting items, gems and flasks under gates[cp].
  "gearSets": {
    "until-12":   { "budget": "starting",   "items": [], "gemLevels": { "main": "…" } },
    "until-28":   { "budget": "early",      "items": [], "gemLevels": { "main": "…" } },
    "until-68":   { "budget": "ssf-start",  "items": [], "gemLevels": { "main": "…" } },
    "maps-early": { "budget": "ssf-start",  "items": [], "gemLevels": { "main": "…" } },
    "maps-red":   { "budget": "ssf-week1",  "items": [], "gemLevels": { "main": "…" } },
    "pinnacle":   { "budget": "trade",      "items": [], "gemLevels": { "main": "…" } }
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
    "maps-red": {
      "pass": true,
      "thresholds": { "life": 4500, "ehp": 12000, "maxHit": 6000, "dps": 120000 },
      "metrics": { "dps": 141545, "life": 5674, "ehp": 30792, "maxHit": 8729 },
      "failures": []
    }
    // all six checkpoint keys are required, each with pass: true
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
  five-key `act5 | act10 | …` set never shipped.
- `tree.checkpoints[cp]` is a **subset** of `tree.endgame`, asserted by test
  with valid topological order.
- `gearSets` is keyed by the same checkpoint enum and names one `budget`; the
  items are synthesised from `src/builds/gear/<budget>.yaml` (§7.7), so six
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
- `gates` requires **all six** checkpoint keys and every one `pass: true`;
  anything else leaves the build unpublished (R2).
- `gearSets[cp].items` is produced by the synthesiser (§7.7). A build YAML only
  carries overrides — the slot whose base the build actually needs.
- `pob.code` is the XML of the `maps-red` gear set (D24), so the code a reader
  imports matches the checkpoint the page calls "what we tested".
- `id` is unique across the catalogue: exactly one build per (main skill,
  ascendancy). A second seed for the same pair is rejected, never published as a
  near-duplicate under a suffixed id (D26).
- `ascendancyOrder` entries carry the lab that grants them, and each
  checkpoint's `labs` count in `checkpoints.yaml` bounds how many may be
  allocated: `until-12` and `until-28` assume no lab (the normal lab lands
  around level 33), `until-68` assumes labs 1–3, and `maps-early` onward assume
  all four. A gate therefore never evaluates a tree with ascendancy points the
  player cannot have (D29).
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
| `scripts/builds/pipeline.mjs` | Shared gear synthesis, gem levels, XML serialisation, oracle call and PoB-code encoding. |
| `scripts/builds/verify.mjs` | Seed → one endgame plan → per-checkpoint pruning, PoB evaluation, bounded repair, gate evaluation and leave-one-out ablation. |
| `scripts/builds/calibrate.mjs` | Must-pass and must-fail gates in both directions; commits `builds/calibration.json`. |
| `scripts/builds/compile-builds.mjs` | Resolve prose and `factsHash`, compile the seeds to JSON, apply staleness. |
| `scripts/builds/sign-guide.mjs` | Stamp a guide section's sign-off in the seed (`builds:sign`). |
| `scripts/builds/publish-pobs.mjs` | Release only: create the pobb.in paste per build and commit the id map. |
| `scripts/builds/check-pob-code.mjs` | Load every published code in the pinned PoB and compare its counts (`builds:check`). |

`validate-builds.yml` chains patch facts, compile, calibrate, verify and the code
check for the nightly workflow; each script is runnable alone so a failure has a
name. Nothing in the chain touches the network except the pinned
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

**Prose loop** — the prose is authored in the seed (model-drafted, at most two
attempts, §9.1); `compile-builds.mjs` resolves its placeholders, computes
`factsHash` and runs the §12.2 checks. A section that still fails is
`auto-retry`, still placeholder-resolved and still checked. Publication requires
`guide.summary.status ∈ { signed, auto-breadth }`, the latter only on a
non-flagship breadth page; every other section may be `auto-retry` (D1, D28).

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
`points` budget in `src/builds/config/checkpoints.yaml` for that step (the same
table that carries level, labs and gear budget; there is no separate leveling
file). The budget is a human-reviewed per-patch table (D30); deriving it from
quest counts at runtime is what breaks on every league.

### 7.6 Filter determinism

Filters are deterministic **for a fixed preset hash**. They are *not*
byte-stable across days: `presets.json` embeds the economy snapshot, so an
economy tier move changes the hash and the filter (PLAN.md Phase 5). That is the
desired behaviour and the existing sync panel already reports it. P1 acceptance
therefore asserts (a) identical output for a fixed hash, and (b) the build page
displays the hash and header line so a stale file is identifiable.

### 7.7 Gear synthesis

Gates are only as honest as the items PoB evaluates them against, and
hand-writing six item sets per build does not scale to 19 ascendancies.

- `src/builds/gear/budgets.yaml` (`starting`, `early`, `leveling`, `ssf-start`,
  `ssf-week1`, `trade`) describes a budget as **constraints, not items**:
  candidate classes per slot, max affix count, minimum roll tier, ilvl band,
  link count, quality, and forbidden mod families (influence, veiled,
  essence-only, fractured). `profiles.yaml` supplies the bases and affixes each
  archetype actually wears under that budget, so "ssf-week1" means the same test
  for every build.
- `scripts/builds/pipeline.mjs` emits one concrete item per slot: base type
  picked deterministically from the budget's candidates (lowest ilvl, then
  alphabetical), affixes chosen by a reviewed priority list per slot and family,
  rolls at the midpoint of the allowed tier. A profile may add the early offhand
  its archetype needs; without it a caster's "Shield" gem rows pointed at gear
  that was never synthesised.
- `src/builds/gear/eldritch.yaml` adds one Ember and one Ichor implicit per
  armour slot at the red-map and pinnacle budgets. These are implicit modifiers,
  not prefixes or suffixes, and the oracle asserts the parsed implicit count the
  same way it asserts explicit lines.
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
- Spike **S6** (§15) is the proof; it ran in P0 and passed.

## 8. Gates

Config lives in `scripts/builds/gates.yaml` (D20), marked `calibrated: true`;
that file is the only source of thresholds and the calibration report hashes it.
The table below mirrors it at 0.69.0:

| Checkpoint | Gear budget | Gates |
|---|---|---|
| `until-12` | `starting` (3-link) | life ≥ 250, DPS ≥ 25; resistances not required yet |
| `until-28` | `early` (4-link) | life ≥ 700, DPS ≥ 350; resistances not required yet |
| `until-68` | `ssf-start` (5-link) | resistances capped (75 after penalty), life ≥ 2000, max phys hit ≥ 2000, DPS ≥ 8000 |
| `maps-early` | `ssf-start` (5-link) | resistances capped, life ≥ 3000, EHP ≥ 8000, max phys hit ≥ 4000, DPS ≥ 20000 |
| `maps-red` | `ssf-week1` (6-link) | resistances capped, life ≥ 4500, EHP ≥ 12000, max phys hit ≥ 6000, DPS ≥ 120000 |
| `pinnacle` | `trade` (6-link) | chaos resistance 75, life ≥ 5000, EHP ≥ 14000, max phys hit ≥ 7000, DPS ≥ 150000 |

A `dad` profile in the same file lowers only the damage floor; the defensive
gates are unchanged and the page labels the profile.

**Honest-config whitelist** — one fixed config per archetype, recorded in
`Build.config` and enforced by test: only self-applied buffs, declared flask
uptime, charges only if the build generates them, no enemy debuffs the build
cannot apply, no "target is shocked by someone else".

**Ablation** is leave-one-out: swap one core unique for its rare equivalent,
recalc, record `ablationDrop`. Full subset search is 2ⁿ and is out of scope.

**Calibration runs in both directions** — the gates' own regression test:

- **Every published build at every checkpoint is a must-pass observation**:
  16 builds × 6 checkpoints = 96, each **re-geared per checkpoint by
  the same synthesiser** (§7.7), including the Dad-profile builds. A failure
  means the gate is too strict; re-gearing is what stops a trade-geared build
  from trivially clearing an `ssf-start` gate.
- **10 must-fail builds** (uncapped res at `maps-red`, `until-68` tree at T16,
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
| Works at every stage | the gate strip: until-12 / until-28 / until-68 / early maps / red maps / pinnacle, each pass/fail |
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

### 9.2 Covens Wickerman and gem quality

- Every seed declares a `wickerman.profile`. `src/builds/config/viscera.yaml`
  holds the reviewed Viscera registry and maps each profile to the best item for
  the leveling, maps and bossing phases, one item for each of the four slots
  (head, torso, upper limb, lower limb). The compiler validates the item name,
  its slot and the named tier, then resolves effect, source and area into the
  build JSON; the page renders the four slots for the selected step's phase.
- **Gem quality and Vaal corruption are endgame investments.** They are measured
  and shown only at `maps-red` and `pinnacle`; earlier checkpoints use 0%
  quality and an uncorrupted level cap. A guide built around a Vaal gem may set
  `gemQualityFrom: leveling`, which is the only exception.
- `gateThresholdsHash` covers the checkpoint config as well as the gate
  thresholds, so changing quality, gem caps, levels or budgets invalidates the
  calibration report and forces a re-run.

## 10. Site

Rename to BuildPath (D11, D13) is landed: the repository, `package.json`, all
page titles, workflows, docs and the `base` path carry BuildPath. One Pages
deploy.

- `builds.html` — the catalogue: verified builds with the six-step pass/fail
  strip, red-map and pinnacle damage, and links to the guide and its filter. It
  reads `builds/index.json` alone (§7.2) and has no popularity widget, because
  there is no population data (D1, §7.4). A league selector waits for a second
  league to exist.
- `build.html#build=<id>&step=<until-12|until-28|until-68|maps-early|maps-red|pinnacle>`
  — the page above. Hash routes, same no-router rule as the builder; `step` holds
  one of the six checkpoint ids, the same key the gate report uses. The
  `act1…act10` step set in the early revisions never shipped.
- `index.html` — the existing builder, introduced as "Filter", with
  `mode=build&build=<id>` preselecting a build.
- Filter phase mapping (D10):

| Guide step | Filter |
|---|---|
| Acts 1–10 | `leveling` × `soft` |
| Early maps | `leveling` × `strict` |
| Endgame / bossing | `endgame` × `strict` or `uber` |

## 11. Status and next work

**Shipped baseline.** P0–P7 are complete. The catalogue has sixteen verified
builds across nine ascendancies; every one passes all six checkpoints, the
calibrated must-pass set is 16 × 6 = 96 observations, and the ten must-fail
mutations and the unique-ablation probe are green. Patch facts, delisting, the
league window, per-section prose with `factsHash`, the Dad profile, ratings,
season tags and per-build changelogs shipped in 0.69.0.

What remains is breadth: prove the 15 builds in §16 through the same chain. A
build that does not pass every gate stays a draft and is not published (R2).
No phase is open; the backlog is the only planned work.

## 12. Testing

### 12.1 Behaviour

- Gate report golden per build, with the pinned PoB ref, LuaJIT version and
  runner image recorded in the golden's header; numeric tolerance explicit.
- Tree subset test: every checkpoint ⊆ `endgame`, connected from the class
  start, with a valid allocation order.
- Repair record test: every checkpoint publishes `evals`, `nodeDelta` and a
  `within-bound`/`exceeded` status; the pure bound, score and seeded shuffle are
  tested without Lua.
- Calibration test: the committed report's hash matches the current thresholds,
  every must-pass passes, every must-fail fails for its named defect, and the
  unique-ablation probe parses real mods and records a drop.
- Gear-slot test: every gem group's slot exists in that checkpoint's gear, with
  `Shield` mapped to PoB's `Weapon 2`.
- Jewel-pin test: every `tree.jewels` entry points at a socket in the checkpoint
  tree and the pin count equals the socketed jewel count.
- Eldritch test: endgame body/helmet/gloves/boots carry one Ember and one Ichor
  implicit, and the oracle's parsed-implicit count matches what was written.
- Lab test: no checkpoint below level 33 assumes a lab, and no checkpoint
  assumes more ascendancy nodes than its lab budget can grant.
- Content test: every build has at least five weighted pros and cons, every
  displayed gem has a description or effect line, and every pantheon/bandit id
  resolves to the reviewed registry.
- Asset test: every published build has a generated 16:9 header WebP, a plain
  `.pob` asset equal to the PoB code, and a pobb.in link whose code hash still
  matches.
- Ascendancy test: the full graph resolves for the build, every chosen node
  exists in it, and every node has an effect line.
- Tree-focus test: `focusPoint` centres an edge node and stays inside the
  constellation, like the pan/zoom invariants.
- PoB round-trip: JSON → XML → code → PoB parse → same tree, links, item count.
- Registry tests: gems, bases, ascendancies, pantheon ids and bandit ids all
  exist in the reviewed registries; no unique name in any emitted `BaseType`.
- Catalogue invariants: ids are unique and match (main skill, ascendancy); no
  two builds share the pair (D26).
- Ascendancy points: every `ascendancyOrder` entry carries `lab ∈ 1…4`, each
  node appears once, and no checkpoint allocates more labs than its `labs`
  count in `checkpoints.yaml` (0 at `until-12` and `until-28`, 3 at `until-68`,
  4 from `maps-early` on).
- Determinism: two full runs over the cached input produce byte-identical
  `builds/` output **excluding `guide`**. Prose is model-written and is not part
  of the nightly chain; it is regenerated and signed as an explicit step (§9.1).
- PoB lag: with no PoB tag for the live patch, the catalogue renders the
  "waiting for PoB" state and publishes nothing (D27).
- Filter: existing golden/audit suites extend to `mode=build`.
- Seeds: every `src/builds/*.yaml` validates against the schema and resolves to
  exactly one build; an orphan seed or an orphan generated build fails the build.
- Calibration: every published build at every checkpoint is a must-pass
  observation (16 × 6 = 96, including the Dad-profile builds), plus
  the ten must-fail mutations and the unique-ablation probe.

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

- **Breadth depth** (D1): the 15-build backlog in §16 is the next breadth pass.
  Publish only the ones that pass every gate, and keep popularity claims off the
  site; the external signals are editorial input, not page copy.
- **True third filter phase** (D10): ~18 new preset entries, goldens, audit
  expectations, filenames. Only if the two-phase mapping proves awkward.
- **`src/core` extraction** (D13): after 1.0, only if a second site exists.
- **Per-act quest-reward gem data** (D16): dropped from v1; revisit if the
  bracket list proves too coarse.
- **Gate numbers**: the §8 defaults are calibrated. Further tuning is a
  calibration run (must-pass and must-fail), not an open design question.

## 15. Completed evidence

The P0 spikes are closed:

- **S1 pass** — PoB `v2.69.0` loads headless under LuaJIT 2.1 and returns the
  measured stats; repeated loads are identical; the warm-process rate is about
  0.141 s/evaluation. The three Luau-syntax lines in
  `Classes/CompareBuySimilar.lua` are fixed by the committed compat patch.
- **S2 pass / S3 fail / S4 blocked / S5 drop** — the ladder list is reachable,
  character trees answer `Forbidden`, and the official-host route is not in the
  sanctioned API reference. No ladder ingest follows (D31, §7.4).
- **S6 pass** — PoB item text carries display mods, not mod ids. Gear synthesis
  asserts parsed-mod count and stat delta per line, so a silently dropped line
  fails the build.
- **Calibration** — 96 must-pass observations (16 builds × 6 checkpoints), ten
  must-fail mutations and one unique-ablation probe are green.

The full spike output and pre-0.69 revision history remain in git history and
`CHANGELOG.md`.

## 16. Backlog — 15 builds for 3.30 Covens

This is the next breadth pass. It is deliberately a backlog, not a popularity
claim: each seed must still pass the gates in §8 before it publishes (D1, D2).

**Selection filter.** Patch 3.30 Covens only; no Standard and no 3.29-or-older
builds. Signals are the Maxroll 3.30 league-starter tier, live poe.ninja Covens
play share, YouTube guide views (aggregated by poebuilds.cc), and official
forum/Mobalytics coverage. Views are the highest single 3.30 guide or series
found, rounded.

| # | Seed id | Build | Class / ascendancy | Family | Main skill | Signals | Source |
|---|---|---|---|---|---|---|---|
| 1 | `storm-burst-repulsion-hierophant` | Storm Burst of Repulsion Totems | Templar / Hierophant | caster | Storm Burst of Repulsion | Maxroll **S**; 3.0% Covens, 7.3% SSF; 136k views | [Maxroll](https://maxroll.gg/poe/build-guides/storm-burst-of-repulsion-totem-hierophant-league-starter) · [YouTube](https://www.youtube.com/watch?v=pwGUXX86mrA) |
| 2 | `poison-ranged-animate-weapon-necromancer` | Poison Ranged Animate Weapons | Witch / Necromancer | minion | Animate Weapon of Ranged Arms | Maxroll **S**; 3.0%; 123k views | [Maxroll](https://maxroll.gg/poe/build-guides/poison-ranged-animate-weapons-league-starter) · [YouTube](https://www.youtube.com/watch?v=DD5NUutEuPI) |
| 3 | `static-strike-guardian` | Static Strike Guardian | Templar / Guardian | melee | Static Strike | 5.6% SSF; **270k views** | [YouTube](https://www.youtube.com/watch?v=MI3e0Gz6R6s) · [Reddit](https://www.reddit.com/r/PathOfExileBuilds/comments/1xtf3nx/my_330_static_strike_guardian_leaguestarter/) |
| 4 | `ethereal-knives-massacre-elementalist` | Ethereal Knives of the Massacre | Witch / Elementalist | caster | Ethereal Knives of the Massacre | 4.1% Covens; ~76k views | [poe.ninja](https://poe.ninja/poe1/builds/covens?class=Elementalist&skills=Ethereal+Knives+of+the+Massacre) · [Mobalytics](https://mobalytics.gg/poe/builds/ignite-ethereal-knives-elementalist-build-league-starter-to-endgame) |
| 5 | `incinerate-venting-elementalist` | Incinerate of Venting | Witch / Elementalist | caster | Incinerate of Venting | 3.6% SSF; 119k views | [YouTube](https://www.youtube.com/watch?v=2NYMoUk7LIM) |
| 6 | `earthshatter-luminary` | Facebreaker Luminary | Scion / Luminary | melee | Earthshatter | Maxroll **S**; 32k+ views | [Maxroll](https://maxroll.gg/poe/build-guides/facebreaker-luminary-league-starter) · [YouTube](https://www.youtube.com/watch?v=mPJxGsFCZZA) |
| 7 | `scorching-ray-immolation-chieftain` | Scorching Ray of Immolation | Marauder / Chieftain | caster | Scorching Ray of Immolation | 3.1% Covens; 80k views | [Mobalytics](https://mobalytics.gg/poe/builds/cws-chieftain-3-30-emiracles) · [pobarchives](https://pobarchives.com/build/pWBkU3QX) |
| 8 | `smite-divine-judgement-inquisitor` | Smite of Divine Judgement | Templar / Inquisitor | melee | Smite of Divine Judgement | Maxroll **S**; 55k+ views | [Maxroll](https://maxroll.gg/poe/build-guides/smite-of-divine-judgement-league-starter) |
| 9 | `tornado-shot-deadeye` | Tornado Shot | Ranger / Deadeye | bow | Tornado Shot | ~4% snapshot; 133k views | [poe.ninja](https://poe.ninja/poe1/builds/covens?skills=Tornado+Shot) |
| 10 | `divine-retribution-gladiator` | Divine Retribution | Duelist / Gladiator | caster | Divine Retribution | 2.1% Covens; 124k series views | [YouTube](https://www.youtube.com/watch?v=OBWHGBy70xw) · [poe.ninja](https://poe.ninja/poe1/builds/covens?class=Gladiator&skills=Divine+Retribution) |
| 11 | `lightning-tendrils-eccentricity-elementalist` | Lightning Tendrils of Eccentricity | Witch / Elementalist | caster | Lightning Tendrils of Eccentricity | 2.5% Covens; 97k views | [YouTube](https://www.youtube.com/watch?v=sOKiVtyhb8M) |
| 12 | `toxic-rain-pathfinder` | Toxic Rain | Ranger / Pathfinder | bow | Toxic Rain | ~5% snapshot; 61k views | [Mobalytics](https://mobalytics.gg/poe/builds/toxic-rain-pathfinder) · [YouTube](https://www.youtube.com/watch?v=GsDMr2NZRao) |
| 13 | `venom-gyre-trickster` | Venom Gyre | Shadow / Trickster | hybrid | Venom Gyre | ~2% snapshot; 157k views | [YouTube](https://www.youtube.com/watch?v=zZEUXtXnKmE) |
| 14 | `penance-brand-elementalist` | Penance Brand Ignite | Witch / Elementalist | caster | Penance Brand | Maxroll **A**; 56–68k views | [Maxroll](https://maxroll.gg/poe/build-guides/penance-brand-ignite-elementalist) · [YouTube](https://www.youtube.com/watch?v=CqWuqGUPQak) |
| 15 | `ice-nova-elementalist` | Ice Nova | Witch / Elementalist | caster | Ice Nova | Maxroll **A**; 61k views | [Maxroll](https://maxroll.gg/poe/build-guides/ice-nova-elementalist-league-starter) · [YouTube](https://www.youtube.com/watch?v=WcKrpMgiTrg) |

**Already covered, so excluded.** Righteous Fire, Lightning Arrow, Cyclone,
Boneshatter, Flicker Strike, Arc, Summon Raging Spirit, Summon Skeletons, Raise
Spectre, Animate Weapon (melee), Absolution, Ice Shot, Winter Orb, Essence Drain
and Summon Stone Golem. Near-duplicate variants also excluded: Cyclone of
Tumult, Flicker Strike Berserker, Forged Frostbearer and Wretched Defiler
Spectres, and Poison SRS. Poison Ranged Animate Weapons is the transfigured
`Animate Weapon of Ranged Arms`, not the melee Animate Weapon already shipped.

**Suggested batches.** Three batches of five keep the pipeline runs reviewable:

1. **Caster/minion first** — Storm Burst, Poison Ranged Animate Weapons,
   Penance Brand, Ice Nova, Smite. These reuse the existing `spell` and `caster`
   profiles.
2. **SSF/attack** — Static Strike, Incinerate, Lightning Tendrils, Toxic Rain,
   Venom Gyre. Toxic Rain reuses `bow`; Venom Gyre needs a claw profile or a
   reviewed filter override.
3. **Special gear** — Facebreaker Luminary, Scorching Ray, Ethereal Knives,
   Divine Retribution, Tornado Shot. Facebreaker is unarmed (no weapon slot) and
   needs a reviewed profile/override; Scorching Ray can reuse `rf`; Tornado Shot
   reuses `bow`.

**Per-seed acceptance.** Each new seed must:

- validate against `src/presets/schema/build.schema.json`;
- carry `season: covens` and a changelog entry whose newest season matches;
- pass all six checkpoints, or stay a draft with its failures named;
- publish a `maps-red` PoB code and a matching `.pob` asset;
- add six must-pass calibration observations (96 → 186 across 31 builds) and
  re-run the must-fail set;
- not duplicate a `(main skill, ascendancy)` pair (D26);
- carry generated 16:9 header art and per-step pobb.in pastes at release.

`src/builds/config/league.yaml` and the repo's `covens.yaml` snapshot are from
league start. The live poe.ninja top ten has moved since (RF 4.8%, EK 4.1%,
Cyclone of Tumult 3.5%, Void Shockwave 3.1%, Scorching Ray 3.1%); refreshing the
snapshot with `npm run meta:add` is a separate task and is not required to start
these seeds.

## 17. Links

- Builder: https://lordgreg.github.io/buildpath/
- Builds: https://lordgreg.github.io/buildpath/builds.html
- Loot simulator: …/demo.html
- Behaviour audit: …/tests.html
- Changelog: …/changelog.html
