# Steps: three roots and sub-steps

Reference for the step model (D32–D37, [PLAN-BUILDS.md](../PLAN-BUILDS.md) §9.3).

**Status:** PR 5 of 5, shipped in 0.79.0. All 21 seeds declare `steps`;
`leveling` survives only as the pre-migration shape the schema still accepts.
An unmigrated seed's six checkpoints are projected onto Leveling, Maps and
Endgame (`stepView`), so the navigation never changed while the data moved.

Measured steps carry the band they inherit (`bandFor`): a level-38 step is
measured on the level-28 budget rather than an invented one, which under-points
rather than over-points. A step that needs its real level budget says so with
`points` (see [Points](#points)); Boneshatter's 28-38 step does, so its tree is
not a copy of the level-28 one. Calibration keeps one observation per band per
build, so a second step in the same band does not grow the report.

## What the page shows

- **Step picker** — three labelled groups. Each step reads `Lv 13–28` inside
  Leveling and `Lv 90` elsewhere, with `not measured` on an editorial step.
- **What changes here** — the section that used to be "Leveling this step". It
  prints the step's `watch` line for a migrated seed, or the derived leveling
  plan for one that still has brackets. One section, one job.
- **Numbers on an editorial step** — the nearest measured step at or before it,
  labelled in the gate report (`this step is not measured · showing Lv 13–28`),
  so a reader is never shown a number that belongs to a different step silently.
- **Old links** — `step=until-28` resolves through `stepAliases`; an id that no
  longer exists falls back to the first measured step rather than a blank page.

## Why

The six checkpoint ids did nine jobs: guide step, URL `step=`, gate key, tree
checkpoint, `pob.byStep` key, calibration observation key, step-plan key,
catalogue strip and filter mapping. `leveling.brackets` and `leveling.swaps`
described the same journey two more times, in different vocabularies.

The visible result was gaps. A bracket said "until 28" and listed Boneshatter, a
gem a level-13 character cannot hold; the switch that actually mattered landed
on a boundary and had nowhere to be written, so it became prose under "Leveling
this step". Meanwhile level 69–79 had no plan of its own because one checkpoint
was level 68 and the next was 80.

`steps` makes the journey one thing: three roots, each an ordered list of
sub-steps, each with a level and a reason it starts.

## Shape

```yaml
steps:
  leveling:
    default: { budget: early, gemQuality: 0, gemLevelCap: 20 }
    sub:
      - id: leveling-1-12
        level: 12
        main: Cleave
        gems:
          - slot: Body Armour
            gems: [Cleave, Added Fire Damage, Faster Attacks]
        flasks: [...]
        watch: "Cleave carries acts 1-2; keep a mana flask, buy no rare axe yet."
        measure: true

      - id: leveling-12-28
        level: 28
        main: Sunder
        trigger: { from: 12, skill: Sunder }
        watch: "Sunder hits harder than Cleave. Stay here until 28."
        measure: true

      - id: leveling-28-38
        level: 38
        main: Sunder
        trigger: { from: 28 }
        watch: "Stay on Sunder until Brutality; Boneshatter starts in the next step."
        measure: true

      - id: leveling-38-68
        level: 68
        main: Boneshatter
        trigger: { from: 38, skill: Boneshatter }
        watch: "Brutality replaces Added Fire Damage; Pulverise is the fifth link at 68."
        measure: true

  maps:
    default: { budget: ssf-start }
    sub:
      - id: maps-white
        level: 80
        main: Boneshatter
        trigger: { from: 68 }
        watch: "5-link clears white maps; start the 6-link."
        measure: true
      - id: maps-red
        level: 90
        main: Boneshatter
        trigger: { from: 80, budget: ssf-week1 }
        measure: true

  endgame:
    sub:
      - id: endgame-pinnacle
        level: 96
        main: Boneshatter
        trigger: { from: 90 }
        measure: true
```

### `level` and `from`

`level` is the level the step is **read and measured at**. The step covers up to
the next sub-step's level minus one. `from` is computed by the compiler: the
previous step's level plus one, or 1 for the first leveling step. Gaps are
therefore impossible, and there is no `until`.

### Triggers

| Kind | Meaning | Validated against |
|---|---|---|
| `skill` | the main skill takes over | `gem-levels.json`: usable at `level` |
| `support` | a support swap changes the link | same |
| `link` | the step assumes a socket count | 3–6 |
| `jewel` | a passive-tree jewel is added | the tree view's label (PR 2) |
| `slot` | a gear slot swap changes the build | `ItemSlot` |
| `budget` | a gear budget band starts | `gear/budgets.yaml` |

`from` is required on every trigger and must equal the previous step's level. A
trigger may name **no** kind: that is a level boundary, where the guide has
something to say and nothing else changed.

Only the first leveling step has no trigger — it opens the character.

### Measurement

- `measure: true` gives the step a PoB checkpoint and a gate report.
- Anything else needs `reason`, and the page renders the step without numbers.
- R2 therefore reads "a gate report for every measured sub-step", not "for
  every step".

### Points

A measured step takes `points` from the checkpoint band at or below its level
(`src/builds/config/checkpoints.yaml`, D30). That keeps two steps inside one
band from claiming different budgets, but a step well inside a band would draw
the same tree as the step before it. A step that must show its own points sets
`points` explicitly, reviewed like the band table:

```yaml
- id: leveling-28-38
  level: 38
  points: 42   # 37 level points + quest points by act 5
  measure: true
```

The gate thresholds still come from the band (`until-28` here), so the
override moves the tree, not the floor. Re-run `builds:verify -- --build=<id>`
and republish that build's pastes: the tree changes the PoB code.

### Grade

`grade: S | A | B | C | D` is authored, not measured: how the stretch plays.
S is a power spike or a very smooth stretch, D is the slog the guide warns
about. It is shown on the step picker and in "What changes here" and is a
guide opinion, so it is excluded from the mechanics hash: changing a grade
never invalidates a gate report.

```yaml
- id: leveling-28-38
  level: 38
  main: Sunder
  grade: D   # the rough stretch: no Brutality yet
  measure: true
```

### Advice

- `watch` is authored inline: what changes *here*. Optional — a step that only
  continues the same setup says nothing, and the step plan carries the gear
  advice. Numbers only through `{{steps.<id>.metrics.*}}`, and only on a
  measured step.
- `lookFor` and `crafting` stay in `src/builds/config/step-plans.yaml`, keyed by
  checkpoint band (`until-12`, `until-28`, `until-68`, `maps-early`,
  `maps-red`, `pinnacle`), so eight minion builds do not repeat themselves. A
  profile may also key a plan by step id; the step-id key wins when two steps
  share a band and need different advice.

## Rules the compiler enforces

`src/core/builds/steps.ts`, `resolveSteps`:

1. each declared root has at least one sub-step;
2. ids are unique build-wide; levels ascend inside a root and across roots;
3. only the first leveling step may omit a trigger;
4. `trigger.from` equals the previous step's level;
5. a trigger names at most one kind;
6. `main` and every listed gem are usable at `level`;
7. an unmeasured step has a `reason`; a `budget` names a real budget;
8. an alias may not shadow a step id or another alias.

## Old links

A sub-step lists the pre-refactor ids it replaces:

```yaml
- id: leveling-12-28
  aliases: [until-28]
```

`resolveStepAlias(stepAliases, 'until-28')` returns `leveling-12-28`, and returns
an unknown id unchanged. The map stays until 1.0.

## Cost

Measured on this repo: one build's measured steps take **14.5 s** through the
real PoB oracle, and CI drives the same scripts against the pinned PoB, so a
local run and a CI run agree. `builds:verify` over 21 builds is therefore a
~5-minute job with a 45-minute ceiling; three times the measured steps still
fits. Calibration samples one measured step per root band per build (D37), so it
does not grow with the step count.

## Migrating a seed (PR 4, done)

The mechanical mapping used for the catalogue:

| Old bracket | Step read at | Alias |
|---|---|---|
| `until: 12` | `leveling-1-12` (12) | `until-12` |
| `until: 28` | `leveling-12-28` (28) | `until-28` |
| `until: 68` | `leveling-38-68` (68) | `until-68` |
| `bracketFor(80)` | `maps-white` (80) | `maps-early` |
| `bracketFor(90)` | `maps-red` (90) | — |
| `bracketFor(96)` | `endgame-pinnacle` (96) | `pinnacle` |

The step keeps the bracket's gem groups and flasks, so the gate measures what it
measured before; only the id, the alias and the band lookup are new. A swap's
own `note` becomes the `watch` line of the step whose level covers it: the
migration invents no prose.

Boneshatter is the reference build and the one place the split is authored
rather than mechanical. Its `until-28` bracket listed Boneshatter to a level-13
reader, and the switch that mattered lived in `swaps`. It is now
`leveling-1-12` (Cleave), `leveling-12-28` (Sunder, measured at 28),
`leveling-28-38` (Sunder, four links, CWDT and the curse at 38) and
`leveling-38-68` (Boneshatter from 39, Brutality and the fifth link at 68).
The 28-38 step is its own measurement, which is what makes the playtest's "the
switch is a pain" a number instead of a feeling, and the step grade marks it D.
Brutality is already usable at 38; the 39 swap is the guide's step boundary, not
a gem-level restriction. The two Sunder steps get their own step-plan keys so
neither inherits the other's advice.
