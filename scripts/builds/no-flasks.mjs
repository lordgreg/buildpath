#!/usr/bin/env node
/**
 * Records the no-flask validation for every measured step.
 *
 *   npm run builds:no-flasks
 *
 * The standard gate report is measured with the step's listed flasks active
 * (verify.lua marks every flask slot active). This script re-runs the committed
 * trees with no flasks and writes a separate report, so a review can ask both
 * questions without mixing the two scenarios. It does not touch the build JSON
 * or the published PoB codes.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  assertNodeCount,
  ascendancyName,
  buildCheckpointSpec,
  evaluateGate,
  gateThresholds,
  gateThresholdsHash,
  measuredCheckpointsFor,
  outDir,
  readYaml,
  runOracle,
  scaledMetrics,
  seedsDir,
} from './pipeline.mjs';

const reportPath = resolve(outDir, 'validation/no-flasks.json');
const buildFiles = readdirSync(outDir)
  .filter(
    (name) =>
      name.endsWith('.json') &&
      name !== 'index.json' &&
      name !== 'calibration.json' &&
      name !== 'pob-links.json',
  )
  .sort();

if (buildFiles.length === 0) {
  console.error('no compiled builds found; run `npm run builds:build` first');
  process.exit(1);
}

const results = [];
let allPass = true;

for (const file of buildFiles) {
  const build = JSON.parse(readFileSync(resolve(outDir, file), 'utf8'));
  const seedPath = resolve(seedsDir, `${build.id}.yaml`);
  if (!existsSync(seedPath)) continue;
  const seed = readYaml(seedPath);
  seed.ascendancyName = ascendancyName(seed);
  const steps = measuredCheckpointsFor(seed);
  let passed = 0;

  for (const step of steps) {
    const nodes = build.tree?.checkpoints?.[step.id];
    if (!nodes) {
      throw new Error(`${build.id}/${step.id}: no committed tree for the no-flask run`);
    }
    const { spec } = buildCheckpointSpec(seed, step.id, {
      checkpoint: step,
      allocatedNodes: nodes,
      dropFlasks: true,
    });
    spec.name = `${build.id}-${step.id}-noflasks`;
    const metrics = runOracle(spec);
    assertNodeCount(build.id, step.id, metrics);
    const scaled = scaledMetrics(seed, metrics);
    const gate = evaluateGate(step, scaled, seed.gateProfile ?? 'standard');
    if (gate.pass) passed += 1;
    else allPass = false;
    results.push({
      id: `${build.id}/${step.id}`,
      seed: build.id,
      step: step.id,
      metrics: {
        dps: Math.round(scaled.dps),
        life: Math.round(metrics.life),
        ehp: Math.round(metrics.ehp),
        maxHit: Math.round(metrics.physicalMaxHit),
        chaosResist: Math.round(metrics.chaosResist ?? -100),
      },
      thresholds: gateThresholds(step, seed.gateProfile ?? 'standard'),
      pass: gate.pass,
      failures: gate.failures,
    });
  }

  console.log(`${build.id}: ${passed}/${steps.length} no-flask steps pass`);
}

const failures = results.filter((result) => !result.pass);
const report = {
  schemaVersion: 1,
  scenario: 'no-flasks',
  pobRef: process.env.POB_REF ?? 'v2.69.0',
  gatesHash: gateThresholdsHash(),
  allPass,
  failedCount: failures.length,
  stepCount: results.length,
  results,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `no-flask validation: ${results.length} steps across ${buildFiles.length} builds, ` +
    `${allPass ? 'all pass' : `${failures.length} below floor`} -> ${reportPath}`,
);
if (failures.length > 0) {
  console.log('below floor:');
  for (const failure of failures) {
    console.log(`  ${failure.id}: ${failure.failures.join('; ')}`);
  }
}

// A validation report records the scenario; it is not a second gate. `--strict`
// is for a future release check that wants every build to clear the floors
// without flask bonuses.
if (process.argv.includes('--strict') && !allPass) process.exitCode = 1;
