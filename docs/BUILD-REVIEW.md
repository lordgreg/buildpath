# Build review brief: audit, questions, and a proven better version

> A review ends with one of four verdicts — **works**, **works with caveats**,
> **does not work** or **not enough evidence** — and either a patch or a proof.

**Status:** active · **Audience:** external build reviewer · **Scope:** one build
per review · **Companion docs:** [PLAN-BUILDS.md](../PLAN-BUILDS.md),
[docs/STEPS.md](./STEPS.md), [AGENTS.md](../AGENTS.md)

## How to use this document

- **Reviewer:** read §1–§3, run the baseline in §4/P0, and ask any Part B
  questions immediately. Do not save them for the end. If you cannot run the
  pinned oracle, review from the committed JSON and ask for measurements (B4.5);
  the review is still valid, but say which evidence you generated yourself.
- **Maintainer:** answer Part B in the question log, not in chat. Do not
  pre-empt findings; the reviewer must be able to reach their own conclusion.
- **Anyone reviewing the review:** the acceptance checklist is §6.6. A review
  without a verdict, a proof and a better version is incomplete.

**Output:** one Markdown report (`.md`) in the structure of §6. No PDFs, slide
decks, chat summaries or screenshot-only reports.

**Quick start**

1. Fill the answer-sheet header (§6.1) and the review target (§2).
2. Run the baseline (§3.1) and paste the output into P0.
3. Ask B1 now; fill the question log (§5.5) as answers arrive.
4. Work P0 → P9 (Part A), asking Part B questions when the repo cannot answer.
5. Build the better version package (§6.5) and run the acceptance checklist.
6. Hand over the Markdown report and the patch together.

---

## 0. The job

Answer one question in a way we can reproduce:

> Given the pinned patch, the published budgets and the build's stated intent,
> what is the best legal change to this build — and how do you know?

A review is not "looks good" and it is not a list of preferences. It is:

1. a reproduced baseline;
2. an audit of every input — tree, gems, gear, config, steps, outputs;
3. findings with evidence;
4. a realistic verdict — works, works with caveats, does not work, or not enough
   evidence;
5. a better version, or a proof that no legal improvement exists within scope;
6. answers to the questions only we can answer.

The reviewer may ask us anything (Part B). The review is a conversation, not an
exam. A good question is as valuable as a good finding.

The document has three parts: **Part A** is the audit of the build, **Part B** is
the reviewer's questions to us, and **Part C** is the deliverable. Run A and B in
parallel; do not wait until the audit is finished to ask what the build is for.

### Candour clause

Say what you actually think, and say why.

- If the build **will not work at all**, say so: "No, this will not work as
  written, because X." That is a valid review. Do not soften a failure into a
  suggestion.
- If the build works but **leveling is slow**, say where it is slow, how slow it
  feels, and what causes it (mana, damage, resists, a gem swap, a link, a boss).
- If the build **will fail later**, name the point: act, map tier, boss, league
  mechanic, map mod, budget or skill level.
- If you see a **potential improvement**, report it even if you could not measure
  it yet — including a different passive-tree path. Label it a **candidate**,
  explain the mechanism, and say what test would prove it.
- Never suppress a finding because it is negative, and never present a candidate
  as proven. The distinction is the value of the review.

---

## 1. Ground rules

### 1.1 Evidence over opinion

| Tier | Evidence | Counts as proof? |
|---|---|---|
| E0 | Preference: "feels slow", "looks weak" | No |
| E1 | Static repo proof: gem required level, node id, base type, affix tier, schema | For legality and data claims |
| E2 | PoB oracle measurement at the same checkpoint, config and enemy level | Yes, for numbers |
| E3 | Gate result + margin, and calibration status | Yes, for "is it good enough" |
| E4 | In-game evidence: recording, log, screenshot with timestamp, level and content | Yes, for feel/uptime |

A finding that **asserts a change is better** needs **E2 or E3**. A legality claim
needs **E1**. A feel or uptime claim needs **E4**, or it must be labelled as an
assumption. "It felt fine" is not an answer to a question about mana, deaths or
uptime; give the event, the level and what happened.

A **candidate improvement** may rest on E1 reasoning when the measurement is not
available yet. Label it `candidate`, explain the mechanism, and give the test
that would prove it. Do not suppress a candidate because it is unmeasured; do not
present it as proven.

A **negative verdict** ("this will not work") needs at least one concrete failure:
an illegal build, a failed gate, a cost or sourcing wall, or a playtest failure.
Name which one. A reviewer who says "no" without a failure is guessing.

If the failure is **predicted** rather than observed, label it `predicted`, give
the mechanism, and say what would confirm it. A prediction with a mechanism is
useful; a prediction without one is a guess.

### 1.2 What must not change

- No browser network calls, secrets or analytics.
- `src/core` must not import React.
- Filters are ASCII-only and deterministic; base types come from the registry;
  a unique item name never appears in a `BaseType` condition.
- YAML is the source. `src/generated/*.json` and `public/builds/*.pob` are
  generated; never hand-edit them.
- Step ids are stable; aliases keep old links working. Moving a trigger must not
  rename a URL, a PoB paste key or a calibration key (D32).
- Patch, PoB ref and tree version stay pinned. No pathofexile.com API calls.
- Do not re-litigate a recorded decision (`PLAN-BUILDS.md` D1–D37) without a new
  decision that says why.

### 1.3 What is in scope

Everything in the seed and its supporting config is fair game:

- `src/builds/<id>.yaml` — tree targets, keystones, steps, gems, flasks,
  uniques, config, ascendancy order, pantheon, guide;
- `src/builds/gear/{budgets,profiles,affixes,eldritch}.yaml` — the gear the
  build is measured with;
- `src/builds/config/{checkpoints,gem-sources,step-plans,pantheon}.yaml` — the
  levels, points, budgets and advice;
- `scripts/builds/gates.yaml` — the floors the build is judged against;
- the compiled JSON, published PoB code, filter and guide.

Changing the main skill or ascendancy is allowed **only** as an explicit
"replace the build" recommendation. It is not a quiet swap. The reviewer may also
conclude "change nothing" if they can prove it, or "do not ship this build" if
the failure is real. Both are valid outcomes.

---

## 2. Review target

This block is filled for the current review. Replace it when retargeting; the
protocol does not depend on the example values.

| Field | Value |
|---|---|
| Build | Arc Elementalist (`arc-elementalist`) |
| Class / ascendancy / family | Witch / Elementalist / caster |
| Main skill | Arc |
| Patch | 3.30.0 |
| PoB ref / tree version | v2.69.0 / `3_30` |
| Patch hash | `c7a4330850eb17ef` |
| Gates hash / calibration | `083f87c7258f` / verified |
| Seed | `src/builds/arc-elementalist.yaml` |
| Compiled JSON | `src/generated/builds/arc-elementalist.json` |
| Published PoB code | `public/builds/arc-elementalist.pob` (maps-red, D24) |
| Gate profile | `standard` |
| Medal / ratings | S+ · tankiness 10 · single target 10 · clear 9 · cost 9 |
| Status | verified |

These values are a snapshot for the current review. If they differ from the
committed JSON at the review commit, the JSON wins and the target block is stale.

### 2.1 Steps and checkpoints

| Step | Level | Band | Points | Budget | Link cap | Measured |
|---|---|---|---|---|---|---|
| `leveling-1-12` | 12 | `until-12` | 12 | `starting` | 3 | yes |
| `leveling-12-28` | 28 | `until-28` | 30 | `early` | 4 | yes |
| `leveling-28-38` | 38 | `until-28` | 42 (override) | `early` | 4 | yes |
| `leveling-38-68` | 68 | `until-68` | 78 | `ssf-start` | 5 | yes |
| `maps-white` | 80 | `maps-early` | 90 | `ssf-start` | 5 | yes |
| `maps-red` | 90 | `maps-red` | 105 | `ssf-week1` | 6 | yes |
| `endgame-pinnacle` | 96 | `pinnacle` | 113 | `trade` | 6 | yes |

### 2.2 Baseline measurements

Measured by the PoB oracle. The floor is the value in `scripts/builds/gates.yaml`
for the `standard` profile.

| Step | DPS / floor | Life / floor | EHP / floor | Max hit / floor | Chaos res / floor |
|---|---|---|---|---|---|
| `leveling-1-12` | 62 / 25 | 344 / 250 | 712 / — | 919 / — | -60 / — |
| `leveling-12-28` | 800 / 350 | 1,091 / 700 | 1,876 / — | 1,914 / — | -25 / — |
| `leveling-28-38` | 2,823 / 350 | 1,291 / 700 | 2,300 / — | 2,251 / — | -25 / — |
| `leveling-38-68` | 168,858 / 8,000 | 3,113 / 2,000 | 12,121 / — | 5,572 / 2,000 | 15 / — |
| `maps-white` | 231,388 / 20,000 | 3,774 / 3,000 | 23,040 / 8,000 | 8,201 / 4,000 | 23 / — |
| `maps-red` | 540,857 / 80,000 | 5,396 / 4,500 | 35,202 / 12,000 | 11,336 / 6,000 | 23 / — |
| `endgame-pinnacle` | 676,178 / 125,000 | 6,813 / 5,000 | 53,353 / 14,000 | 14,019 / 7,000 | 79 / 75 |

All seven checkpoints pass. The margins are large; one of the reviewer's jobs is
to ask whether the floors are the right floors, and whether the build is
overbuilt for the advertised budget.

---

## 3. Evidence pack

Read the chain in one direction: **seed → compile → verify → JSON / PoB code →
page and filter**. The reviewer should never trust a derived number without
walking that chain to the artifact that produced it.

| Path | What it proves |
|---|---|
| `src/builds/<id>.yaml` | Editable truth: intent, steps, gems, flasks, tree targets, uniques, config, guide |
| `src/generated/builds/<id>.json` | Compiled truth: `steps`, `tree.checkpoints`, `gates.*.tree` (node ids, edges, notables, jewels), `gates.*.gear`, `gates.*.metrics`, `pob.byStep`, `stepPlans`, `gemInfo` |
| `public/builds/<id>.pob` | The published PoB code (maps-red) |
| `src/builds/gear/budgets.yaml` | Tier, rarity, ilvl, links, jewels and slot constraints per budget |
| `src/builds/gear/profiles.yaml` | Bases and affixes each archetype wears inside a budget |
| `src/builds/gear/affixes.yaml` / `eldritch.yaml` | Legal affix ids, tiers and eldritch implicits |
| `src/builds/config/checkpoints.yaml` | Level, points, labs, budget, gem cap and enemy level per checkpoint |
| `scripts/builds/gates.yaml` | The floors, plus the `dad` profile |
| `src/builds/config/gem-sources.yaml` | Quest/vendor/Siosa/Divine Font routes |
| `src/generated/gem-levels.json` | Required level, colour, tags and source per gem |
| `src/builds/config/step-plans.yaml` | `goals`, `lookFor`, `crafting` per root band |
| `src/builds/config/pantheon.yaml` | Pantheon choices and notes |
| `src/builds/config/ascendancies-full.yaml` | Ascendancy ladder and node ids |
| `src/generated/patch-facts.json` | Pinned patch, PoB ref, tree/gem/patch hashes |
| `src/generated/builds/calibration.json` | Must-pass, must-fail and unique-ablation evidence |
| `scripts/builds/pob/verify.lua` | The oracle that produces the numbers |
| `src/core/builds/steps.ts`, `docs/STEPS.md` | The step invariants the compiler enforces |

### 3.1 Reproduce the baseline

```bash
# 1. Compile the YAML seeds into committed JSON.
npm run builds:build

# 2. Prove this build against the pinned PoB.
POB_DIR=.cache/pob/src npm run builds:verify -- --build=arc-elementalist

# 3. Check that every published code loads in PoB with the same counts.
POB_DIR=.cache/pob/src npm run builds:check

# 4. Site gates.
npm test
npm run typecheck
```

`builds:verify --build=<id>` rewrites that build's JSON and published `.pob`
only. It does not touch the other builds. Run it on a clean worktree and commit
nothing while reviewing.

The seed's `config` block is global to every checkpoint. If you change it to make
one number look better, you are measuring a different build; declare the change
and re-measure every step, not just the one you care about.

Only run these when the review actually changes their inputs:

```bash
# Gates changed, or a seed's measured result changed: rebuild the evidence.
POB_DIR=.cache/pob/src npm run builds:calibrate

# Pinned PoB checkout or gem data changed.
npm run builds:patch-facts

# Release only: creates public pobb.in pastes.
npm run builds:publish-pobs
```

### 3.2 What a reviewer gets wrong first

- Reading the prose instead of `gates.*.metrics`.
- Comparing a red-map number to a pinnacle floor.
- Measuring with a different PoB config or enemy level.
- Assuming a leveling step is measured with endgame gems.
- Treating an editorial step as measured.
- Changing `src/generated/*.json` by hand and calling it a proof.

---

## 4. Part A — audit the build

Each pass lists the questions the reviewer must answer and what a sufficient
answer contains. "Reject if" is the shortcut: if the answer has one of those
properties, it is not evidence.

### P0 — Reproduce the baseline

| # | Question | The answer must prove |
|---|---|---|
| P0.1 | Which commit are you reviewing, and is the worktree clean? | `git rev-parse HEAD` and `git status --short`; any local change named |
| P0.2 | Does `npm run builds:build` pass? | Tail of the output; no schema or registry failure |
| P0.3 | Does `builds:verify --build=<id>` pass every checkpoint? | Per-step pass/fail, not just the final `verified` line |
| P0.4 | Does `builds:check` load the published code with the same counts? | Command output and any mismatch |
| P0.5 | Do patch, PoB ref, tree version and patch hash match? | The values in `patch-facts.json`, build JSON and your toolchain |
| P0.6 | Is calibration green and is its gates hash current? | `calibration.json` fields `verified`, `gatesHash`, `pobRef` |
| P0.7 | What local toolchain did you use? | OS, Node, LuaJIT, `lua-utf8`, PoB path and tag; if unavailable, say so and list the measurements you requested |
| P0.8 | What baseline numbers are you using? | A table copied from `gates.*.metrics`, not from prose |

**A sufficient answer:** the commands, their output, and a baseline table that
matches the committed JSON exactly. **Reject if:** the reviewer quotes a number
from the guide, a forum, a video or their own PoB without saying which build and
config produced it.

### P1 — Identity, intent and constraints

| # | Question | The answer must prove |
|---|---|---|
| P1.1 | What is the damage source at every step, and does the listed `main` actually provide it? | The main link, the scaling stat and any step where a secondary skill carries |
| P1.2 | Does `ascendancyOrder` match the labs reachable at each checkpoint? | The four lab levels, the points assumed, and the first-lab power spike |
| P1.3 | Do the ratings and medal follow from the measurements? | Which rating is machine-derived, which is editorial, and the comparison build |
| P1.4 | Are the pros and cons conditional claims stated as conditions? | Each claim mapped to the config input, gear or rotation that makes it true |
| P1.5 | Is the family/gear profile/filter consistent with the build? | The profile used, the slots it fills, and any item the filter would hide |
| P1.6 | Which mechanics are patch-sensitive, and is the build on the right side of them? | `patch-facts.json`, the PoB tag, and the gem/tree data that changed |
| P1.7 | Is the build actually league-start / SSF / HC viable as claimed? | Budget, sourcing, death profile and any caveat the guide omits |
| P1.8 | Are the required uniques required, and can a rare replace them at the same budget? | The unique's parsed mods, the rare alternative, and the measured delta |

**A sufficient answer:** a short identity table plus the one or two claims that
do not survive the evidence. **Reject if:** the answer treats the build's own
summary as the source of truth.

### P2 — Passive skill tree

| # | Question | The answer must prove |
|---|---|---|
| P2.1 | What is the full allocation at every checkpoint, and does the node count equal the point budget? | Node ids from `tree.checkpoints`, count vs `points`, and any unexplained extra or missing point |
| P2.2 | What does every notable and keystone buy, and what is its marginal value? | Effect, the gem/gear interaction it enables, and a measured or point-for-point comparison |
| P2.3 | Is every travel node on the shortest legal path? | Travel vs notable split, the longest run, the alternative path, points saved and what they cost |
| P2.4 | Are the attribute nodes exactly enough, or are they over-invested? | Required strength/dexterity/intelligence vs allocated, plus gear and bench-craft alternatives |
| P2.5 | Is the life/ES/armour investment proportional to the gate margin? | Total pool, per-point return, and the checkpoint with the thinnest margin |
| P2.6 | Are the resistance nodes still needed after the gear budget? | Raw resistance from gear, the act penalty, overcap, and what else those points could buy |
| P2.7 | Are the damage notables the best per point for this skill? | At least two alternatives measured at equal points, not just "lightning is good" |
| P2.8 | Is every keystone actually active at the checkpoint it is measured at? | The condition (crit recently, low life, no ES, etc.), uptime, and the PoB input that models it |
| P2.9 | Do the jewel sockets beat the notables they replace? | Jewel count, base, affixes, ilvl legality, and value per socket vs 2–3 passives |
| P2.10 | Is the ascendancy order the best order at each lab? | The opportunity cost of each node at labs 1–4, not just the endgame set |
| P2.11 | What does a proposed tree change cost to respec, and is it leveling-compatible? | Regret orbs, level at which the points exist, and whether the leveling path still works |
| P2.12 | Is the low-level tree legal and reachable at that level? | No future-only nodes, path from the class start, points equal to the checkpoint |
| P2.13 | Does the tree silently assume gear, sockets, colours, attributes or a unique? | Each dependency named, and what happens when the budget does not supply it |
| P2.14 | Does the pruning order take the points a player would actually take first? | The order of allocation, the first 20 points, and any dead point at an early checkpoint |

**A sufficient answer:** node ids, point counts, the alternative path and a
measured delta. **Reject if:** the answer is a screenshot of the tree with no
ids, no point count and no comparison.

### P3 — Gems and links, per step

| # | Question | The answer must prove |
|---|---|---|
| P3.1 | Why each support in the main link, and what does it multiply? | The support's effect, the alternative, and the measured or calculated delta |
| P3.2 | Is every gem legal at that step's level, attributes and colours? | Required level, attribute requirement, socket colours and link size |
| P3.3 | Is the link size honest for the budget? | What is cut at 4-link and 5-link, and whether the cut link is still functional |
| P3.4 | Can the character pay for the rotation? | Mana cost, unreserved mana, regen/leech, flask coverage, and the no-regen case |
| P3.5 | What is each utility, aura, curse, exposure and guard skill doing? | Its job, uptime, overlap with another source, and what is redundant |
| P3.6 | Does the trigger setup actually trigger? | CWDT levels, thresholds, order, cooldown and the damage taken to fire it |
| P3.7 | Which gem levels, quality and corruption are assumed at each step? | The exact level/quality and whether it is buyable at that budget |
| P3.8 | Can the player obtain every gem at that step? | Quest, vendor, Siosa or Divine Font route, class restriction and act |
| P3.9 | Are alternate/awakened/empowered gems worth their cost? | Gain per cost, and whether the budget allows them |
| P3.10 | Is there enough socket space, and are the colours realistic? | Total sockets, gems, colours, and any slot that cannot hold its group |
| P3.11 | Is the build using the single-target link it claims? | Whether the measured DPS uses the boss link or the clear link |
| P3.12 | For minion/totem/trap builds, is the count and feeding modelled? | Number of bodies, supports, uptime and how PoB scales the DPS |
| P3.13 | Do the gem swaps between steps match the triggers? | No gem before its level, no swap without a trigger, `watch` accurate |
| P3.14 | Is any gem doing nothing at that checkpoint? | Aura without reservation, curse without a hit, support without a valid link |

**A sufficient answer:** a per-step table with slot, group, gem levels and the
reason for each support. **Reject if:** the answer changes the six-link but
never says what it cut or what the four-link looks like.

### P4 — Gear, flasks, jewels and uniques

| # | Question | The answer must prove |
|---|---|---|
| P4.1 | What is in every slot at every budget, and is it legal? | Base, affixes, tier, ilvl, rarity and links from `gates.*.gear` and the gear YAML |
| P4.2 | Does the resistance math actually cap, including chaos at pinnacle? | Raw resistance, act penalty, overcap, and the slot that supplies it |
| P4.3 | Which slot gives the least life/defence per currency? | Life/ES/armour/evasion contribution and max-hit impact per slot |
| P4.4 | Are the attributes exactly enough? | Requirements vs gear/tree, and whether an attribute affix is wasted |
| P4.5 | Is the weapon/offhand the best base and mod set at this budget? | Base, mods, unique vs rare, and the breakpoint the choice serves |
| P4.6 | Is each unique required, affordable and obtainable? | Parsed mods, roll range, SSF source, trade price and the rare fallback |
| P4.7 | Are the flasks legal, sustainable and correctly swapped? | Prefix/suffix, uptime, charge generation, immunity and the step where it changes |
| P4.8 | Are the jewels legal and worth their sockets? | Count, base, affixes, ilvl, and the notable they replace |
| P4.9 | Are eldritch implicits, bench crafts, quality and catalysts assumed? | What is assumed, what it costs, and whether the budget includes it |
| P4.10 | Could a real player get this gear at this step? | SSF drop route or trade price, and the fallback when they cannot |
| P4.11 | What does the gear assume from the tree and gems? | Sockets, colours, attributes, resistances and unique interactions |
| P4.12 | What is the upgrade order, and what is the marginal gain per currency? | First purchase, second purchase, and what not to buy |
| P4.13 | Does the filter cover every slot and base the build wears? | Slot overrides, base list, ASCII output and deterministic emit |
| P4.14 | Is any slot empty or silently assumed at a checkpoint? | Empty offhand, missing jewel, an unused flask slot and what the measurement used |

**A sufficient answer:** a slot-by-slot table with the budget and the weakest
slot named. **Reject if:** the answer says "get better rares" without a tier, a
slot and a measured gain.

### P5 — Config, numbers and uptime

| # | Question | The answer must prove |
|---|---|---|
| P5.1 | What is the exact PoB config, and where does each input come from? | The seven (or N) inputs, and whether each is self-applied, gear, ascendancy, flask or party |
| P5.2 | Is the enemy level right for the checkpoint? | `enemyLevel` from `checkpoints.yaml` and the PoB setting |
| P5.3 | What uptime is assumed for every buff and debuff? | Shock, exposure, curse, Convergence, charges, stationary, flasks and any other condition |
| P5.4 | Are the debuffs self-applied and actually in the rotation? | The skill that applies each, the order, and the cost of a missed application |
| P5.5 | Is the DPS source and count correct? | Player/minion/totem, one body or all bodies, single target or clear |
| P5.6 | What kills this build, and does EHP/max hit model it? | Physical vs elemental vs chaos, one-shot vs dot, and the weakest layer |
| P5.7 | Is chaos resistance capped where it matters? | Pinnacle value, source, overcap and the map mods that break it |
| P5.8 | Is the character functional at zero mana? | Unreserved mana, cost per cast, regen and the no-regen/no-leech case |
| P5.9 | What happens under -max res, elemental weakness and penetration? | The margin above 75 and the gear/pantheon that absorbs it |
| P5.10 | How much slack does each gate have? | Measured vs floor per metric, and the metric closest to failing |
| P5.11 | What happens if each buff is turned off? | A leave-one-out table: no Convergence, no charges, no flasks, no shock |
| P5.12 | Are PoB, tree and gem data the same version? | `pobRef`, `treeVersion`, `patchHash`, and any known PoB approximation |
| P5.13 | Which headline numbers are windows and which are sustained? | A label on each number, and the sustained/worst-case value |

**A sufficient answer:** the config block, the leave-one-out table and a clear
statement of which numbers are windows. **Reject if:** the answer says "PoB says
so" without naming the config, the enemy level and the buffs.

### P6 — Leveling and step transitions

| # | Question | The answer must prove |
|---|---|---|
| P6.1 | Do the step levels ascend, and are the triggers legal? | `from` equals the previous level, ids unique, no gap or overlap |
| P6.2 | Is every gem usable at its step's level? | `gem-levels.json` required level and the step's `level` |
| P6.3 | Can the player actually get every gem at that step? | Quest/vendor/Siosa/Divine Font route, act and class |
| P6.4 | Is there an act wall in life, mana, resists or damage? | Metrics at each checkpoint and the first step that feels bad |
| P6.5 | Does the lab timing match the ascendancy points? | Labs reachable at the level, and the first-lab power |
| P6.6 | Are bandit and pantheon choices right for the leveling path? | The choice, the alternative and when it matters |
| P6.7 | What does each transition cost? | Respec points, regrets, gear swaps, socket colours and gem levels |
| P6.8 | Is the leveling gear realistic for what drops? | Base, affixes and ilvl vs the budget at that level |
| P6.9 | Are `goals`, `lookFor` and `crafting` actionable and consistent? | No contradiction with the gems/gear, and a concrete next action |
| P6.10 | Is every number-bearing step measured? | `measure: true` or a `reason`; no editorial step silently showing a number |
| P6.11 | What is the playtest evidence behind each grade? | What was played, deaths, pain points and the grade justification |

**A sufficient answer:** a transition table with level, trigger, gem changes,
respec cost and the first bad step. **Reject if:** the answer only checks the
endgame step and assumes the rest follows.

### P7 — Outputs: PoB code, guide, filter, links

| # | Question | The answer must prove |
|---|---|---|
| P7.1 | Does the published PoB code load with the same tree, items and gems as the JSON? | `builds:check` output and the step the code represents (maps-red, D24) |
| P7.2 | Does every guide number resolve from the build JSON? | Placeholders resolve; no hardcoded number; prose matches the measurement |
| P7.3 | Does the filter cover the build and obey the hard rules? | Slots/bases, ASCII-only, no unique name in `BaseType`, deterministic order |
| P7.4 | Do old step links still resolve? | `stepAliases` and a sample old URL |
| P7.5 | Do tests, build and typecheck pass? | `npm test`, `npm run build`, `npm run typecheck` |
| P7.6 | Did anything add a network call, secret or analytics? | A diff review of the changed files |
| P7.7 | Do changelog and release notes match the change? | Version, `src/changelog.ts`, `CHANGELOG.md` if releasing |
| P7.8 | Is the build stale or outside the league window? | Staleness rules and the patch age |

**A sufficient answer:** the commands, their output and a list of any output
that changed without being intended. **Reject if:** the review changes a seed
but never regenerates or checks the published code.

### P8 — Realistic verdict and failure modes

| # | Question | The answer must prove |
|---|---|---|
| P8.1 | If a player follows the guide exactly, does the build work at all? | A verdict: works / works with caveats / does not work / not enough evidence |
| P8.2 | What is the first thing that breaks? | The step, act, map tier or boss, and the exact failure (mana, damage, resists, links, cost, attributes) |
| P8.3 | Is leveling slow? Where, how slow, and why? | The slowest step, the cause, and the level range; "slow" is a finding, not an insult |
| P8.4 | What content will it fail, and at what investment? | The content, the budget tier and the reason; "everything" is not an answer |
| P8.5 | What is the worst realistic case? | No unique, no flask, no 6-link, bad colours, SSF, a bad map mod, a patch change |
| P8.6 | Is the build only good in PoB? | Which uptime assumptions collapse in real play, and what the number becomes |
| P8.7 | Would you recommend it to the target player? | A yes/no, the player profile, and the one thing that decides it |
| P8.8 | What is the single reason not to play it? | The strongest counter-argument, stated fairly |
| P8.9 | What would change the verdict? | The smallest fix, budget change or patch that moves it to "works" |
| P8.10 | Does it fail a gate if one plausible condition is removed? | The condition, the metric, the resulting number and the floor |
| P8.11 | Is the advertised identity misleading? | "League starter" with a 6-link and two uniques, "tanky" with no chaos cap, "budget" with a chase item |
| P8.12 | What is the honest one-paragraph verdict? | No hedging, no marketing; the conclusion the findings support |

**A sufficient answer:** a verdict label, the first failure, the leveling pace and
the conditions that would change the answer. **Reject if:** every finding is a
polite suggestion and the build's actual failure is never named.

### P9 — Improvement hypotheses

| # | Question | The answer must prove |
|---|---|---|
| P9.1 | What is the single highest-impact change? | The measured delta, the checkpoint it helps and the cost |
| P9.2 | What is the cheapest meaningful change? | Gain per currency or per point, and the effort |
| P9.3 | What is the best change at the current budget, and one tier up? | Two answers, not one; the budget boundary named |
| P9.4 | What is the best passive-tree path change, even if small? | The alternative path by node id, points saved or spent, what it gives up and why it is better |
| P9.5 | What is the best gem, gear or config change? | The exact slot/link/input, the replacement, the mechanism and the measured or candidate delta |
| P9.6 | What should be removed? | Points, gems, gear or mechanics that do not earn their slot |
| P9.7 | What did you try that did not work? | Negative results with numbers; this is evidence, not failure |
| P9.8 | Does the change preserve the build's identity and constraints? | Main skill, ascendancy, cost, button count and leveling path |
| P9.9 | What is the expected delta, and how confident are you? | Measurement, confidence and the assumptions behind it |
| P9.10 | What could regress? | The checkpoint most likely to fail and the metric closest to its floor |
| P9.11 | Is it SSF-viable, and what does it cost in trade? | Sourcing route, price range and fallback |
| P9.12 | Is it worth the respec and leveling complexity? | Regrets, new gem levels, socket colours and the player's time |
| P9.13 | What should be done after this change? | The next two changes, in order, with reasons |
| P9.14 | What would make you abandon the change? | A falsification test, not a feeling |

**A sufficient answer:** a ranked shortlist with a measured winner, the rejected
alternatives, and any candidate you could not measure but still recommend — each
with a reason and a test. **Reject if:** the proposal is "swap X for Y" with no
number, no cost, no reason and no regression check.

---

## 5. Part B — questions to the build owners

The reviewer may ask us anything about the build, including the blunt version:
"Did you have any issues while playing?" Some questions cannot be answered from
the repo: what it felt like to play, what was tried, what the budget really was,
and what "better" means. Ask those early. A review that guesses at intent will
optimise the wrong thing.

### 5.1 Kickoff

Before the audit, hold a 30-minute kickoff (or fill in the written equivalent).
It is not a presentation; it is the reviewer's chance to calibrate.

- Confirm the review target in §2 and the commit range.
- Fill B1 (intent, constraints, what "better" means).
- Skim B2 and B5: what was played, what was tried, what is unknown.
- Agree what evidence the reviewer can generate themselves and what they need
  from us (oracle runs, recordings, character imports).
- Agree the deadline and who signs off.
- End with the first question log and the first three audit passes the reviewer
  will run.

If there is no call, the owner answers B1–B8 in writing in the question log. The
reviewer should not start measuring before B1 is answered; a build measured
against the wrong goal will produce confident, useless findings.

### 5.2 How to ask

- Put each question in the **question log** (§5.5), one per row. Do not bundle
  three questions into one.
- State the decision the answer unblocks. If no decision depends on it, it is
  curiosity, not a review question.
- Ask in the review PR/issue, not in a DM, so the answer is part of the record.
- Prefix the question with its ID (`B2.3`) and use the same ID in findings that
  depend on it.
- Ask early. A question asked after the report is written is a dispute, not a
  question.
- The reviewer may ask follow-ups; the owner may answer "unknown".
- If an answer contradicts a finding, the reviewer must either revise the finding
  or show the artifact that disproves the answer.

### 5.3 Question bank

Use these as written, or adapt them. The "why it matters" column is the reason
the question is worth the owner's time.

#### B1 — Intent and constraints

| # | Question | Why it matters |
|---|---|---|
| B1.1 | What is this build for: league start, mid-league, bossing, mapping, HC, SSF, trade, a specific budget? | A build optimised for the wrong content is not improved by more DPS |
| B1.2 | What does "better" mean for this review? Rank tankiness, single target, clear, cost and leveling smoothness. | The reviewer needs a tie-breaker before measuring |
| B1.3 | What must not change: main skill, ascendancy, uniques, budget, button count, leveling path, identity? | Prevents a "better" build that nobody asked for |
| B1.4 | What content is explicitly out of scope? | Avoids findings about content the build does not claim |
| B1.5 | Which decisions are already settled, and where are they recorded? | Do not re-litigate D1–D37 or a signed guide decision |
| B1.6 | What is the target budget and time-to-gear? | A change that is only good with infinite currency is not a change |
| B1.7 | Who signs off, and what is the deadline? | A review that cannot be adopted is a document, not a review |
| B1.8 | If the review concludes the build does not work, what should happen to it: fix, replace or pull? | Makes the honest answer actionable instead of diplomatic |

#### B2 — Playtest experience

| # | Question | Why it matters |
|---|---|---|
| B2.1 | Did you level this build yourself? From 1 to what level, and which acts were rough? | The leveling steps are a claim; only a player knows the wall |
| B2.2 | Which bosses, maps and league mechanics did you complete? How many deaths, and to what? | Death causes are the missing half of EHP |
| B2.3 | Did you hit mana, reservation, socket, colour or attribute problems? At which level? | PoB can show a cost; only play shows the failure |
| B2.4 | Did the rotation feel clunky? Which buttons do you actually press, and which do you skip? | A rotation the player skips is not in the build |
| B2.5 | Did the build meet the advertised numbers in game? Where did it fall short? | The gap between PoB and play is a finding |
| B2.6 | Did you see any PoB-vs-game discrepancy, bug or unexpected interaction? | Some mechanics are approximated by the oracle |
| B2.7 | What did you change while playing that is not in the guide? | The guide may be behind the real build |
| B2.8 | How does it play at low APM, on a controller, or on bad ping? | "Works for me" is not a difficulty setting |
| B2.9 | What loot or filter problems did you hit? | A build the filter hides is a build that cannot be played |
| B2.10 | What should a new player know before starting? | The one thing the guide buries |
| B2.11 | Can you share a recording of a representative map and a pinnacle attempt? | Feel and uptime claims need E4 evidence; a recording is the cheapest form |
| B2.12 | Can we do a live playtest or screenshare? | The fastest way to settle "is this clunk real" without guessing |

#### B3 — Measurement and assumptions

| # | Question | Why it matters |
|---|---|---|
| B3.1 | Which config inputs are self-applied, and which are assumed? What uptime do you use? | The headline number is only as honest as its buffs |
| B3.2 | Which numbers are windows and which are sustained? What is the worst case with buffs off? | A window number can hide a failed floor |
| B3.3 | Why this enemy level, budget and gem cap for this checkpoint? | The comparison is only valid at the same target |
| B3.4 | What changed since the last measurement, and which number moved? | Prevents re-reporting an old result |
| B3.5 | What is not measured: editorial steps, unverified interactions, in-game-only behaviour? | Names the unknowns instead of hiding them |
| B3.6 | What would falsify the headline number? | A number nobody can falsify is marketing |

#### B4 — Data and pipeline

| # | Question | Why it matters |
|---|---|---|
| B4.1 | Which patch, PoB ref and tree version is the build on? Is any data stale? | A build on last patch's data is not a build |
| B4.2 | What was calibrated, and what was not? | Calibration is evidence about the gates, not the build |
| B4.3 | What changed since the last review? Give the commit range. | The reviewer should not re-audit unchanged code |
| B4.4 | Are there known drafts, failures or staleness flags? | A known failure is not a discovery |
| B4.5 | Can you run this variant through the pinned oracle and return the JSON and PoB code? | Not every reviewer can run the toolchain; a measurement request is still a question |
| B4.6 | Can you provide the raw gate output for this checkpoint? | The reviewer needs the full metric set, not the headline number |

#### B5 — Prior attempts and unknowns

| # | Question | Why it matters |
|---|---|---|
| B5.1 | What alternatives did you test and reject? Why? | Stops the reviewer repeating your work |
| B5.2 | What did you not test because of time, cost or missing data? | The reviewer can pick up the highest-value gap |
| B5.3 | Which assumptions are unverified? | Names the risk the reviewer should probe |
| B5.4 | What would you like the reviewer to try first? | Uses the reviewer's time where it is worth most |

#### B6 — Cost and sourcing

| # | Question | Why it matters |
|---|---|---|
| B6.1 | What is the SSF route for each required unique and gem? | "Cheap unique" is not a route |
| B6.2 | What is the trade price range, and what is the budget? | A build that costs 20 div is not the same build |
| B6.3 | What is the upgrade order, and what is the marginal gain per currency? | The best change may be the cheapest one |
| B6.4 | What can a player substitute without losing the build? | The difference between a guide and a shopping list |

#### B7 — Change tolerance and acceptance

| # | Question | Why it matters |
|---|---|---|
| B7.1 | Can the main skill, ascendancy or gear budget change? | Sets the search space |
| B7.2 | What must stay stable: step ids, aliases, PoB keys, calibration keys, URLs? | A better build that breaks links is not shippable |
| B7.3 | What evidence would make you adopt a change? | The reviewer can aim at the right bar |
| B7.4 | What would make you reject a finding even if the numbers improve? | Cost, playstyle, identity and maintenance are real constraints |

#### B8 — Open unknowns

| # | Question | Why it matters |
|---|---|---|
| B8.1 | What do you not know about this build? | The most useful answer in the whole review |
| B8.2 | Where do you want the reviewer to focus? | Directs effort to the weak part |
| B8.3 | What is the biggest risk you see? | A second opinion on the risk is cheap |
| B8.4 | What failure are you most afraid of? | Names the thing the reviewer should try hardest to break |
| B8.5 | What is the weakest step in the guide, in your own opinion? | Owners usually know; saying it saves a week |

### 5.4 Answer standard

A useful answer is specific, sourced and honest about uncertainty.

- **State the kind of answer:** fact, estimate or unknown.
- **Cite the artifact:** file and line, commit, PoB code, command output,
  recording timestamp, character level and content.
- **If unknown, say so** and say what would resolve it. Do not fill the gap with
  a plausible story.
- **If the answer changes a decision,** cite the decision (`D…`) or the signed
  guide section.
- **If the answer contradicts a finding,** name the finding and the artifact.
- **If the answer is about feel,** give the event: level, content, what happened,
  how often, and what you changed.
- **Do not answer "it felt fine"** to a question about mana, deaths, uptime or
  clunk. "Fine" is not reproducible.
- **Answer in the log within two working days** where possible. If an answer is
  blocked, mark it `blocked` and say what is missing.

### 5.5 Question log

Copy this table into the review issue/PR. One row per question.

| ID | Asked by | Date | Question | Decision it unblocks | Answer | Evidence | Confidence | Status | Findings affected |
|---|---|---|---|---|---|---|---|---|---|
| B2.3 | reviewer | 2026-11-27 | Did you hit mana problems while leveling? | Whether the mana flask is a hard requirement | Yes, at 38–68 on single target; rotation spends ~X mana/s vs ~Y regen; no-regen maps fail mid-rotation | Recording 00:42, character sheet, PoB mana cost | high | answered | F-02 |

**Status values:** `open`, `answered`, `needs-evidence`, `disputed`, `closed`.
A disputed answer is not a dead end: the reviewer must show the artifact that
contradicts it, and the owner must either update the answer or record why not.

For a measurement request (B4.5), include the commit, build id, checkpoint, the
exact variant and the config. We return the diff, the regenerated build JSON,
the PoB code and the gate report. A variant without a checkpoint is not a
measurement.

### 5.6 Playtest log

If the owner has playtest notes, attach them. If not, ask for this table rather
than a paragraph. It is the E4 evidence the repo cannot generate.

| Date | Patch | Level | Content | Result | Deaths and cause | Damage feel | Mana | Defence | Notes / recording |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |

---

## 6. Part C — the deliverable

**Output format: Markdown.** The deliverable is one `.md` report plus the
patch/diff. Chat summaries, PDFs, slide decks and screenshot-only reports are not
accepted. Use tables for the verdict, baseline and findings; fenced code blocks
for commands and diffs; links for recordings and screenshots. A number that
exists only in an image does not exist.

Name the report `build-review-<build-id>-<YYYY-MM-DD>.md` and keep the section
order below so two reviews can be compared.

### 6.1 Answer sheet header

Every review starts with this block.

| Field | Value |
|---|---|
| Reviewer |  |
| Date |  |
| Commit |  |
| Build id |  |
| Patch / PoB ref / tree |  |
| Patch hash / gates hash |  |
| Calibration verified |  |
| Time spent |  |
| Tools (PoB, LuaJIT, OS) |  |
| Output format | Markdown (`.md`) |
| Conflicts of interest |  |
| Scope / out of scope |  |

### 6.2 Verdict

Put the verdict before the detail. It is the first thing a maintainer reads.

| Question | Answer |
|---|---|
| Overall verdict | works / works with caveats / does not work / not enough evidence |
| Will it work at all? | yes / no / only after the fix in F-xx |
| First thing that breaks | step, act, map tier or boss, and why |
| Leveling pace | fast / acceptable / slow at `<step>` because `<cause>` |
| Would you recommend it? | yes / no / only to `<player profile>` |
| What would change the verdict? | the smallest fix, budget change or patch |

Write one paragraph of honest prose after the table. No hedging, no marketing,
no "it depends" without saying what it depends on.

### 6.3 Baseline table

Copy the measurements from `gates.*.metrics`, not from the guide. Include the
floor and the margin. Mark every number as measured or derived.

### 6.4 Findings

The summary table is mandatory:

| ID | Area | Severity | Type | Claim | Evidence tier | Confidence | Proposed change | Expected delta | Effort / cost | Risk | Verification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| F-01 |  | blocker / major / minor / nit | legality / failure-risk / measurement / improvement / candidate / question |  | E0–E4 | low / med / high |  |  |  |  |  |

Severity is about consequence, not confidence:

- **blocker** — illegal, unplayable, a failed gate, a build that will not work
  as written, or a published claim that is false. The build cannot ship as-is.
- **major** — a measurable improvement, a real risk, or a slow leveling stretch
  at the stated budget.
- **minor** — a small efficiency, cost or clarity gain.
- **nit** — wording, naming or structure; no number moves.

Then one detail block per finding:

```markdown
### F-03 — <title>

**Status:** proposed / proven / predicted / rejected / candidate / needs-answer
**Type:** legality | failure-risk | measurement | improvement | candidate | question
**Area:** tree | gems | gear | config | steps | output
**Severity:** blocker | major | minor | nit

**Observed:** what the build does now, with the artifact.
**Why it matters:** the consequence for a player, a gate or a claim.
**Evidence:** file:line, node ids, gem names, PoB field, command output.
**Baseline measurement:** the number at the same checkpoint and config.
**Proposed change:** one change, stated as a diff.
**Expected result:** the measured or calculated delta.
**Verification:** the command and the result that proves the change.
**Falsification:** the result that would prove this finding wrong.
**If this is a candidate:** the mechanism, and the test that would prove it.
**Risks / costs / dependencies:** respec, currency, leveling, patch risk.
**Open questions:** B-x, if the finding depends on an owner answer.
```

A finding without a verification command is an opinion. A finding that changes
three things at once cannot attribute the delta; split it.

### 6.5 The better version package

The reviewer must deliver a package, not a paragraph. It contains:

1. **A patch** — `git diff` of the seed YAML and any config/gear/step-plan
   change. Do not hand-edit generated JSON.
2. **Regenerated evidence** — `npm run builds:build` and
   `POB_DIR=.cache/pob/src npm run builds:verify -- --build=<id>` output.
3. **A before/after table** — every checkpoint, same config, same enemy level,
   same budget band. Include gate margins, not just the headline number.
4. **A tree diff** — nodes added and removed with ids and names, point delta,
   respec cost.
5. **A gem diff** — per step and slot: before, after, required level, quality,
   and the acquisition route.
6. **A gear diff** — per slot: base, affixes, tier/ilvl, cost, SSF route and
   fallback.
7. **A leveling diff** — trigger changes, new gem levels, socket colours and the
   first level at which the new version works.
8. **An output diff** — filter, guide text, step aliases and PoB code that must
   move with the change.
9. **A cost delta** — currency, time and respec, in both SSF and trade terms.
10. **A confidence statement** — what is measured, what is assumed, and what
    would falsify the result.
11. **The rejected alternatives** — with numbers, so the winner is a comparison,
    not an assertion.
12. **The no-change / no-ship proof** — if no change wins, show the alternatives
    you tested and why they lost. If the build should not ship, show the failure
    that blocks it. "Change nothing" and "do not ship" are valid verdicts, but
    they still need proof.

### 6.6 Acceptance checklist

A review is complete only when every line is true.

- [ ] The report is one Markdown file with the required section order.
- [ ] Tables and fenced code blocks are used; no required number is only in an image.
- [ ] Evidence links (recordings, screenshots) are linked from the Markdown.
- [ ] The baseline was reproduced from the stated commit.
- [ ] The verdict says whether the build works, works with caveats, or does not work.
- [ ] The first failure is named, with the step, act, map tier or boss.
- [ ] Slow leveling is called slow, with the step and the cause.
- [ ] Every checkpoint is listed with pass/fail and margin.
- [ ] The patch, PoB ref, tree version and hashes match.
- [ ] Calibration is green and current.
- [ ] The tree was audited node by node at every checkpoint, including alternative paths.
- [ ] Every gem was checked for level, attributes, colours and acquisition.
- [ ] Every gear slot was checked against its budget and the resist/attribute math.
- [ ] The config and every uptime assumption are stated.
- [ ] The numbers are labelled measured, derived or estimated.
- [ ] The leveling path and transition costs are audited.
- [ ] The published PoB code loads with the same counts.
- [ ] The filter, guide and aliases still work.
- [ ] Every finding has evidence, a verification command and a falsification test.
- [ ] Candidate improvements, including tree paths, are listed with their reasons.
- [ ] The better version has a patch, a before/after table and a cost delta.
- [ ] The negative results are reported.
- [ ] The review names what it did not test.
- [ ] No unrelated change is bundled in.
- [ ] A maintainer can adopt or reject the change without guessing.

### 6.7 What a rejection looks like

The review is rejected if any of these is true:

- the baseline was not reproduced;
- the report is not Markdown, or required numbers/evidence exist only in screenshots or chat;
- the verdict is missing, or says "works" while the findings name a blocker;
- a known failure is softened into a suggestion instead of being named;
- a candidate tree path or gem/gear change is omitted because it was not measured;
- a number is compared across different checkpoints or configs;
- a finding has no artifact, no command or no falsification test;
- the "better version" is a different build with no acknowledgement;
- the change breaks a step id, alias, PoB key or calibration key;
- the filter is no longer ASCII, deterministic or base-type-safe;
- the review adds a network call, secret or analytics;
- the review edits generated JSON by hand;
- the review hides a failed checkpoint or a negative result;
- the review cannot say what it did not test.

### 6.8 After the review

- We triage every finding: **accept**, **reject** or **needs-evidence**.
- An accepted finding becomes a PR with the reviewer's patch and evidence, or a
  counter-patch with a measured reason.
- A rejected finding gets a recorded reason, not silence. "We disagree because
  X" is a valid outcome.
- A negative verdict is not buried. If the build does not work, it is fixed,
  replaced or pulled, and the reason is recorded.
- The review is linked from the build's PR or changelog so the next reviewer can
  see what was already tried.

---

## 7. Worked examples

These are illustrative. They show the depth expected, not findings against the
current build.

### 7.1 A legality finding

> **F-01 — The level-28 step lists a gem the character cannot hold.**
>
> **Observed:** `leveling-12-28` lists `<Gem>` in the body link. The step is
> measured at level 28.
>
> **Evidence:** `src/generated/gem-levels.json` gives `<Gem>` a required level
> of 31; `src/builds/arc-elementalist.yaml` lists it under `leveling-12-28`.
>
> **Why it matters:** the step is illegal in game; the measurement is of a
> character the player cannot build.
>
> **Proposed change:** move `<Gem>` to `leveling-28-38`; use `<Gem2>` at 28.
>
> **Verification:** `npm run builds:build` rejects the old step; `builds:verify
> --build=arc-elementalist` passes with the new link at 28 and 38.
>
> **Falsification:** if `gem-levels.json` says the gem is usable at 28, the
> finding is wrong.
>
> **Open questions:** B3.3 (why this gem cap was chosen).

A good answer names the artifact, the level, the consequence and the command.
It does not say "this looks wrong".

### 7.2 A playtest answer

> **B2.3 — Did you hit mana problems while leveling?**
>
> **Answer:** Yes, at levels 38–68 on single target. The main link spends about
> X mana per second against Y regeneration, so the mana flask covers roughly Z
> seconds. On a no-regen map the next cast fails. I did not see the problem on
> clear because the pack dies before the bar empties.
>
> **Evidence:** recording at 00:42 (level 54, no-regen map); character sheet
> mana regen; PoB `manaCost` and `manaUnreserved` at `leveling-38-68`.
>
> **Confidence:** high for the level range; medium for the exact seconds.
>
> **Consequence for the review:** treat the mana flask as a hard requirement,
> not a preference. Any proposal that removes it needs a measured sustain fix.
>
> **Findings affected:** F-02.

A good answer gives the level, the content, the failure, the evidence and what
it means for the review. It does not say "mana was fine".

### 7.3 A negative verdict

> **Verdict: does not work as written.**
>
> **Why:** the level-28 step lists `<Gem>` (required level 31), and the level-38
> step assumes a 5-link while the `early` budget caps links at 4. A player
> following the guide hits the first wall at 28 and the second at 38.
>
> **First failure:** level 28; the gem cannot be equipped.
> **Second failure:** level 38; the body armour has four sockets but the guide
> shows five.
> **Leveling pace:** acceptable to 28; the 28–38 stretch is slow because the
> main link loses its damage support before the replacement is available.
> **What would change the verdict:** move `<Gem>` to 38 and either lower the
> link or raise the budget; re-measure both steps.
> **Confidence:** high — both are static legality facts (E1).

A negative verdict is not rude. It is the most useful thing a reviewer can
return, provided it names the failure and the fix.

### 7.4 A candidate tree path

> **Candidate (not yet measured):** the level-90 tree takes `<A>` → `<B>` → `<C>`
> (5 travel nodes). The alternative `<A>` → `<D>` → `<C>` is 3 travel nodes and
> reaches the same notable, at the cost of `<X>` life.
>
> **Why it may be better:** the 2 saved points buy `<notable>` or a jewel socket;
> the lost life is above the maps-red margin (5,396 measured vs 4,500 floor).
>
> **What would prove it:** reallocate the 2 points, run maps-red and pinnacle,
> and compare DPS, EHP and max hit. If EHP stays above the floor and DPS rises,
> it is a proven improvement. If not, it is a rejected candidate.
>
> **Status:** candidate — E1 reasoning, E2 pending.

The reviewer should report this even if they cannot run the measurement. A
candidate with a mechanism and a test is useful; a silent observation is not.

---

## Appendix A — file and field map

| Need | Look at |
|---|---|
| What the build claims | `src/builds/<id>.yaml` (`summary`, `pros`, `cons`, `ratings`, `guide`) |
| What the build measures | `src/generated/builds/<id>.json` (`gates.*.metrics`) |
| Tree at a checkpoint | `tree.checkpoints`, `gates.*.tree.nodes`, `.edges`, `.notables`, `.jewels` |
| Gear at a checkpoint | `gates.*.gear`; budgets in `src/builds/gear/budgets.yaml` |
| Gem availability | `src/generated/gem-levels.json`, `src/builds/config/gem-sources.yaml` |
| Gem plan per step | `steps` and `stepPlans` in the compiled JSON; source in `src/builds/<id>.yaml` |
| Gate floors | `scripts/builds/gates.yaml` |
| Point/lab/budget per checkpoint | `src/builds/config/checkpoints.yaml` |
| Published PoB code | `public/builds/<id>.pob`; per-step codes in `pob.byStep` |
| Calibration evidence | `src/generated/builds/calibration.json` |
| Patch identity | `src/generated/patch-facts.json`; `pipeline` in the build JSON |
| Step invariants | `src/core/builds/steps.ts`, `docs/STEPS.md` |

## Appendix B — command reference

```bash
# Compile YAML -> JSON.
npm run builds:build

# Prove one build (the normal review loop).
POB_DIR=.cache/pob/src npm run builds:verify -- --build=<id>

# Prove every build (release / CI).
POB_DIR=.cache/pob/src npm run builds:verify

# Record the no-flask validation (all flasks disabled).
npm run builds:no-flasks

# Check published PoB codes load with the same counts.
POB_DIR=.cache/pob/src npm run builds:check

# Rebuild the gate calibration evidence (gates or measured seeds changed).
POB_DIR=.cache/pob/src npm run builds:calibrate

# Refresh the pinned patch/tree/gem facts (only when the PoB checkout changes).
npm run builds:patch-facts

# Site gates.
npm test
npm run typecheck
npm run build
```

`POB_DIR` points at the pinned PoB checkout's `src` directory. The local build
also needs LuaJIT and `lua-utf8`; state the versions in the answer sheet.

## Appendix C — gate thresholds (`standard` profile)

| Checkpoint | Resists | Life | EHP | Max hit | DPS | Chaos res |
|---|---|---|---|---|---|---|
| `until-12` | no | 250 | — | — | 25 | — |
| `until-28` | no | 700 | — | — | 350 | — |
| `until-68` | yes | 2,000 | — | 2,000 | 8,000 | — |
| `maps-early` | yes | 3,000 | 8,000 | 4,000 | 20,000 | — |
| `maps-red` | yes | 4,500 | 12,000 | 6,000 | 80,000 | — |
| `pinnacle` | yes | 5,000 | 14,000 | 7,000 | 125,000 | 75 |

The `dad` profile lowers the damage floors and some defensive floors; it is for
deliberately low-APM utility builds and is labelled on the page. A review that
moves a build between profiles must say so.

The verifier sets exactly two config inputs: `enemyLevel` (13 at `until-12`,
28 at `until-28`, 68 at `until-68`, 75 at `maps-early`, 83 at `maps-red`, 84 at
`pinnacle`) and `enemyEvasion` from the pinned PoB monster table. It does not
set Trauma, Rage or Endurance Charge values; those stay at PoB defaults. The
standard gate report has every listed flask active. `builds:no-flasks` records
the same trees with all flasks disabled in
`src/generated/builds/validation/no-flasks.json`. It is a validation report,
not a second gate: a step that needs a flask bonus is visible there.
Boneshatter Juggernaut clears all seven steps without flasks.

## Appendix D — project terms

| Term | Meaning |
|---|---|
| **Seed** | The hand-written YAML build definition in `src/builds/` |
| **Build JSON** | The compiled, committed data the site reads |
| **Checkpoint** | A level/budget/enemy-level combination the build is measured at |
| **Step** | An authored leveling/maps/endgame sub-step with a stable id |
| **Band** | The reviewed checkpoint band a step inherits its points and budget from |
| **Gate** | The published floor for life, EHP, max hit, DPS, resists or chaos res |
| **Calibration** | The must-pass / must-fail test of the gates themselves |
| **Gates hash** | Hash of the threshold set; a different hash means the evidence is stale |
| **Oracle** | Headless PoB, the only source of measured build numbers |
| **Patch facts** | The pinned patch, PoB ref, tree hash and gem hash |
| **PoB code** | The paste string published for the maps-red step (D24) |
| **Verdict** | Works / works with caveats / does not work / not enough evidence |
| **Candidate** | A reasoned improvement that has not been measured yet; it must name its test |
| **Predicted** | A failure or gain reasoned from mechanics, not yet measured; it must name the mechanism |
| **EHP** | Effective life pool; not the same as maximum life |
| **Max hit** | The largest physical hit the build can survive |
