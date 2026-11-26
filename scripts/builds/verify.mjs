#!/usr/bin/env node
/**
 * Proves build seeds against Path of Building.
 *
 *   POB_DIR=.cache/pob/src npm run builds:verify
 *
 * For every checkpoint in src/builds/config/checkpoints.yaml this plans one
 * endgame tree, derives the checkpoint by pruning it, synthesises the budget
 * gear, asks the PoB oracle (scripts/builds/pob/verify.lua) for the numbers,
 * evaluates the gates, and repairs a failing checkpoint inside the published
 * bounds. Nothing here is invented: a build either passes every checkpoint or
 * is published as a draft with the failures named.
 *
 * Not shipped: PoB is a dev/CI dependency only (PLAN-BUILDS.md D6).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  hashString,
  repairBound,
  repairScore,
  seededShuffle,
} from '../../src/core/builds/repair.ts';
import { resolveGuide } from './guide.mjs';
import {
  assertNodeCount,
  buildCheckpointSpec,
  checkItemParsing,
  checkpoints,
  encodePobCode,
  evaluateGate,
  gates,
  gateThresholdsHash,
  outDir,
  readYaml,
  root,
  runOracle,
  scaledMetrics,
  scratchDir,
  seedsDir,
  ascendancyName,
} from './pipeline.mjs';

const codeCheckpoint = 'maps-red';
const planCheckpoint = 'pinnacle';
const MAX_EVALS = 200;

function treeIds(metrics) {
  return (metrics.tree?.nodes ?? []).map((node) => node.id).sort((a, b) => a - b);
}

function makeReport({ seed, checkpointId, checkpoint, metrics, scaled, gate, gear, bracket, groups }) {
  return {
    pass: gate.pass,
    level: checkpoint.level,
    budget: gear.budget.links
      ? `${checkpoint.budget} (${gear.budget.links}-link)`
      : checkpoint.budget,
    thresholds: gates.checkpoints[checkpointId] ?? {},
    metrics: {
      dps: Math.round(scaled.dps),
      minionCount: scaled.minionCount,
      dpsSource: metrics.dpsSource,
      life: Math.round(metrics.life),
      energyShield: Math.round(metrics.energyShield ?? 0),
      ehp: Math.round(metrics.ehp),
      maxHit: Math.round(metrics.physicalMaxHit),
      resists: [
        Math.round(metrics.fireResist),
        Math.round(metrics.coldResist),
        Math.round(metrics.lightningResist),
      ],
      chaosResist: Math.round(metrics.chaosResist ?? -100),
      nodes: metrics.allocated,
      sockets: metrics.sockets ?? 0,
      ascendancy: metrics.ascendancy,
    },
    failures: gate.failures,
    tree: metrics.tree ?? undefined,
    // The guide shows what the gate measured against, not a different set. The
    // oracle's item report is the source, so a unique resolved from PoB's data
    // appears with the mods PoB actually applied.
    gear: [
      ...(metrics.items ?? [])
        .filter((item) => !item.slot.startsWith('Flask'))
        .map((item) => {
          const local = gear.items.find((entry) => entry.slot === item.slot);
          return {
            slot: item.slot,
            base: item.base ?? '',
            mods: item.mods ?? [],
            ...(local?.implicits?.length
              ? {
                  implicits: local.implicits.map((implicit) => ({
                    currency: implicit.currency,
                    mod: implicit.mod,
                  })),
                }
              : {}),
            budget: checkpoint.budget,
            ilvl: gear.budget.ilvl,
            rarity: item.text?.match(/^Rarity: (\w+)/)?.[1] ?? gear.budget.rarity ?? 'RARE',
          };
        }),
    ],
    gems: groups.map((group) => ({
      slot: group.slot,
      gems: group.gems.map((gem) => ({
        name: gem.name,
        level: gem.level,
        ...(gem.maxLevel ? { maxLevel: gem.maxLevel } : {}),
        ...(gem.note ? { note: gem.note } : {}),
      })),
    })),
    flasks: bracket.flasks ?? [],
  };
}

function evaluateTree({ seed, checkpointId, checkpoint, plan, nodes, pruneTo, xmlOut }) {
  const { spec, gear, bracket, groups } = buildCheckpointSpec(seed, checkpointId, {
    endgameNodes: plan.endgame,
    allocatedNodes: nodes,
    pruneTo,
    repairInfo: true,
  });
  const rawMetrics = runOracle(spec, { xmlOut });
  assertNodeCount(seed.id, checkpointId, rawMetrics);
  // The guide draws the jewels that are actually socketed, pinned to their
  // socket nodes, so "put this one here" is visible on the tree.
  const metrics = {
    ...rawMetrics,
    tree: rawMetrics.tree
      ? { ...rawMetrics.tree, jewels: rawMetrics.jewels ?? [] }
      : undefined,
  };
  const scaled = scaledMetrics(seed, metrics);
  const gate = evaluateGate(checkpointId, scaled);
  const itemFailures = checkItemParsing(metrics, gear.items);
  const uniqueFailures = (spec.uniques ?? []).flatMap((unique) => {
    const reported = (metrics.items ?? []).find((item) => item.slot === unique.slot);
    if (!reported) return [`${unique.slot}: PoB did not load ${unique.name}`];
    if (reported.parsed === 0) return [`${unique.slot}: PoB parsed no mods from ${unique.name}`];
    return [];
  });
  if (itemFailures.length > 0 || uniqueFailures.length > 0) {
    gate.pass = false;
    gate.failures.push(...itemFailures, ...uniqueFailures);
  }
  return {
    nodes: treeIds(metrics),
    metrics,
    scaled,
    gate,
    gear,
    bracket,
    groups,
  };
}

function evaluateCheckpoint({ seed, checkpointId, checkpoint, plan, xmlOut }) {
  return evaluateTree({
    seed,
    checkpointId,
    checkpoint,
    plan,
    nodes: null,
    pruneTo: Math.max(1, checkpoint.points - 1),
    xmlOut,
  });
}

/**
 * Bounded deterministic hill-climb (PLAN-BUILDS.md §7.5).
 *
 * Only a single swap is possible per evaluation: one removable leaf leaves the
 * tree, one adjacent endgame node joins it. Every candidate is measured by PoB,
 * so the record is what was actually tried. `nodeDelta` counts distinct nodes
 * touched and must stay inside 10 and 8% of the allocated points.
 */
function repairCheckpoint({ seed, checkpointId, checkpoint, plan, initial }) {
  const thresholds = gates.checkpoints[checkpointId];
  let current = initial;
  let added = [];
  let removed = [];
  let evals = 1;
  let round = 0;
  const initialTree = initial.metrics.tree;
  const initialScore = repairScore(initial.gate.failures, initial.scaled, thresholds);
  let currentScore = initialScore;

  while (!current.gate.pass && evals < MAX_EVALS) {
    const info = current.metrics.repair;
    if (!info) break;
    const swaps = [];
    for (const removal of info.removable) {
      for (const addition of info.addable) {
        if (!addition.via?.length) continue;
        if (addition.via.every((id) => id === removal.id)) continue;
        swaps.push([removal, addition]);
      }
    }
    if (swaps.length === 0) break;
    const allowance = Math.max(1, Math.min(24, MAX_EVALS - evals));
    const batch = seededShuffle(swaps, hashString(`${seed.id}|${checkpointId}`), round).slice(
      0,
      allowance,
    );
    const bound = repairBound(current.nodes.length);
    let best;
    for (const [removal, addition] of batch) {
      if (evals >= MAX_EVALS) break;
      const trialNodes = current.nodes.filter((id) => id !== removal.id);
      if (!trialNodes.includes(addition.id)) trialNodes.push(addition.id);
      trialNodes.sort((a, b) => a - b);
      const trialAdded = [...added, addition.id];
      const trialRemoved = [...removed, removal.id];
      const trialDelta = new Set([...trialAdded, ...trialRemoved]).size;
      if (trialDelta > bound) continue;
      const trial = evaluateTree({
        seed,
        checkpointId,
        checkpoint,
        plan,
        nodes: trialNodes,
      });
      evals += 1;
      const score = repairScore(trial.gate.failures, trial.scaled, thresholds);
      if (!best || score < best.score) {
        best = { score, trial, added: trialAdded, removed: trialRemoved, delta: trialDelta };
      }
    }
    if (!best || best.score >= currentScore) break;
    current = best.trial;
    added = best.added;
    removed = best.removed;
    currentScore = best.score;
    round += 1;
  }

  const nodeDelta = new Set([...added, ...removed]).size;
  const bound = repairBound(current.nodes.length);
  const status = nodeDelta > bound ? 'exceeded' : 'within-bound';
  const repair = {
    added: added.sort((a, b) => a - b),
    removed: removed.sort((a, b) => a - b),
    evals,
    nodeDelta,
    status,
    ...(nodeDelta > 0 && initialTree ? { seedTree: initialTree } : {}),
  };
  return { ...current, repair };
}

function planEndgame(seed) {
  const { spec } = buildCheckpointSpec(seed, planCheckpoint, {
    planOnly: true,
    name: `${seed.id}-endgame-plan`,
  });
  return runOracle(spec);
}

function verifySeed(seed) {
  const plan = planEndgame(seed);
  if (!plan.endgame?.length) {
    throw new Error(`${seed.id}: the planner produced no endgame tree`);
  }
  const report = {};
  const checkpointTrees = {};
  let allPass = true;
  const codeXmlPath = resolve(scratchDir, `${seed.id}-${codeCheckpoint}.xml`);

  for (const [id, checkpoint] of Object.entries(checkpoints.checkpoints)) {
    const initial = evaluateCheckpoint({
      seed,
      checkpointId: id,
      checkpoint,
      plan,
      xmlOut: id === codeCheckpoint ? codeXmlPath : undefined,
    });
    const repaired = repairCheckpoint({
      seed,
      checkpointId: id,
      checkpoint,
      plan,
      initial,
    });
    const { metrics, scaled, gate, gear, bracket, groups } = repaired;
    allPass = allPass && gate.pass;
    checkpointTrees[id] = repaired.nodes;
    const entry = makeReport({
      seed,
      checkpointId: id,
      checkpoint,
      metrics,
      scaled,
      gate,
      gear,
      bracket,
      groups,
    });
    entry.repair = repaired.repair;
    report[id] = entry;
    console.log(
      `${seed.id} ${id}: ${gate.pass ? 'pass' : 'FAIL'} ` +
        `dps=${Math.round(scaled.dps).toLocaleString('en-US')} ` +
        `life=${Math.round(metrics.life)} ehp=${Math.round(metrics.ehp)} ` +
        `hit=${Math.round(metrics.physicalMaxHit)} ` +
        `res=${[metrics.fireResist, metrics.coldResist, metrics.lightningResist]
          .map((value) => Math.round(value))
          .join('/')}` +
        (repaired.repair.nodeDelta
          ? ` repair=-${repaired.repair.removed.length}+${repaired.repair.added.length}`
          : ''),
    );
    if (!gate.pass) console.log(`  ${gate.failures.join('; ')}`);
  }
  if (!existsSync(codeXmlPath)) {
    throw new Error(`${seed.id}: the ${codeCheckpoint} oracle run wrote no XML`);
  }
  return {
    report,
    tree: {
      endgame: [...plan.endgame].sort((a, b) => a - b),
      checkpoints: checkpointTrees,
    },
    status: allPass ? 'verified' : 'draft',
    pob: {
      ref: process.env.POB_REF ?? 'v2.69.0',
      checkpoint: codeCheckpoint,
      code: encodePobCode(readFileSync(codeXmlPath, 'utf8')),
    },
  };
}

const calibrationPath = resolve(outDir, 'calibration.json');
const calibration = existsSync(calibrationPath)
  ? JSON.parse(readFileSync(calibrationPath, 'utf8'))
  : null;
const patchFacts = JSON.parse(
  readFileSync(resolve(root, 'src/generated/patch-facts.json'), 'utf8'),
);
const calibrated =
  gates.calibrated === true &&
  calibration?.verified === true &&
  calibration?.gatesHash === gateThresholdsHash();
if (gates.calibrated === true && !calibrated) {
  console.warn(
    'calibration report is missing, failed, or out of date; publishing as uncalibrated',
  );
}

const files = readdirSync(seedsDir).filter((name) => name.endsWith('.yaml'));
for (const file of files) {
  const seed = readYaml(resolve(seedsDir, file));
  seed.ascendancyName = ascendancyName(seed);
  const path = resolve(outDir, `${seed.id}.json`);
  const build = JSON.parse(readFileSync(path, 'utf8'));
  const { report, tree, status, pob } = verifySeed(seed);
  // D22: a verification stamp only moves when a measured value moves, so a
  // nightly re-run that proves the same numbers produces no diff and no PR.
  const unchanged = JSON.stringify(build.gates) === JSON.stringify(report);
  build.gates = report;
  build.tree = tree;
  build.pob = pob;
  build.patch = patchFacts.patch;
  build.status = status;
  const { guide, errors: guideErrors } = resolveGuide(build, seed.guide, {
    previous: build.guide,
  });
  if (guideErrors.length > 0) {
    throw new Error(`${seed.id}: guide invalid\n  ${guideErrors.join('\n  ')}`);
  }
  build.guide = guide;
  if (guide.summary.status === 'stale') build.status = 'draft';
  // A one-click pob.cool link needs a URL whose body is the code, not our JSON.
  // This is the same published code the copy button shows; it is not an XML
  // download, and it keeps the reader on the pinned PoB version.
  const publicBuilds = resolve(root, 'public/builds');
  mkdirSync(publicBuilds, { recursive: true });
  writeFileSync(resolve(publicBuilds, `${seed.id}.pob`), pob.code);
  build.pipeline = {
    pobRef: process.env.POB_REF ?? 'v2.69.0',
    treeVersion: checkpoints.treeVersion,
    patchHash: patchFacts.patchHash,
    calibrated,
    checkedAt:
      unchanged && build.pipeline?.checkedAt
        ? build.pipeline.checkedAt
        : new Date().toISOString(),
  };
  writeFileSync(path, `${JSON.stringify(build, null, 2)}\n`);
  console.log(`${seed.id}: ${status}`);
}
