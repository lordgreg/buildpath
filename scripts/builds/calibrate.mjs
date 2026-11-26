#!/usr/bin/env node
/**
 * Calibrates the gates in both directions (PLAN-BUILDS.md §8, D20).
 *
 *   POB_DIR=.cache/pob/src npm run builds:calibrate
 *
 * Must-pass: the three P2 seeds at every checkpoint, re-geared by the same
 * synthesiser the verifier uses. Must-fail: ten declarative mutations, each
 * caused by one named defect. A pass where a failure is expected means the gate
 * is too loose; a failure where a pass is expected means it is too strict.
 *
 * The committed report is evidence, not a log: `verify.mjs` only marks the
 * catalogue calibrated when this report matches the current gates.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertNodeCount,
  ascendancyName,
  buildCheckpointSpec,
  checkpoints,
  evaluateGate,
  gates,
  gateThresholdsHash,
  outDir,
  readYaml,
  runOracle,
  scaledMetrics,
  seedsDir,
} from './pipeline.mjs';

const gatesHash = gateThresholdsHash();
const calibration = readYaml(resolve(seedsDir, 'config/calibration.yaml'));
const seedFiles = readdirSync(seedsDir).filter((name) => name.endsWith('.yaml')).sort();
const seeds = new Map(
  seedFiles.map((file) => {
    const seed = readYaml(resolve(seedsDir, file));
    seed.ascendancyName = ascendancyName(seed);
    return [seed.id, seed];
  }),
);

const planCache = new Map();
function endgamePlan(seed) {
  if (!planCache.has(seed.id)) {
    const { spec } = buildCheckpointSpec(seed, 'pinnacle', {
      planOnly: true,
      name: `${seed.id}-calibration-plan`,
    });
    const plan = runOracle(spec);
    if (!plan.endgame?.length) throw new Error(`${seed.id}: no endgame tree`);
    planCache.set(seed.id, plan);
  }
  return planCache.get(seed.id);
}

function evaluate(seedId, checkpointId, mutate = {}) {
  const seed = seeds.get(seedId);
  if (!seed) throw new Error(`unknown calibration seed "${seedId}"`);
  const checkpoint = checkpoints.checkpoints[checkpointId];
  if (!checkpoint) throw new Error(`unknown calibration checkpoint "${checkpointId}"`);
  const plan = endgamePlan(seed);
  const points = mutate.points ?? checkpoint.points;
  const { spec, gear } = buildCheckpointSpec(seed, checkpointId, {
    endgameNodes: plan.endgame,
    pruneTo: Math.max(1, points - 1),
    ...mutate,
  });
  const metrics = runOracle(spec);
  assertNodeCount(seed.id, checkpointId, metrics);
  const scaled = scaledMetrics(seed, metrics);
  const gate = gates.checkpoints[checkpointId];
  const result = evaluateGate(checkpointId, scaled);
  return {
    seed: seed.id,
    checkpoint: checkpointId,
    metrics: {
      dps: Math.round(scaled.dps),
      life: Math.round(metrics.life),
      ehp: Math.round(metrics.ehp),
      maxHit: Math.round(metrics.physicalMaxHit),
      chaosResist: Math.round(metrics.chaosResist ?? -100),
    },
    gear: gear.items.length,
    items: metrics.items ?? [],
    thresholds: gate,
    ...result,
  };
}

const mustPass = [];
const passSeeds =
  calibration.mustPass?.seeds === 'all' ? [...seeds.keys()].sort() : calibration.mustPass?.seeds ?? [];
const passCheckpoints =
  calibration.mustPass?.checkpoints === 'all'
    ? Object.keys(checkpoints.checkpoints)
    : calibration.mustPass?.checkpoints ?? [];
for (const seedId of passSeeds) {
  for (const checkpointId of passCheckpoints) {
    const { items, ...result } = evaluate(seedId, checkpointId);
    mustPass.push({ id: `${seedId}/${checkpointId}`, ...result });
  }
}

const mustFail = [];
for (const fixture of calibration.mustFail ?? []) {
  const { items, ...result } = evaluate(fixture.seed, fixture.checkpoint, fixture.mutate ?? {});
  const expected = fixture.failures ?? [];
  const matched = expected.every((substring) =>
    result.failures.some((failure) => failure.includes(substring)),
  );
  mustFail.push({
    id: fixture.id,
    ...result,
    expectedFailures: expected,
    causedByExpectedDefect: matched,
  });
}

const uniqueProbe = [];
for (const fixture of calibration.uniqueProbe ?? []) {
  const withUnique = evaluate(fixture.seed, fixture.checkpoint, {
    uniques: [fixture.unique],
  });
  const ablated = evaluate(fixture.seed, fixture.checkpoint, { uniques: [] });
  const parsed = withUnique.items.find((item) => item.slot === fixture.unique.slot);
  const ablationDrop =
    withUnique.metrics.dps > 0
      ? (withUnique.metrics.dps - ablated.metrics.dps) / withUnique.metrics.dps
      : null;
  uniqueProbe.push({
    id: fixture.id,
    seed: fixture.seed,
    checkpoint: fixture.checkpoint,
    unique: fixture.unique.name,
    parsedMods: parsed?.parsed ?? 0,
    baseDps: withUnique.metrics.dps,
    ablatedDps: ablated.metrics.dps,
    ablationDrop: ablationDrop === null ? null : Math.round(ablationDrop * 1000) / 1000,
  });
}

const passFailures = mustPass.filter((entry) => !entry.pass);
const failPasses = mustFail.filter((entry) => entry.pass);
const wrongDefect = mustFail.filter((entry) => !entry.pass && !entry.causedByExpectedDefect);
const badProbe = uniqueProbe.filter(
  (entry) => entry.parsedMods === 0 || entry.ablationDrop === null,
);
const verified =
  mustPass.length >= 10 &&
  mustFail.length >= 10 &&
  uniqueProbe.length >= 1 &&
  passFailures.length === 0 &&
  failPasses.length === 0 &&
  wrongDefect.length === 0 &&
  badProbe.length === 0;

const report = {
  schemaVersion: 1,
  pobRef: process.env.POB_REF ?? 'v2.69.0',
  gatesHash,
  verified,
  mustPass,
  mustFail,
  uniqueProbe,
};
writeFileSync(
  resolve(outDir, 'calibration.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.log(
  `calibration: ${mustPass.length} must-pass, ${mustFail.length} must-fail, ` +
    `${uniqueProbe.length} ablation probe, ${verified ? 'green' : 'FAILED'}`,
);
for (const entry of passFailures) {
  console.log(`  must-pass failed: ${entry.id}: ${entry.failures.join('; ')}`);
}
for (const entry of failPasses) {
  console.log(`  must-fail passed: ${entry.id} (the gate is too loose)`);
}
for (const entry of wrongDefect) {
  console.log(
    `  must-fail failed for the wrong reason: ${entry.id}: ` +
      `${entry.failures.join('; ')} (expected ${entry.expectedFailures.join(', ')})`,
  );
}
for (const entry of badProbe) {
  console.log(
    `  ablation probe failed: ${entry.id}: parsed ${entry.parsedMods} mods, drop ${entry.ablationDrop}`,
  );
}

if (!verified) process.exit(1);
