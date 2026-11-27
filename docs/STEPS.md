# Steps: three roots and sub-steps

Reference for the step model (D32–D37, [PLAN-BUILDS.md](../PLAN-BUILDS.md) §9.3).

**Status:** PR 2 of 5. Schema, resolver, alias table and the pipeline's measured
steps are in; the page still reads `leveling.brackets`, so a migrated seed must
keep `leveling` until PR 3 lands.

Measured steps carry the band they inherit (`bandFor`): a level-38 step is
measured on the level-28 budget rather than an invented one, which under-points
rather than over-points. Calibration keeps one observation per band per build,
so a second step in the same band does not grow the report.

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
        main: Boneshatter
        trigger: { from: 28, skill: Boneshatter }
        watch: "Boneshatter now, four links only. If it feels bad, stay on Sunder two more levels."
        measure: true

      - id: leveling-38-68
        level: 68
        main: Boneshatter
        trigger: { from: 38, support: Brutality }
        watch: "Added Fire Damage out, Brutality in, Pulverise as the fifth link."
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

### Advice

- `watch` is authored inline: what changes *here*. Numbers only through
  `{{steps.<id>.metrics.*}}`, and only on a measured step.
- `lookFor` and `crafting` stay in `src/builds/config/step-plans.yaml`, keyed by
  root band (`leveling-early`, `leveling-late`, `maps-early`, `maps-red`,
  `endgame`), so eight minion builds do not repeat themselves.

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

Measured on this repo: one build's six checkpoints take **14.5 s** through the
real PoB oracle, and CI drives the same scripts against the pinned PoB, so a
local run and a CI run agree. `builds:verify` over 21 builds is therefore a
~5-minute job with a 45-minute ceiling; three times the measured steps still
fits. Calibration samples one measured step per root band per build (D37), so it
does not grow with the step count.

## Migrating a seed (PR 4)

1. Add `steps` and keep `leveling` until PR 3 lands, because the page still reads
   it.
2. Split the old brackets where the *change* happens, not where the bracket
   ended: a gem swap, a link count, a jewel, a slot or a budget.
3. Give every step a `level` and a `watch` line.
4. Mark the steps PoB can measure; put `reason` on the rest.
5. Add `aliases` for each old checkpoint id it replaces.
6. `npm run builds:build` — the resolver names the rule you broke.

Boneshatter is the reference build: its `until-28` bracket listed Boneshatter to
a level-13 reader, and its real switch lived in `swaps`. The migrated form is
`leveling-1-12` (Cleave), `leveling-12-28` (Sunder), `leveling-28-38`
(Boneshatter, four links) and `leveling-38-68` (Brutality, fifth link, CWDT).
