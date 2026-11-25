#!/usr/bin/env node
/**
 * Proves build seeds against Path of Building.
 *
 *   POB_DIR=.cache/pob/src npm run builds:verify
 *
 * For every checkpoint in src/builds/config/checkpoints.yaml this synthesises the
 * budget gear, asks the PoB oracle (scripts/builds/pob/verify.lua) for the
 * numbers, evaluates the gates, and writes the result into the compiled build
 * JSON. Nothing here is invented: a build either passes every checkpoint or is
 * published as a draft with the failures named.
 *
 * Not shipped: PoB is a dev/CI dependency only (PLAN-BUILDS.md D6).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { evaluateGate as evaluateGatePure } from '../../src/core/builds/gates.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const seedsDir = resolve(root, 'src/builds');
const outDir = resolve(root, 'src/generated/builds');
const pobDir = resolve(root, process.env.POB_DIR ?? '.cache/pob/src');
const luaScript = resolve(root, 'scripts/builds/pob/verify.lua');

const readYaml = (path) => parse(readFileSync(path, 'utf8'));
const affixes = readYaml(resolve(seedsDir, 'gear/affixes.yaml'));
const budgets = readYaml(resolve(seedsDir, 'gear/budgets.yaml'));
const checkpoints = readYaml(resolve(seedsDir, 'config/checkpoints.yaml'));
const gates = readYaml(resolve(root, 'scripts/builds/gates.yaml'));
const knownBases = new Set(
  JSON.parse(
    readFileSync(resolve(root, 'src/core/data/known-base-types.json'), 'utf8'),
  ).names ?? [],
);

if (!existsSync(luaScript)) throw new Error('missing verify.lua');
if (!existsSync(resolve(pobDir, 'HeadlessWrapper.lua'))) {
  console.error(
    `PoB not found at ${pobDir}. Clone the pinned tag there, or set POB_DIR.`,
  );
  process.exit(1);
}

/** Slot name as PoB writes it. */
const POB_SLOT = {
  weapon: 'Weapon 1',
  offhand: 'Shield',
  helmet: 'Helmet',
  body: 'Body Armour',
  gloves: 'Gloves',
  boots: 'Boots',
  belt: 'Belt',
  amulet: 'Amulet',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
};

function affixValue(key, tier) {
  const affix = affixes[key];
  if (!affix) throw new Error(`unknown affix "${key}"`);
  const value = affix.tiers[tier] ?? affix.tiers[3];
  return { mod: affix.mod.replace('{v}', String(value)), value };
}

/**
 * Budget constraints -> one concrete item per slot. Deterministic: the same
 * budget always produces the same text, so a gate report is reproducible.
 */
function synthesizeGear(budgetId) {
  const budget = budgets[budgetId];
  if (!budget) throw new Error(`unknown gear budget "${budgetId}"`);
  const items = [];
  // Only a body armour carries the build's links; putting six sockets on a wand
  // produces an item PoB refuses to parse.
  const bodySockets = Array.from({ length: budget.links }, () => 'B').join('-');
  for (const [slot, spec] of Object.entries(budget.slots)) {
    if (!knownBases.has(spec.base)) {
      throw new Error(`${budgetId}/${slot}: unknown base "${spec.base}"`);
    }
    const lines = spec.affixes.map((key) => affixValue(key, budget.tier));
    const text = [
      'Rarity: RARE',
      `Synthesised ${slot}`,
      spec.base,
      // No `Unique ID` or `LevelReq` line: with either present PoB parses the
      // item but silently drops every explicit mod (S6), and a gate would then
      // measure a naked base type.
      `Item Level: ${budget.ilvl}`,
      'Quality: 0',
      ...(slot === 'body' ? [`Sockets: ${bodySockets}`] : []),
      'Implicits: 0',
      ...lines.map((line) => line.mod),
    ].join('\n');
    items.push({ slot: POB_SLOT[slot] ?? slot, text, expectedMods: lines.length });
  }
  return { items, budget };
}

function runOracle(spec) {
  const specPath = resolve(outDir, '.spec.json');
  writeFileSync(specPath, JSON.stringify(spec, null, 2));
  const result = spawnSync('luajit', [luaScript], {
    cwd: pobDir,
    env: {
      ...process.env,
      BUILD_SPEC: specPath,
      LUA_PATH: './?.lua;../runtime/lua/?.lua;../runtime/lua/?/init.lua;;',
      LUA_CPATH: process.env.LUA_CPATH ?? '',
    },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const line = (result.stdout ?? '')
    .split('\n')
    .reverse()
    .find((entry) => entry.startsWith('RESULT '));
  if (!line) {
    console.error(result.stdout?.split('\n').slice(-12).join('\n'));
    console.error(result.stderr?.split('\n').slice(-12).join('\n'));
    throw new Error('the PoB oracle produced no RESULT line');
  }
  return JSON.parse(line.slice('RESULT '.length));
}

function evaluateGate(checkpointId, metrics) {
  return evaluateGatePure(metrics, gates.checkpoints[checkpointId], 0);
}

/** PoB drops unparseable item lines silently, so compare against what we wrote. */
function checkItemParsing(metrics, items) {
  const failures = [];
  const reported = metrics.items ?? [];
  for (const item of items) {
    const slotKey = formatSlot(item.slot);
    const found = reported.find((entry) => entry.slot === slotKey);
    const parsed = found?.parsed ?? 0;
    if (parsed < item.expectedMods) {
      failures.push(
        `${slotKey}: PoB parsed ${parsed} of ${item.expectedMods} mods`,
      );
    }
  }
  return failures;
}

function formatSlot(slot) {
  return slot;
}

function verifySeed(seed) {
  const report = {};
  let allPass = true;
  for (const [id, checkpoint] of Object.entries(checkpoints.checkpoints)) {
    const { items, budget } = synthesizeGear(checkpoint.budget);
    const groups = (seed.skillGroups ?? []).map((group) => ({
      slot: group.slot,
      gems: group.gems.map((name, index) => ({
        name,
        level: index === 0 ? checkpoint.gemLevel : checkpoint.supportLevel,
        quality: index === 0 ? 20 : 0,
      })),
    }));
    const metrics = runOracle({
      name: `${seed.id}-${id}`,
      treeVersion: checkpoints.treeVersion,
      className: seed.class,
      ascendancyClass: seed.ascendancyName,
      mainSkill: seed.mainSkill,
      level: checkpoint.level,
      points: checkpoint.points,
      labs: checkpoint.labs,
      bandit: seed.bandit === 'kill-all' ? 'None' : seed.bandit,
      pantheon: seed.pantheon,
      targets: seed.tree?.targets ?? [],
      ascendancyPoints: seed.ascendancyOrder,
      skillGroups: groups,
      items: items.map((item) => ({ slot: item.slot, text: item.text })),
      config: [],
    });
    // PoB reports one minion's damage; the build fights with all of them.
    const minionCount = metrics.dpsSource === 'minion' ? (seed.minionCount ?? 1) : 1;
    const scaled = { ...metrics, dps: metrics.dps * minionCount };
    const gate = evaluateGate(id, scaled);
    const itemFailures = checkItemParsing(metrics, items);
    if (itemFailures.length > 0) {
      gate.pass = false;
      gate.failures.push(...itemFailures);
    }
    allPass = allPass && gate.pass;
    report[id] = {
      pass: gate.pass,
      level: checkpoint.level,
      budget: budget.links ? `${checkpoint.budget} (${budget.links}-link)` : checkpoint.budget,
      metrics: {
        dps: Math.round(scaled.dps),
        minionCount,
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
        nodes: metrics.allocated,
        ascendancy: metrics.ascendancy,
      },
      failures: gate.failures,
      tree: metrics.tree ?? undefined,
      // The guide shows what the gate measured against, not a different set.
      gear: items.map((item) => ({
        slot: item.slot,
        base: item.text.split('\n')[2],
        mods: item.text.split('\n').slice(-item.expectedMods),
        budget: checkpoint.budget,
        ilvl: budgets[checkpoint.budget].ilvl,
      })),
      gems: groups.map((group) => ({
        slot: group.slot,
        gems: group.gems.map((gem) => ({ name: gem.name, level: gem.level })),
      })),
    };
    console.log(
      `${seed.id} ${id}: ${gate.pass ? 'pass' : 'FAIL'} ` +
        `dps=${Math.round(scaled.dps).toLocaleString("en-US")} ` +
        `life=${Math.round(metrics.life)} ehp=${Math.round(metrics.ehp)} ` +
        `hit=${Math.round(metrics.physicalMaxHit)} ` +
        `res=${[metrics.fireResist, metrics.coldResist, metrics.lightningResist].map((v) => Math.round(v)).join('/')}`,
    );
    if (!gate.pass) console.log(`  ${gate.failures.join('; ')}`);
  }
  return { report, status: allPass ? 'verified' : 'draft' };
}

const files = readdirSync(seedsDir).filter((name) => name.endsWith('.yaml'));
for (const file of files) {
  const seed = readYaml(resolve(seedsDir, file));
  const path = resolve(outDir, `${seed.id}.json`);
  const build = JSON.parse(readFileSync(path, 'utf8'));
  const ascendancy = readYaml(resolve(root, 'src/presets/ascendancies.yaml'));
  const match = (ascendancy.ascendancies ?? ascendancy).find?.(
    (entry) => entry.id === seed.ascendancyId,
  );
  seed.ascendancyName = match?.name ?? seed.ascendancyId;
  const { report, status } = verifySeed(seed);
  build.gates = report;
  build.status = status;
  build.pipeline = {
    pobRef: process.env.POB_REF ?? 'v2.69.0',
    treeVersion: checkpoints.treeVersion,
    calibrated: gates.calibrated === true,
    checkedAt: new Date().toISOString(),
  };
  writeFileSync(path, `${JSON.stringify(build, null, 2)}\n`);
  console.log(`${seed.id}: ${status}`);
}
