# Changelog

All notable changes to BuildPath. The same data powers the in-site changelog.

## 0.62.0 — 2026-11-26

Six builds, prose that cites its sources.

- The catalogue now has **six verified builds**: Cyclone Juggernaut, Ice Shot Deadeye and Summon Raging Spirit Necromancer join the original three. Every one passes all six checkpoints; the calibration must-pass set is now 36 observations plus the ten must-fail cases.
- Every build carries four prose sections. Numbers exist only as `{{path|format}}` placeholders from a closed format set; a raw digit outside the allowed tokens fails the build. The page renders the resolved text, the declared facts hash and the sign-off.
- A signed summary is required to publish. The remaining sections may be unsigned `auto-retry` drafts, which the page labels. If a declared fact moves after sign-off, the section becomes `stale` instead of rendering new numbers over old prose.
- R4 is enforced with the reviewed league window: the first 72 hours publish nothing. R1–R3 are covered by the guide, gate-report and PoB-code tests.
- Each new build has generated 16:9 header art and a working pobb.in paste with Gear, Gems and Tree.
- 619 tests.

## 0.61.0 — 2026-11-26

Chips, trees and ascendancy details.

- The catalogue cards now describe the build instead of repeating the same six checkpoint dots: **SSF**, **Melee / Ranged / Minion**, **HC-ready** only where the measured defensive thresholds are met, and a defining trait (Tanky, Fast clear, Minion army). The full checkpoint pass count stays as a small line.
- The pobb.in paste now shows the passive tree. The published XML carries the standard pathofexile.com tree URL that importers use to render it, so Gear, Gems and Tree all appear. New pastes were published; the link map and code hashes are committed.
- The boxes under the ascendancy circle now show the point order and the notable's actual effect lines, so the circle tooltip is optional rather than required.
- The release publisher is documented as a release step (`builds:publish-pobs`), not part of nightly verification.
- 606 tests. Gates, trees and measured numbers are unchanged; calibration is still green.

## 0.60.0 — 2026-11-26

The full ascendancy and a build link that opens.

- Inventory geometry is fixed: gloves and boots sit beside the belt, weapon and offhand boxes are 80% of their old width, and rings/amulet are compact. The five flasks stay narrow and tall.
- Ascendancy is now the **full graph**: every notable and every path passive is visible, with the chosen notables lit and their lab badges. The data lives in `ascendancies-full.yaml`. Lab timing stays under the graph; the separate labyrinth section is gone.
- The gate report is a compact **Metric / Measured / Gate** table instead of a large spread-out card. It shows the actual thresholds each checkpoint was evaluated against.
- Gem rows now carry a quality recommendation: `20q` when capping quality is worth it, `20q?` when it is optional, `no 20q` when quality does nothing. The tooltip explains the quality effect.
- There is a dedicated **Filter** section on every build, linking the build-specific filter builder at leveling, early-map, endgame and bossing settings.
- The broken pob.cool prefill is gone. pob.cool only accepts pobb.in URLs, and its current importer does not resolve the metadata pobb.in returns. The release publisher now creates a real pobb.in paste per build (`builds:publish-pobs`), the page links that paste directly, and the code copy remains for desktop PoB.
- 603 tests. Gates, trees and measured numbers are unchanged; calibration is still green.

## 0.59.0 — 2026-11-26

The build page reads like a character sheet.

- The inventory tooltip works again, and the sheet is readable without hovering: each slot shows its mods inline, with a faint code-drawn glyph behind the empty space. Helmet and body share one width, gloves/boots match the rings, and the five flasks are narrower and taller.
- Jewels are now a control, not just a caption. Clicking a jewel under the tree zooms and centres on its socket and pulses the marker; the view maths is tested alongside pan and zoom.
- Ascendancy is a path of circles, one per point, with the normal/cruel/merciless/eternal timing written under each notable. The separate labyrinth section is gone.
- Pantheon is a wheel with the selected major and minor gods lit and the full effect table below it. Bandit is its own section below Pantheon.
- Every build has a weighted pros/cons table directly under its summary — at least five of each, with weight 1–3 shown as stronger or quieter colour.
- Gem tooltips now explain the gem: RePoE's description where it exists, the level-20 effect line for supports, and the mechanical tags.
- The PoB link opens prefilled. The publisher writes the same code as a plain `.pob` asset, and the page sends `pob.cool/poe1/#build=<raw GitHub URL>` so the measured build opens in one click; copying the code still works offline.
- Each build has generated 16:9 header art — original key art, no game assets — under the title.
- 601 tests. Gates, trees and measured numbers are unchanged from 0.58.0; calibration is still green (18 must-pass, 10 must-fail, 1 ablation probe).

## 0.58.0 — 2026-11-26

The gear sheet and the endgame craft.

- The summoner's shield is back. It had two causes: the caster profile never named an offhand for the early budgets, so the `Clarity`/`Convocation` slots referenced gear that was never synthesised, and the page looked for a slot called `Shield` while PoB stores a shield or quiver in `Weapon 2`. The early Witch now wears a `Twig Spirit Shield` at level 12 and a `Yew Spirit Shield` at 28, and a test checks that every gem group has the gear slot it names.
- The gear panel is drawn as an inventory sheet: weapon and offhand tall on the sides, helmet and amulet on top, body in the middle, rings beside it, gloves/belt/boots below, and five flasks underneath. It is a CSS panel with dark texture and gold-edged slots — similar in feel to the game, not a copy of its art. Jewels are listed separately with their `Jewel 1…n` labels, and endgame armour shows its Eldritch implicits in the tooltip.
- Required jewels are pinned to the passive tree. The oracle returns the socket each jewel was placed in, the tree draws a blue diamond there, and the tooltip and legend name the jewel. A test keeps the pin count equal to the socketed jewels.
- Endgame armour now carries measured **Eldritch Ember and Ichor implicits**: one of each per armour slot, tier 4 at red maps and tier 6 at pinnacle. The oracle counts parsed implicits, so a typo fails the build. With the new implicits a 4-link was clearing the old red-map floor, so the calibration test did its job: the floor moved from 80k to 120k and all three must-pass seeds still clear it.
- Labs are guide milestones, not extra checkpoints. The normal lab unlocks around level 33, so `until-28` now assumes **zero** labs instead of two ascendancy points the game cannot have granted. The page shows normal/cruel/merciless/eternal timing and the notables each lab grants. The six-checkpoint ladder is unchanged.
- One header now spans the filter builder, builds catalogue, build page, simulator, audit and changelog: product name, active nav and version, sticky and responsive.
- The endgame numbers moved with the craft: red-map DPS is now 141.5k for the Deadeye, 276.1k for the Juggernaut and 214.3k for the Summoner; pinnacle is 261.1k, 524.5k and 413.1k. All 18 checkpoint observations still pass.
- 594 tests.

## 0.57.0 — 2026-11-26

The gates prove themselves.

- The passive tree is now one build, not six searches. The pipeline plans the **endgame tree once**, then derives every guide step by pruning the deepest leaves. A test proves each step is a subset of the endgame tree, connected from the class start and in a valid allocation order. Required jewel sockets are protected while any other leaf can be dropped, so the jewellery the budget names is still socketed.
- **Bounded repair** exists. A failing checkpoint can swap one leaf for one adjacent node the endgame plan already bought, with a seeded candidate order, at most 200 Path of Building evaluations, and a hard `nodeDelta` bound of ten nodes and eight percent. The record on every gate says how many evaluations ran and which nodes moved; the page shows the seed tree next to the repaired one. The three seeds pass without repair, so their record is an honest zero rather than a missing field.
- The gates are **calibrated in both directions**. Eighteen must-pass observations (three seeds at six checkpoints, re-geared by the same synthesiser) and ten must-fail mutations — uncapped resistances, no life, a 4-link, an act-10 tree at T16, a start-only tree, no main skill, no supports, no defensive layer, uncapped chaos at pinnacle, starting gear at pinnacle — now run as `npm run builds:calibrate`. The report is committed and hashed over the thresholds; changing a floor without re-running calibration drops every build back to uncalibrated.
- **Ablation** resolves a core unique from Path of Building's own data, then removes it and measures the rare equivalent. The calibration probe is Ryslatha's Coil on the Juggernaut: the unique is worth 10.7% of red-map damage. No P2 seed declares a core unique, so this is evidence for the machinery, not a page claim.
- The catalogue lists only **verified** builds, groups them by family and ascendancy, and shows how many were calibrated. A failed or stale build is still reachable by its own link, where its named failures are shown, but it does not appear in the list.
- The build pipeline is one implementation again: gear synthesis, gem levels, the oracle call, item parsing and code encoding live in `scripts/builds/pipeline.mjs`, shared by the verifier and the calibration runner. A fixture cannot be measured by a different pipeline from a published seed.
- The derived trees moved the measured numbers — the Deadeye now has a 104-node red-map tree at 120.3k DPS — and all 18 checkpoint observations still pass. No gate was weakened to get there.
- 588 tests.

## 0.56.0 — 2026-11-26

The first bow build, and the numbers it corrected.

- The catalogue has a second build: **Lightning Arrow Deadeye**, a bow/ranger build with no required uniques. It passes every step, from a level-12 bow to pinnacle bosses (110.9k single-target at red maps, 204k at pinnacle), and it is the first build the pipeline proves that is not a minion one.
- Gear is now split into a condition and a costume. `budgets.yaml` stays the shared test — tier, item level, links, jewels — so "ssf-week1" means one thing for every build. The new `profiles.yaml` supplies the bases and affixes an archetype actually wears: evasion armour, a bow, a quiver, attack speed and added damage. A second class is possible now without letting a build quietly pick an easier test.
- **Ascendancy points were counted but never applied.** The pipeline recorded which notables the labs allow and gated on that count, but never wrote them into the Path of Building XML, so every gate report measured a build with no ascendancy at all. They are now emitted with the small passives that connect them. The summoner's red-map damage rose from 183k to 239k and account-wide numbers moved everywhere.
- The tree planner walked into cluster-jewel-only nodes — `Position Proxy`, `Medium Jewel Socket` — which PoB drops without saying so. A gate could therefore report points the character never had. They are excluded, and PoB's parsed node count is now asserted against the planner's, so a future mismatch fails the build instead of shrinking the tree.
- Flasks were listed in the guide but never equipped, so a gate measured a build without them. They are now in the XML and active, which is what declared uptime means here. For the Deadeye that is worth about 20% of its damage.
- The act damage floors were minion-shaped: 60 DPS at level 12 and 600 at 28 only admitted builds with several bodies. A three-link bow does 37 and 471, so the floors are now 25 and 350, with both measurements recorded next to them.
- The summoner's ascendancy order changes: PoB resolves a minion with Unholy Might to an empty skill list and reports 0 DPS, so **Bone Barrier** replaces Unnatural Strength. A gate must measure the build, not a tool bug.
- 576 tests.

## 0.55.0 — 2026-11-26

The filter knows where you are.

- Leveling filters now tighten by **area level** instead of making you re-download at every act. One file shows every build-relevant drop in areas 1-9, keeps magic and four-socket whites through 19, and from area 20 shows magic only when it is a 4-link or a linked R-G-B group — plus accessories, which stay worth an identify. From area 68 the white floor becomes the crafting band, so an ilvl 70 two-socket white body armour no longer shows at level 76.
- Endgame whites are the crafting band alone: ilvl 84 on Soft, 86 on Strict and Uber, plus anything with a 4-link or 6 sockets. Below that band, a white item needs links to appear.
- The Strict and Uber map cutoffs now wait for their own area. T11 maps are area 78 and T15 are 82 (area is 67 + tier), so a level 76 character running T1-T3 keeps every map they can actually use instead of losing T1-T10 to Strict. Soft still shows every tier.
- Leveling Strict and Uber hide single Scrolls of Wisdom and Portal Scrolls but show stacks of three or more; Soft is unchanged.
- White flasks show through area 29, because early characters have nothing else. The item tester gained an **Area level** field: a pasted item carries no area, and the leveling stages match on it.
- The rule model learned `SocketGroup`, so the chromatic-recipe rule is a real condition, and the audit catalog gained stage fixtures (white 2-link at area 68, 4-socket white, RGB magic, early map drop, scroll stacks).
- 576 tests.

## 0.54.0 — 2026-11-26

The build page hands you its proof.

- The build page now publishes the Path of Building code for the `maps-red` gear set, with a copy button and a link to pob.cool. It is the same XML the oracle measured, generated by the same writer, so importing it shows the numbers the gate report claims. One code, one named checkpoint; no `.xml` download.
- `npm run builds:check` decodes every published code and loads it in the pinned PoB, then compares the node, item and gem counts with that checkpoint's gate report. The new `validate-builds.yml` workflow runs the whole chain — compile, verify, load — against a cached PoB checkout on PRs that touch the pipeline, and weekly on a schedule.
- The cheap half of that check runs in `npm test`: every published code must inflate to XML whose class, level, allocated nodes, items and gems match the gate report. It costs milliseconds and catches a stale code without Lua.
- The synthesised shield was written to a slot named `Shield`, which PoB does not have. It silently ignored the item, so four checkpoints were measured without an offhand, and PoB's numbers were lower than the build a reader would import. It now goes to `Weapon 2`, the slot shields and quivers actually use; life and EHP rose at four checkpoints.
- Build-mode filters have goldens now: `leveling/soft` and `endgame/strict` for the reference build, pinned for a fixed preset hash, so a change in how a build's slots resolve shows up as a diff.
- Re-verification no longer rewrites `checkedAt` when no measured value moved (D22). A nightly run that proves the same numbers produces no diff and no PR.
- Gate thresholds that have not been calibrated say so twice: the gate report line names it, and an **uncalibrated thresholds** badge sits next to the numbers. They stay uncalibrated until P3's must-pass and must-fail sets prove them in both directions.
- 566 tests.

## 0.53.1 — 2026-11-25

The tree you can actually see.

- 0.53.0 shipped a passive tree with invisible nodes and panning that threw the whole constellation off-screen. The SVG was measured through a ref whose effect ran once while the element was still null, so the measured size stayed zero. Node radius and hit targets were zero, and only the edges drew.
- Measurement now hangs off the element itself and runs before paint, so the first painted frame already has the right node radius. Nodes are rings at a fixed screen size that grows slowly with zoom, allocated nodes are larger, and the taken path is a heavier gold line.
- Pan and zoom arithmetic moved into a pure module. The viewBox is clamped inside the constellation, so no drag or zoom-out can lose the tree; a drag before the SVG is measured is ignored instead of divided by a placeholder; and wheel zoom accounts for the letterboxing of a wide panel, so it stays under the cursor.
- The whole-tree view is still the default. Drag pans once you are zoomed in, **fit** frames the taken points and **all** returns to the constellation.
- 562 tests, including the pan and zoom invariants that let 0.53.0 ship broken.

## 0.53.0 — 2026-11-25

The tree opens whole, and gems tell the truth.

- The passive tree now opens on the whole constellation, the way the game does. Node radius is a fixed number of screen pixels at every zoom, so the nodes never turn into blobs when the view covers a handful of points; **fit** frames the points you took and **all** returns to the whole tree.
- Hovering a node shows its name, type and stats, and clicking pins the tooltip for touch. Hit targets are delegated to the SVG, so 2,500 nodes do not each need a listener. Mastery nodes say they are a choice instead of claiming no stats exist.
- The allocated tree was drawn with gaps. The oracle recorded an edge only when `id < other`, but PoB's `out` is directional, so six of the ten act-1 links were dropped; the geometry had them all along. Every gate tree is now one connected constellation, and a test walks the graph to keep it that way.
- Gem names are coloured by their poewiki colour: red for strength, green for dexterity, blue for intelligence, white for universal. A level-21 gem carries a **Vaaled** badge, because 21 needs a Vaal Orb.
- Gems that must not be levelled past a cap now say so. Cast when Damage Taken carries **max 5**, in the seed, the compiled build and the tooltip, so the guide stops recommending a level that would break the trigger.
- 545 tests.

## 0.52.1 — 2026-11-25

The tree no longer crashes the page.

- The build page crashed with React error #310 as soon as the passive tree finished loading. The tree component returned early while the geometry was still fetching, then reached three memoised layers on the next render, so the second render had more hooks than the first.
- Every hook now runs before the early return. A source-level test pins the invariant, so a future refactor cannot put a hook behind a conditional again.
- This was a regression in 0.51.0, introduced when the memoised layers were added to make panning smooth.
- 542 tests.

## 0.52.0 — 2026-11-25

The first verified build.

- The build is now published as **verified**, not draft: every checkpoint passes its gates. Maps-red damage went from 65k to 184k and pinnacle from 92k to 304k.
- The reason was a real bug. Jewel sockets were allocated after the notable loop had already spent the whole budget, so the six Ghastly Eyes in the gear list were never socketed and contributed nothing. The gate was measuring a character wearing no jewels.
- Sockets are now allocated first, then notables fill the rest. That changes the tree, which cost cold resistance, so the amulet carries a cold roll to keep all three elements capped.
- The gate report now publishes chaos resistance and the socket count, so the page shows what was actually measured.
- Gates are still labelled uncalibrated: they pass for this build, but the threshold set has not yet been proved against known-good and known-bad reference builds.
- 541 tests.

## 0.51.0 — 2026-11-25

A tree you can actually read, and flasks that fit the step.

- The passive tree opens fitted to the nodes the build took, so a 10-node act-1 plan fills the panel instead of being two-pixel dots in a 20,000-unit constellation. `fit` and `all` switch between the two views.
- Clicking works. Hit targets were wider than the gap between nodes, so a click often opened the neighbour's tooltip; they are now capped below the median node spacing.
- Every node has stats, not just notables: 2,100 of 2,501 nodes answer a click instead of saying "no stats recorded".
- Panning no longer rebuilds 2,500 nodes and 2,879 links on every mouse move, so dragging stays smooth.
- Flasks are sized to each step: medium life at level 12, giant life and greater mana at 28, divine life and hallowed mana at 68, eternal mana at maps. Mana gets its own slot instead of being folded into utility.
- Four new tests hold every bracket to the game's own data: no gem before its required level, no flask before its drop level, a life flask at every step, and a named source for every gem.
- 541 tests.

## 0.50.0 — 2026-11-25

A tree you can read, and gems you can actually hold.

- The passive tree is interactive: wheel zooms, drag pans, and clicking a node shows its stats. The tree is drawn over the full constellation, so a 10-node act-1 plan is visible in context instead of floating in a black box.
- Gem levels are now derived from each gem's own required-level table rather than hand-written. A level-12 step holds level-1 Summon Skeletons because that is what the game allows; the pipeline refuses a step whose gems could not be held yet.
- Every gear slot carries gems at every step, including the non-damage ones: mobility on the boots, offering on the wand, guard skills on the gloves.
- Hovering a gem shows where it comes from: a quest reward for the class, or a quest unlock, with a link to its wiki page.
- Flasks are validated against the base-type drop levels. Early steps use a medium life flask, a small mana flask and the act-2 quicksilver, not endgame flasks.
- Boots always carry movement speed, and chaos resistance joins them at maps. Pinnacle gates on capped chaos resistance.
- 537 tests.

## 0.49.0 — 2026-11-25

The tree looks like a tree, and the gear like an inventory.

- The passive tree is drawn on top of the whole tree, the way the game does it: the constellation faint in the background, taken nodes lit, links between them bright gold, jewel sockets ringed in blue. Node positions come from PoB, exported once to a 250 KB file the page loads on demand.
- The gear section is an inventory sheet instead of a table: weapon and shield on the left, helmet, body, gloves and boots down the middle, rings, amulet and belt beside them, jewels below. Hovering a cell still shows the item.
- Item names use the game colours: magic blue, rare yellow, with a matching border on the slot.
- Boots always carry movement speed, and chaos resistance joins them once the budget reaches maps.
- Gems now cover every armour slot, including the ones that are not damage: Convocation on the shield, Cast when Damage Taken with Immortal Call on the gloves, Flame Dash with Faster Casting and Arcane Surge on the boots, Flesh Offering with Generosity on the wand.
- Pinnacle adds a chaos resistance floor of 75%, because those bosses hit with it.

## 0.48.0 — 2026-11-25

Jewels: sockets on the tree, Ghastly Eyes in the gate.

- Jewels are part of the gate now. The oracle allocates jewel sockets on the tree — each costs a point, so they compete with notables — and sockets them with the jewels the budget allows.
- Budget jewels are Ghastly Eye jewels with one minion damage prefix and one minion attack speed suffix, because those are different affix groups. Two damage lines on one jewel is not an item that exists.
- The guide lists the jewels with the rest of the gear, so you can see what the gate was measured with.
- Early maps improve to 45k damage from 38k, red maps to 55k and pinnacle to 75k. Red maps and pinnacle still miss their floors, so the build stays a draft.

## 0.47.0 — 2026-11-25

A tree planner that counts points, and early maps pass.

- The tree planner picks by value per point instead of walking candidates in file order: one breadth-first pass per iteration gives every reachable notable its distance, and the score is the pattern weight divided by that cost. Minion damage weighs more than life, and life weighs less than travel is worth avoiding.
- The wand carries minion damage at every budget from act 5 on, and the glove slot carries it from the first week — the two places a summoner actually gets it.
- Brutality replaces Minion Speed in the links: the same six links, more damage, which is what the map steps were short of.
- Four of six steps now pass: until 12, until 28, until 68 and early maps. Red maps are at 40k against an 80k floor and pinnacle at 51k against 150k, so the build stays a draft.

## 0.46.0 — 2026-11-25

A guide you can read in order, with honest early gear.

- The guide opens on the first step instead of the last, so you read it in the order you play it.
- The passive tree thumbnail uses the real node positions — PoB derives each node from its group, orbit and angle — instead of one dot per cluster, and it sits on a lighter panel so the shape and links are visible.
- A table of contents sits beside the article on wide screens and above it on phones: step, gate report, tree, gear, gems, flasks, ascendancy, pantheon. The links scroll without touching the build or step in the URL.
- Ascendancy points are shown as four cards in the order you take them, each naming the lab and linking to its wiki page.
- Pantheon is shown as the major and minor god you pick, with the bandit choice beside them.
- Early gear is realistic now: acts 1-4 use magic items with one weak mod (25 life, 12% resistance) instead of budget rares with 60 life and 30% resistance, which nothing drops at level 12. Acts 5-10 get one or two mods.
- Flasks while leveling are a small life flask, a small mana flask and the quicksilver you get from act 2 — not five utility flasks you cannot have.
- Resistances are only judged from act 10 onwards; before that they are negative for everyone, and the gate said nothing useful by measuring it.

## 0.45.0 — 2026-11-25

Steps are leveling brackets, and the step sticks.

- A step is now a leveling bracket: until level 12, until 28, until 68, then early maps, red maps and pinnacle. The separate leveling block is gone — each step shows the gems you level with, the gear, the tree, the flasks and the measured numbers together.
- The step you pick is written to the URL and restored on refresh, so a rewarded link opens on the same step.
- Tooltips open above their anchor. Hanging below the last row made the page grow and produced scrollbars, which hid the tooltip entirely.
- Resistances are judged per step. Path of Building applies the full -60% penalty at every level, so a level 12 character cannot cap resistances and the early steps no longer fail for something nobody does.
- The build now passes until level 12, until 28 and until 68. It still misses damage in maps, so it stays a draft with the failures named.

## 0.44.0 — 2026-11-25

A step-driven guide: tree, gear, gems and flasks that change together.

- Fixed a bug that hid the tree and the gate report: compiling the seeds rewrote the generated build JSON and dropped the verification results. Compiling now keeps the gate report when the seed has not changed, so a rebuild can no longer erase a measurement.
- Fixed the damage figure: PoB calculated whatever skill group came first, so adding a utility group (Desecrate, Flesh Offering) made the build look like it did 705 damage. The oracle now points PoB at the group that holds the main skill.
- The guide is driven by a step picker. Choosing act 5, act 10, early maps, red maps or pinnacle changes the tree, the gems with their levels, the gear and the measured numbers together, because they all come from that checkpoint.
- Gear is shown as a slot grid where the items belong, with a tooltip on hover: base type, item level, budget and every mod. It is the same synthesised gear the gate was measured on, not a different list.
- Gems are grouped per gear slot with levels, a tooltip naming the main skill or support, and a link to the wiki page for each gem.
- Flasks follow the step: leveling flasks while leveling, map flasks in maps, endgame flasks at pinnacle, each with the note that matters.

## 0.43.0 — 2026-11-25

The guide gets a tree, per-slot gems and flasks.

- The guide now shows the passive tree: one plan per checkpoint, drawn from the tree data itself (allocated nodes, their links and the notables), pruned from the endgame tree. Switch checkpoints to see what you have at that point in the game.
- Gems are listed per gear slot — body armour, weapon, shield — instead of one flat list, so you know what goes where.
- Flasks are listed per step: leveling, maps and endgame, with the suffix or craft that matters at each step.
- The checkpoint table stays the gate report: level, budget, damage, life, EHP, max hit and resistances, with every failure named.
- Build data now carries per-slot gems, flasks and tree views, all compiled from the seed YAML and checked by tests: a group per slot, a life flask at every step, a tree view for every measured checkpoint.

## 0.42.0 — 2026-11-25

Build guides, with a gate report behind every number.

- A build guide page exists: `build.html#build=<id>` shows the gate report, leveling brackets, ascendancy order with labs, bandit, pantheon and the build-specific filter link. Every number on it comes from the committed build JSON.
- The gate report is real. Path of Building runs headless in CI: for each checkpoint it plans a tree from the seed, assembles the build with synthesised budget gear, measures damage, life, EHP, max hit and resistances, and compares them against thresholds in `gates.yaml`. Failures are named, never summarised as "failed".
- Gear is synthesised from budget constraints rather than hand-written items, and every item line is checked: PoB drops an unparseable line without saying so, so the pipeline asserts how many mods it parsed per item.
- The Summon Skeletons Necromancer seed is published as a **draft**: it passes act 10 and misses damage at the map checkpoints. That is the honest state until gates are calibrated and repair exists.
- PoB is a development and CI dependency only. Nothing from it ships to the browser.

## 0.41.0 — 2026-11-25

BuildPath, and the first verified build seed.

- Renamed to BuildPath. The site now builds for `/buildpath/`, the repo, the package and every user-facing string follow, and generated filters are named `buildpath-*.filter` with a `# BuildPath` header. Filters written before the rename are still recognised, reported as outdated and offered for cleanup, never treated as foreign files.
- Selecting a filter is required once more, because the in-game dropdown entry changed. With no users yet that is the cheapest it will ever be.
- A new fourth mode, **By verified build**, picks a build seed instead of a gear family. A seed names the class, ascendancy, main skill, leveling gems, ascendancy order, bandit and pantheon, and the filter it generates is named after the build.
- Seeds are hand-written YAML under `src/builds/`, validated against a JSON Schema at build time and compiled to committed JSON, so the browser never parses YAML. A drift test fails if the committed JSON and the YAML disagree, and a second seed for the same skill and ascendancy is rejected.
- The first seed is a Summon Skeletons Necromancer, chosen because it needs no uniques and gets its damage from gem levels. It compiles as a draft until the Path of Building gate report exists.

## 0.40.0 — 2026-11-24

Mana flasks while leveling.

- A fresh character drinks mana flasks as much as life flasks, so while leveling
  they now get the same slot treatment: the same rarity floors, the same
  styling and the same hide below the floor. Endgame profiles still hide them.
- Open product decisions are recorded as settled in the plan: the Standard
  fallback snapshot stays, the ascendancy default families are accepted, and the
  three-entry Scion ladder is confirmed.

## 0.39.0 — 2026-11-24

Polish: a lighter background, labelled inputs and honest docs.

- The loot-simulator background is 574 KB instead of 2 MB, with the same look,
  and the builder preview loads the lighter file too.
- The build-code, build-name and audit-filter inputs now have labels for screen
  readers, and the behaviour audit page is kept out of search results.
- A test fails if anything in src/core imports React, so the framework-free
  boundary is enforced rather than assumed.
- The README describes the builder as it is: current status, the four Vite
  entries, the verified-snapshot folder rule and the release steps.

## 0.38.0 — 2026-11-24

A quieter, safer economy pipeline.

- The daily economy refresh now sends a real User-Agent, times out, retries
  twice, and reuses the previous response when poe.ninja reports nothing
  changed. A malformed response leaves the last good snapshot in place.
- A day without a tier change no longer produces a commit or a pull request:
  tier keys are sorted and the file is only written when something moved.
  Changes land in one rolling PR instead of a new one each day.
- This release carries a fresh economy snapshot with the current league prices,
  so connected filters are reported as preset-stale once.
- The behaviour-audit artifact now contains the whole build, so the downloaded
  page loads its scripts instead of showing an empty shell.
- A test keeps CHANGELOG.md and the in-site changelog in step from 0.20.0
  onwards.

## 0.37.0 — 2026-11-24

Builder fixes across the rule editor and the folder.

- Typing a comma in the class or base-type field no longer deletes it, so a
  second entry can be started. Explicit-mod rules now count as conditions in the
  catch-all, duplicate and summary checks.
- The item test decides in the order the filter writes: the always-on quest and
  veiled blocks first, then My rules, then the preset.
- A custom rule no longer loses its own text and border colours when you switch
  theme, and generator warnings show a count while the generated filter is
  collapsed.
- The build name is applied on blur or Enter instead of rebuilding the whole
  filter on every keystroke. From Scratch reads its own starting action instead
  of always claiming everything is visible.
- Overlap warnings stop listing the quest and veiled safety rules, and two
  explicit-mod rules only overlap when the mod names actually match.
- The folder listing reads only the first 4 KB of each filter, and a blocked
  local storage or a render crash now says so instead of failing silently.
- Loot-simulator parsing handles magic items with a base line and numbers with
  thousands separators, and behaviour-audit deep links decode again.

## 0.36.0 — 2026-11-24

Cluster jewels, unique maps and link safety.

- Large, Medium and Small Cluster Jewels are shown at every rarity. They were
  hidden by every preset, because the jewel slot only targets the build's own
  jewel bases.
- Abyss jewels are shown too, one eye per build family: Hypnotic for casters,
  Ghastly for minions, Murderous for melee, Searching for bows and hybrids.
- Unique maps are always shown with unique styling, whatever the map tier
  cutoff, and Empower, Enlighten and Enhance are shown before any gem quality or
  level gate.
- A 4-link is now kept for normal, magic and rare items while leveling,
  including below the item level floors, and a six-linked unique is never
  hidden by the low-tier unique cutoff.
- Per-unit stacks are priced fairly: the Simulacrum and Timeless splinters and
  Stacked Deck stay visible in strict. Economy overrides are now merged when the
  presets are compiled, so a typo in an override fails the build.

## 0.35.0 — 2026-11-24

Current game data and economy names that actually emit.

- Base item data now comes from the maintained RePoE export (game data
  3.30.0.4.3) instead of a repository that has not been updated since 2022,
  pinned to one export commit so the generated files stay reproducible.
- Bases added since the old data are recognised, including the current league
  gear. The golden filters gain 64 bases; nothing was removed.
- Every economy name is now a valid base type. The Reliquary Keys, Valdo's
  Puzzle Box and the Zorath's Eyes were missing from the registry, so their
  fragment rules could not be written; they emit now. A test keeps every
  economy tier name mapped to a known base type.
- The base-type registry admits only item classes the filter language knows, so
  internal placeholders cannot slip in and a typed base name still has to be
  real.

## 0.34.1 — 2026-11-24

Install help collapses like the other panels.

- The "How to install" section now uses the same chevron as Advanced rules and
  Generated filter, and remembers whether you left it open.

## 0.34.0 — 2026-11-24

Exact matching and safe folder updates.

- Class and BaseType conditions now use exact matching. The game used to match
  them as substrings, so a rule aimed at "Gold" also caught Golden Mask and Gold
  Ring, "Hope" caught Mortal Hope, and "Ring" gave every unique ring the
  top-tier alert. Filters carry filter format 2; existing filters are flagged as
  outdated and one Save brings them to the new format.
- A connected folder can update its outdated filter automatically again, but
  only from a verified snapshot: the builder must still hold the same build and
  My rules the file was written with, the file must still be the exact one
  FilterPath wrote, and the new header must read back as expected. Anything else
  is reported for you to check and save.
- Older custom rules that used partial class names (such as "Swords") are
  expanded to the real classes, and a class that now matches less than before is
  flagged. A rule whose class names are all unknown is disabled instead of
  silently widened.
- Stored and imported rules are repaired rather than discarded: a single name
  becomes a one-item list, numeric text becomes numbers, and a condition that
  cannot be repaired disables just that rule. Share codes are size-limited on
  both ends, so a hostile code cannot expand without bound. Existing build codes
  keep working.
- Importing a code over a build that already has My rules asks before replacing
  them.
- The item preview treats currency, gems and divination cards as normal-rarity
  items and reports missing sockets, links, quality and stack size the way the
  game does.

## 0.33.2 — 2026-11-24

Loot simulator links open the right rule.

- "Shown by rule #N" and "Create custom rule" in the loot simulator now work when
  Advanced rules is collapsed: the section opens first, then the builder
  scrolls to the rule or to the prefilled editor.
- "Shown by rule #N" now opens the rule that actually decided the item. It
  used to land one or two rules off once My rules were present, and counted
  disabled or skipped My rules that the filter leaves out.

## 0.33.1 — 2026-11-24

Safer folder sync and custom rules.

- "Remove N outdated" no longer deletes filters FilterPath did not write. A file
  counts as FilterPath's only when its name starts with filterpath- and its
  header says FilterPath wrote it. Newer files, the current file and .bak copies
  FilterPath did not write are never touched, and the confirmation lists every
  file it will remove.
- Outdated filters in the connected folder are no longer rewritten
  automatically. The builder tells you the current file is outdated; check the
  build and press Save to update it (the old file is kept as .bak).
- A custom rule whose base types are all unknown, or whose list is empty, is no
  longer written as a block that hides everything. It is left out of the filter,
  and the rule editor says why and names the unknown base types.
- Custom rules from build codes or saved data are checked before they reach the
  filter. A rule the game cannot read is left out with a warning instead of
  breaking the whole filter or crashing the builder; comments lose characters a
  filter cannot hold.
- Minimap icon and beam colours follow GGG's list (Grey, plus Brown, Orange and
  Pink).
- If an earlier version already turned one of your rules into a bare Show or
  Hide, check My rules: such a rule now matches every item, as it did before.

## 0.33.0 — 2026-11-23

Automatic folder checks and meta grouping.

- A connected filters folder is now checked for read/write access automatically
  when it is restored after a refresh, so the access badge and read-only hint are
  accurate without pressing Test access.
- By meta build can now group skills by family or by seed weight. The seed-weight
  view puts the most popular skills first and shows each skill's family.

## 0.32.0 — 2026-11-22

Always show veiled items.

- Veiled items are now always shown, in leveling and endgame, whatever the build
  or strictness. They get their own magenta text, border and background in every
  theme, with no alert sound or minimap icon.
- The rule matches the game's explicit mod names containing "Veil", so it catches
  "Veiled" and the legacy "of the Veil" variants without false positives.
- The behaviour audit gains a veiled rare bow case, and the golden filters and
  summary are regenerated (one more visible drop everywhere).

## 0.31.0 — 2026-11-22

Silent leveling gems, and a stricter leveling gate.

- Gems no longer play an alert sound while leveling, in soft, strict and uber.
  Endgame gems keep their alert.
- In leveling strict, gems now show only if they have 5% quality or more, or an
  item level of 10 or more. Plain gems from the earliest areas are hidden.
  Leveling soft still shows every gem, and leveling uber keeps its quality-5
  gate.

## 0.30.0 — 2026-11-22

Hide Iron Rings on minion builds.

- Iron Rings are now excluded on minion builds, in every phase and strictness.
  Iron Ring's physical attack implicit is useless to a summoner, so rare and
  lower rings are hidden for the minion family, the Necromancer and minion meta
  builds.
- Unique Iron Rings (such as Andvarius) and attack builds that want the base are
  unaffected.

## 0.29.0 — 2026-11-22

Always show Labyrinth Treasure Keys.

- Labyrinth Treasure Keys (Item Class: Labyrinth Items) are now built-in quest
  items in every filter. They are shown with the quest styling, an alert sound
  and a green minimap dot, even in From Scratch hide-all.
- RePoE does not ship the Treasure Key base, so it is a reviewed entry in the
  base-type registry, checked against the game's own item text.

## 0.28.0 — 2026-11-22

Collapsible panels and resuming saved filters.

- The Generated filter window is now collapsible, exactly like Advanced rules.
  Both sections start collapsed and remember whether you opened them, so the
  layout stays the way you left it.
- A chevron in each collapsed section shows that it can be opened, and it turns
  to point down while the section is open.
- The Generated filter copy button is now a copy icon on the right of the
  header, next to the Rules, Bases and Lines counts and separated by a thin
  divider. It shows a check mark while the filter text is on the clipboard.
- Opening an empty builder now offers to resume what you already have: builds
  saved in this browser, and filters in a folder you connected earlier (grant
  access to list them).
- Each FilterPath filter in the connected folder has a Delete button next to
  Load, with a confirmation prompt, that removes the file and its .bak copy.

## 0.27.0 — 2026-11-22

Your last good filter, and one build code.

- Clicking the FilterPath title now starts a new, empty filter instead of
  jumping to a preset. Nothing is selected until you pick a way to build.
- A Reset button appears next to the "unsaved changes" badge and returns to the
  last saved state. Reloading the page, or leaving and coming back, does the
  same: unsaved edits are discarded and your last saved build is restored.
- Your last saved build is remembered on the device, so reopening the site
  brings it back. It is only updated when you download, write, save, update,
  import or load a build.
- Every FilterPath file now carries its build selection in the header, and each
  filter in the connected folder has a Load button, so you can switch to another
  saved filter exactly as it was generated.
- The builder keeps a single build code: Copy code and Import code both carry
  the whole build, including My rules. The separate share link and rules-only
  code are gone, and the Generated filter window has its own Copy button.
- Advanced rules is collapsed by default and shows how many locked preset rules
  and how many My rules the build has.

## 0.26.1 — 2026-11-22

One name for the loot simulator.

- The loot simulator is now called the same thing everywhere. The builder and
  audit nav links read "loot simulator" instead of "demo", and the builder
  preview caption reads "Open loot simulator". The redundant "Open loot
  simulator" button in the preset card is gone, since the preview card below it
  already links to the same place.

## 0.26.0 — 2026-11-22

Live loot preview in the builder.

- The builder now shows a small loot preview under the preset card. It uses the
  same rules and label styling as the loot simulator, so switching the theme,
  phase or strictness updates it in place. Click the preview to open the full
  simulator, where items can be pasted and inspected.

## 0.25.1 — 2026-11-22

Remove the sound-pack option.

- Removed the sound-pack selector. Filters always use the game's built-in alert
  sounds and the loot simulator keeps its chime preview, so nothing has to be
  downloaded or placed next to the filter.

## 0.25.0 — 2026-11-22

Themes and sound packs.

- Filter themes now share one structure: Rarity is the base and every other
  theme only swaps the colours. Added High contrast, Muted, Catppuccin, Dracula,
  Nord, Solarized Dark and Tokyo Night; old `classic` links open as Rarity.
- Quest items get a dark amber background, and Mirror of Kalandra and Divine Orb
  get a vivid chase box with dark text and a `PlayEffect` beam so they stand out
  immediately.
- Sound packs change the alert sounds. Default keeps the game's built-in sounds,
  while Super Mario, Street Fighter, Loom and Commodore 64 emit
  `CustomAlertSoundOptional`. Drop the matching `fp-*.mp3` files next to your
  filter and the loot simulator reads the same files for 1:1 playback.
- The minion family and the Necromancer now show only Leather Belt. The other
  belt bases are hidden and unique belts stay visible.

## 0.24.3 — 2026-11-22

Fix filters failing to load on stale custom rules.

- A custom rule that still listed a base the game has dropped (for example a
  preset rule copied before the last fix) made the whole filter fail to load.
  The generator now drops unknown base types and the stored rules are cleaned
  when loaded, so the editor shows the same rule the filter uses.

## 0.24.2 — 2026-11-22

Fix filters failing to load on removed base types.

- Generated filters no longer list seven base types the game has dropped or
  renamed, which made the client refuse the whole filter with "no base types
  found matching": Gauche, Sinistral and Southswing Gloves, Taxing, Gruelling
  and Debilitation Gauntlets, and Serpent Wand. The registry now strips them via
  a reviewed removal list, checked against the game's own item data.

## 0.24.1 — 2026-11-22

Hide the regen amulets in minion presets.

- The minion family and the Necromancer now hide normal, magic and rare Coral,
  Marble and Blue Pearl Amulets, whose life and mana regen implicits a summoner
  cannot use. Unique amulets stay visible.

## 0.24.0 — 2026-11-22

Custom-rule overrides and loot-simulator deep links.

- Two identical My rules are now named by number in the warning.
- Each custom rule shows which preset rule it overrides, with a click to jump
  to and highlight it.
- Writing the `.filter` counts as saved, so the "unsaved changes" badge clears
  on Download, Write file now, Save build or Update.
- Overwriting a FilterPath filter no longer asks; the previous version is still
  kept as `.bak`.
- The loot simulator can jump to the rule that decided a drop, and open the rule
  editor pre-filled from the item.

## 0.23.0 — 2026-11-22

Hide small gold piles.

- Gold piles below a per-strictness threshold are hidden, so only the larger
  piles keep a label; the floor rises from Soft to Uber (leveling 10/20/50,
  endgame 50/100/200). Gold is auto-collected, so a hidden pile only loses the
  ground label.

## 0.22.0 — 2026-11-22

League first, stale-filter cleanup and more chips.

- The league is now the first choice, at the top of the builder; the current
  league stays preselected and Standard is the fallback.
- A connected filters folder can remove its outdated FilterPath filters, along
  with their `.bak` copies, in one click.
- The rule editor chips now cover every equipment slot plus one-hand weapons.
- A behaviour audit page runs a labelled drop catalog through the real matcher
  for every build, with the outcomes pinned in tests and a golden summary.

## 0.21.0 — 2026-11-22

Soft / Strict / Uber, graded maps and the new ascendancies.

- The three strictness tiers are now Soft, Strict and Uber. Old share links and
  saved builds keep working.
- Maps are graded by tier — T15 over T14 over T11 — and divination cards and
  fragments now hide their low tiers as strictness rises.
- Warden (Ranger), Luminary and Reliquarian (Scion) replace Raider, and the
  Covens seed gains the ten missing skills.

## 0.20.0 — 2026-11-22

Preset tiers, currency tiers and folder help.

- The three strictness tiers now step clearly: Normal, Strict and Very Strict
  raise the white and blue item-level floors, and only the build's own bases are
  shown. Normal is the loosest (a beginner default); Very Strict keeps only
  high-ilvl bases.
- Magic flasks are visible again in endgame, where the all-Magic hide used to
  remove them, and 4-links show in every leveling preset and in Endgame Normal.
- Very Strict keeps tier-2 currency — Chaos, Alchemy, Vaal, Regal, Fusing and the
  rest — and hides low-tier uniques instead of over-hiding orbs.
- The economy tier lists now actually apply, so Strict no longer drops good
  currency: only the vendor tier (scrolls, transmutes, catalysts) is hidden.
- The builder drops the unusable "Folder path (reference)" field; the Windows
  and Linux filter paths now sit inside the How to install section.

## 0.19.1 — 2026-11-22

Hide Cloth Belt in the Minion family preset.

- The Minion family preset now hides normal, magic and rare Cloth Belts, matching
  the Necromancer ascendancy. Unique Cloth Belts remain visible.
- The exclusion moved from the Necromancer ascendancy to the Minion family, which
  is the default preset and the one the Necromancer actually uses.

## 0.19.0 — 2026-11-22

Category backgrounds and build-specific base exclusions.

- The Rarity theme now uses category backgrounds: S-tier orbs get deep magenta,
  best jewels violet, divination cards navy, quality flasks emerald, fragments
  amber, gems teal, jewels indigo and league viscera burnt orange.
- Divine Orb and Mirror of Kalandra are S-tier; high-value unique bases share the
  S-tier backdrop, while best jewels keep their own violet.
- Category colours only restyle items the preset already shows; visibility is
  unchanged. High contrast and Muted stay uniform.
- Necromancer builds now exclude Cloth Belt, whose stun-threshold implicit a
  summoner cannot use. Unique Cloth Belts remain visible.
- Caster builds, including Elementalist, now exclude Iron Ring, whose physical
  attack implicit is useless for spells. Unique Iron Rings remain visible.
- The demo pool and item parser accept league Viscera drops, which have no
  Rarity line.

## 0.18.2 — 2026-11-22

Hide Gold Rings while leveling.

- Gold Ring, the Item Rarity base, is hidden in Leveling Normal, Strict and Very
  Strict.
- Normal, Magic and Rare Gold Rings are hidden; unique Gold Rings such as
  Andvarius remain visible.
- Endgame is unchanged: an ilvl 80+ Gold Ring can still show if the rare floor
  allows it.

## 0.18.1 — 2026-11-22

Paste currency items into the demo.

- The item parser now accepts `Rarity: Currency`, `Gem` and `Divination Card`,
  so orbs no longer fail with “No item blocks found”.
- `Stack Size` lines such as `1/20` now parse as the current stack (`1`) instead
  of an invalid number.
- Divine, Exalted, Chaos and Regal orbs can be pasted into the demo and item
  tester; their matching rule and alert are used.
- The demo pool now includes Divine, Mirror, Exalted, Chaos and Regal orbs.

## 0.18.0 — 2026-11-22

Demo click sounds.

- Clicking an item in the loot simulator now plays the alert from its matching
  filter rule.
- Quest items, named orbs, uniques, currency and other rules with an alert are
  audible; rules without an alert stay silent.
- The demo synthesises short chimes approximating the game’s built-in sounds
  rather than shipping GGG audio files.
- Added a Sound toggle next to Show hidden; the preference is remembered.

## 0.17.0 — 2026-11-22

Quest alerts and named orb sounds.

- Quest items always show and play the default alert (sound 1, volume 300),
  even in a From Scratch hide-all filter.
- Chaos, Exalted, Divine and Mirror of Kalandra use the game’s built-in Sh voice
  lines: `ShChaos`, `ShExalted`, `ShDivine` and `ShMirror`.
- The named orb rules still respect the currency tier cutoff, so Chaos stays
  hidden on Very Strict.
- Quest items are parsed by the item tester and demo, with a green Quest label
  colour.

## 0.16.0 — 2026-11-22

Stable filter filenames and preset auto-sync.

- Filter filenames no longer include the version:
  `filterpath-<name>-<phase>-<strictness>.filter`. From Scratch uses
  `hide-all` / `show-all`.
- The filter header now records the preset hash, so the site can tell whether a
  filter file was built from older presets.
- When the connected filter file is stale, the site updates it automatically
  (keeping a `.bak`) and shows “Your filter was updated with the latest
  presets.”
- Saved builds and imported codes with an older preset hash show a refresh
  notice; the preview always regenerates with the latest presets.
- Existing versioned files need one download to create the stable filename;
  after that, preset updates sync automatically.

## 0.15.3 — 2026-11-22

Browser-specific folder guidance.

- Only Brave gets the `brave://flags/#file-system-access-api` instructions.
- Chrome, Chromium and Edge get a “should be supported” message with
  policy/extension checks and no flag.
- Firefox and Safari get a “use a Chromium browser or download” message,
  because neither implements the API.
- Unknown browsers get the Brave flag plus the general support summary.

## 0.15.2 — 2026-11-22

Brave flag guidance everywhere.

- The `brave://flags/#file-system-access-api` instructions now appear for every
  unsupported browser, even if Brave detection fails.
- Copy and Reload actions sit together in the amber browser-support callout.
- README now has a Folder writing browser support section for Chrome, Chromium,
  Edge, Brave, Firefox and Safari.

## 0.15.1 — 2026-11-22

Brave folder-writing guidance.

- Brave disables the File System Access API by default; the folder panel now says
  so instead of a generic “download only”.
- Added the exact flag, a Copy `brave://` flag button and a Reload after
  enabling button.
- Other unsupported browsers now point to Chrome, Chromium or Edge and keep the
  download fallback.

## 0.15.0 — 2026-11-21

Rarity-first default colors.

- Replaced the slot-colored Classic theme with a Rarity theme: gear text and
  borders follow Normal, Magic, Rare and Unique instead of
  weapon/armour/accessory.
- All gear uses a black background; Magic is blue, Rare is yellow and Unique is
  orange.
- Currency is default gold, divination cards pale blue, gems teal, maps tan and
  map fragments gold.
- Six-socket rules are split by rarity so a six-socket item also gets its
  rarity color.
- High contrast and Muted remain; Muted now uses a black background.

## 0.14.5 — 2026-11-21

Leveling Strict hides everyday Magic gear.

- Leveling Strict now hides Magic gear below item level 80.
- Magic items on a base the build allows still show at ilvl 80+, as a crafting
  or upgrade outlier.
- Wrong-base Magic items stay hidden even at ilvl 80+.
- This hides the reported ilvl 43 Magic Topaz Ring while keeping the 80+
  exception.

## 0.14.4 — 2026-11-21

Seed data is labelled honestly.

- Meta snapshots now declare `provenance: seed` or `provenance: captured`.
- Seed snapshots show “Curated seed updated <date>”, call the numbers seed
  weights, and no longer claim measured percentages.
- Captured snapshots keep “Captured <date>” and measured percentages.
- PLAN records that a real poe.ninja builds capture is blocked and that My rules
  are the resolved overlay mode.

## 0.14.3 — 2026-11-21

Hide wrong-base gear inside used classes.

- Items in a used class but the wrong base type are now hidden, e.g. strength
  helmets and strength/dexterity body armours in the minion preset.
- Leveling 4+ link highlights are limited to the build’s usable slots and bases;
  a 4-link two-hand sword no longer appears in a minion filter.
- Unmatched items still default to visible, so the junk rules now include a
  base-level remainder hide for restricted classes.
- Added regression items: rare sceptre, one-hand sword, thrusting sword, magic
  strength helmet, magic strength/dexterity body armour and a 4-link two-hand
  sword.

## 0.14.2 — 2026-11-21

Hide rares in unused slots.

- Rare items in slots the build does not use are now hidden at every phase and
  strictness, not only Endgame Very Strict.
- This removes noise such as rare sceptres and one-hand swords from the minion
  preset while keeping rare wands, shields and other used slots visible.
- Unmatched items still default to visible; the added hide rule closes that gap
  for unused equipment classes.

## 0.14.1 — 2026-11-21

Composed section presets.

- Filter presets are now composed from named section presets: gear, gems,
  currency, maps, uniques and junk.
- Section values and generated filters are unchanged; the UI still exposes one
  global strictness.
- Each section preset has a stable id such as `preset-gems-endgame-strict` for
  tests, debugging and future section-specific tuning.

## 0.14.0 — 2026-11-21

Template coverage badges.

- Templates show an “In preset” badge when the current preset already guarantees
  the same outcome.
- Coverage respects phase and strictness: T15 maps are not covered while
  leveling, and quality-gem and top-currency cutoffs change with strictness.
- Six sockets count as covering six links, because a six-link always has six
  sockets.
- Clicking an “In preset” template still adds a copy so you can override its
  styling, with a notice explaining it is redundant.

## 0.13.1 — 2026-11-21

Reference folder path field.

- Added a Folder path field for pasting the filters folder location, with Copy
  and Use suggested path buttons.
- The field is reference-only: browsers cannot grant access to a typed path, so
  Choose folder still connects the folder.
- The picker tip explains Ctrl+L on Linux, the address bar on Windows and
  Cmd+Shift+G on macOS.
- Pasting a path that stops at Documents now warns that the game folder is
  My Games/Path of Exile inside it.

## 0.13.0 — 2026-11-21

Filter names, folder writing and save updates.

- Filter files now use
  `filterpath-<name>-<phase>-<strictness>-<version>.filter`. From Scratch uses
  `hide-all` or `show-all` instead of phase and strictness.
- The build name is optional: empty names fall back to a readable slug from the
  selection, e.g. `minion` or `lightning-arrow-deadeye`.
- A typed name changes the filename and demo label immediately, before saving.
- The builder and demo both show the exact filter being edited.
- Download writes into the connected filters folder first, asks before
  overwriting, and falls back to a browser download.
- The folder panel detects Windows, Linux/Proton or macOS and shows the matching
  path first; the other platform stays behind a disclosure.
- Choosing another folder runs a read/write probe and reports permission
  problems, with a copyable `chmod` hint on Linux and folder-permission steps on
  Windows.
- Saved builds show an Update button next to Load/Delete for the loaded build;
  Save creates a copy.

## 0.12.0 — 2026-11-21

Advanced rules rework and From Scratch mode.

- The preset is locked and never cloned. My rules are evaluated first; copy
  individual preset rules or whole groups to override them.
- Rebuilt My rules editor: item classes, base types, quick attribute/slot
  chips, rarity, ilvl range, sockets, links, quality, stack, map tier,
  Continue, style, search and drag reordering.
- Added predefined templates: uniques, 6-links, T15 maps, quality gems, top
  currency, top divination cards, ilvl 80 rares and hide normal/magic gear.
- Added From Scratch mode with Hide everything or Show everything; phase and
  strictness are hidden there.
- Added conflict warnings, an item test box, rules-only share codes, and
  full-build code import/export.
- My rules follow the selected build, so changing phase, strictness or theme
  keeps them.
- Saved builds store selection + My rules only; presets always regenerate. Old
  whole-set clones and saved builds are discarded with a notice.
- Share links that carry a build code now restore the build instead of dropping
  the code.
- Clicking the FilterPath title resets the filter, with a confirmation when
  there are unsaved changes.

## 0.11.2 — 2026-11-21

Steam library-aware filter paths.

- Folder guidance now explains that `steamapps` lives inside each Steam
  library, not the home folder.
- Shows the default Proton path, an extra-library example, and a `find` command
  to locate the prefix.
- Clarifies that `.filter` files go directly into
  `Documents/My Games/Path of Exile`, with no `filters` subfolder.
- Updates the builder install steps with the same wording.

## 0.11.1 — 2026-11-21

Demo capture, build codes and merged saving.

- Ctrl+V on the demo immediately imports a valid item block; Clear pasted was
  removed.
- Demo labels use independent random X and Y with overlap avoidance, and
  Randomize draws a new subset.
- The demo follows the latest builder selection through BroadcastChannel and
  session fallback.
- Copy code carries the selection and rules; Import code restores the whole
  build. The JSON file picker and duplicate share-code panel are gone.
- Saved builds store custom rule deltas, rebase them onto the latest presets,
  and flag unsaved changes; refreshing warns first.
- Save build and the filters folder are merged: local save plus file write when
  a folder is connected.
- Folder guidance covers Windows and Proton paths, allows any folder, and
  offers a download fallback.
- The league dropdown uses a compact custom chevron.

## 0.11.0 — 2026-11-21

Directory sync.

- Save the filter directly into the PoE filters folder in Chromium browsers.
- The folder handle is remembered in IndexedDB; write permission is requested on
  demand.
- Lists existing .filter files with their FilterPath version and flags stale
  files.
- Overwrites ask for confirmation and keep the previous contents as
  `<name>.filter.bak`.
- Never deletes or modifies unrelated files; Firefox and Safari keep the
  download flow.

## 0.10.2 — 2026-11-21

Demo replaces the builder preview.

- Removed the inventory preview from the builder; the loot simulator is now the
  single preview surface.
- Demo labels spread across the full background height and randomize on load and
  on Randomize.
- Hovering a demo label opens the game-style item tooltip automatically;
  tapping pins it on touch.
- Removed the redundant strictness explanation block.
- Deleted the unused paper-doll and icon code.

## 0.10.1 — 2026-11-21

Meta picking, import code, random drops and item tooltips.

- Meta mode: any skill can be picked across families; only the ascendancies
  recorded for that skill are offered, with their snapshot share.
- Renamed the filter copy button to "Copy filter" and reduced advanced import to
  a single "Import code" field; the JSON file picker is gone.
- The loot simulator randomizes a fresh subset of drops on load and on
  Randomize; pasted items are highlighted as new.
- Clicking an item in the inventory preview opens a game-style tooltip with
  requirements, sockets and the matching rule.
- Inventory tiles now show rarity labels and stronger rarity borders.
- Removed per-section strictness; one global strictness applies to the whole
  filter.

## 0.10.0 — 2026-11-21

Economy tiers and the daily refresh.

- Filter rules now use poe.ninja economy tiers for currency, fragments,
  divination cards and high-value unique bases.
- Tiering converts chaos to divine, filters names to valid BaseTypes, and falls
  back to static lists when data is missing.
- Hand-written overrides in `src/presets/economy-overrides.yaml` always win.
- A daily GitHub Actions workflow refreshes the snapshot and opens a PR when
  tiers change; manual dispatch is available.

## 0.9.1 — 2026-11-21

Game-like loot simulator and always-on sections.

- The loot simulator now uses an original game-like ground background.
- Drops are scattered as overlapping in-game-style labels, with a Scatter
  button.
- Clicking a label shows the matching rule and reason.
- Removed the section toggles: all sections are always included, and advanced
  clones control overrides.

## 0.9.0 — 2026-11-21

Themes, per-section strictness and saved builds.

- Added three filter themes: Classic, High contrast and Muted.
- Per-section strictness for gear, gems, currency, maps and uniques; the global
  choice still sets all five.
- Saved builds in localStorage, with load and delete.
- Theme and section strictness round-trip through share links and clone keys.
- The filter header records non-default section strictness.

## 0.8.0 — 2026-11-21

Loot simulator, style editing and share links.

- Added a loot simulator page that shows drops with their filter labels.
- Paste item text from the game to add it to the simulation; parses class,
  rarity, base, item level, sockets, links, quality, stack size and map tier.
- Per-rule style editing: text, border, background, font size and alert sound.
- Share codes can now be copied as a link; opening the link imports the clone
  automatically.
- The builder header links to the simulator with the current selection.

## 0.7.0 — 2026-11-21

Advanced rules, locked presets and clones.

- Every generated rule is shown in a locked, section-grouped pane.
- Whole-set clones are stored in localStorage and replace the generated rules
  for that exact selection.
- Rule editor: enable, reorder, duplicate, delete, change action, comment,
  rarity, item level and Continue.
- New rules can be built from DEX/STR/INT requirement chips, Head, Weapon 2H and
  Weapon ranged.
- RePoE base data now keeps attribute requirements for accurate chips.
- Export/import JSON and compressed share codes, capped at 8 KB with a file
  fallback.
- Stale clones warn when the locked preset changes and never merge silently.

## 0.6.0 — 2026-11-21

Independent family, ascendancy and meta modes.

- Replaced the cascade with three independent modes: by family, by ascendancy
  and by meta build.
- Ascendancy mode uses a default family loadout, e.g. Juggernaut two-hand axe
  or Deadeye bow.
- Meta mode lists every snapshot skill grouped by family, then the ascendancy.
- Presets moved to YAML under `src/presets`, compiled to JSON with JSON Schema
  validation.
- Mode-aware file names and share links; old cascade and archetype links still
  resolve.
- `meta:add` now edits YAML and rebuilds the compiled presets.

## 0.5.0 — 2026-11-21

Inventory preview with original icons.

- Added a paper-doll preview: weapon, offhand, all four armour slots, belt,
  amulet, two rings, jewel and two flasks.
- Added the 12 x 5 inventory grid with representative drops, including the
  reported leak cases.
- Original FilterPath SVG icons per equipment and loot class; no GGG art.
- Tapping a tile shows the matching rule, its index and whether it is shown or
  hidden.
- Shown/hidden counts and a show-hidden toggle make strictness changes visible.
- Moved the full-width preview above the generated filter text.

## 0.4.0 — 2026-11-21

Family, skill and ascendancy selection.

- Replaced the flat 12-build grid with three steps: family, skill, ascendancy.
- Added a league selector with Covens and Standard snapshots, 20 skills each.
- Mapped all 19 ascendancies to armour, shield and jewel tags.
- Skills own weapon and offhand; two-handed skills drop the offhand.
- Compact file names such as `FilterPath-v0.4.0-necromancer-summon-skeletons-lev-normal.filter`.
- Old archetype share links resolve to the closest new selection.
- Added the manual `meta:add` CLI, schema tests, a PR validation workflow and a
  monthly refresh reminder.

## 0.3.1 — 2026-11-21

Changelog page and selection plan.

- Fixed the changelog link by serving `changelog.html` as a separate page.
- Documented the three-step selection model: family, then skill, then ascendancy.
- Recorded the remaining open plan items and the M2e acceptance criteria.

## 0.3.0 — 2026-11-21

Changelog, matcher and leak proof.

- Added the in-site changelog with releases and commit links.
- Added a rule matcher shared with the generated filter, as groundwork for the
  inventory preview.
- Added regression fixtures for the four items reported as leaking.
- The download panel now shows the exact in-game filter name.
- Install notes now explain that online filters and local files are separate.

## 0.2.0 — 2026-11-21

Versioned filters and safer BaseType names.

- Filter header and file name now include the build version and filter format,
  e.g. `FilterPath-v0.2.0-necro-minions-leveling-strict.filter`.
- Added `known-base-types.json`; every emitted `BaseType` is validated in CI.
- Removed unique names from `BaseType` rules (the client rejects the whole
  filter on an unknown name).
- Corrected the install path to `Documents/My Games/Path of Exile`, including
  the Proton prefix variant.
- Recorded the M0–M1 incident log and planned the inventory preview and
  directory sync.

## 0.1.0 — 2026-11-21

First working generator.

- 12 archetypes across all 7 classes, leveling and endgame presets.
- Normal, Strict and Very Strict.
- Gear, gem, currency, map/fragment and unique sections with toggles.
- Deterministic emitter, syntax validator and golden filters.
- URL-hash sharing, download, copy and a mobile action bar.
- GitHub Pages deployment with tests in CI.