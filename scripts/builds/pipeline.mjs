#!/usr/bin/env node
/**
 * Shared build-pipeline primitives.
 *
 * The verifier, the calibration runner and the PoB-code checker all have to
 * agree on what a checkpoint means. Keeping gear synthesis, gem levels, the
 * oracle call and gate evaluation here is what stops them drifting: a
 * calibration fixture and a published seed are measured by the same code.
 *
 * Nothing here touches the browser. PoB remains a dev/CI dependency only
 * (PLAN-BUILDS.md D6).
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { evaluateGate as evaluateGatePure } from '../../src/core/builds/gates.ts';
import { findUtf8Cpath, LUA_PATH } from './pob/lua-env.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const seedsDir = resolve(root, 'src/builds');
export const outDir = resolve(root, 'src/generated/builds');
export const scratchDir = resolve(root, '.cache/builds');
export const pobDir = resolve(root, process.env.POB_DIR ?? '.cache/pob/src');
export const luaScript = resolve(root, 'scripts/builds/pob/verify.lua');

export const readYaml = (path) => parse(readFileSync(path, 'utf8'));

export const affixes = readYaml(resolve(seedsDir, 'gear/affixes.yaml'));
export const budgets = readYaml(resolve(seedsDir, 'gear/budgets.yaml'));
export const profileDefs = readYaml(resolve(seedsDir, 'gear/profiles.yaml'));
export const eldritchDefs = readYaml(resolve(seedsDir, 'gear/eldritch.yaml'));
export const checkpoints = readYaml(resolve(seedsDir, 'config/checkpoints.yaml'));
export const gates = readYaml(resolve(root, 'scripts/builds/gates.yaml'));

/**
 * Hash only the thresholds, never the `calibrated` flag: flipping the flag is
 * the result of a green calibration, not a reason to invalidate its report.
 */
export function gateThresholdsHash() {
  return createHash('sha256')
    .update(
      JSON.stringify({
        resistanceFloor: gates.resistanceFloor,
        checkpoints: gates.checkpoints,
        profiles: gates.profiles ?? {},
      }),
    )
    .digest('hex')
    .slice(0, 12);
}
export const knownBases = new Set(
  JSON.parse(
    readFileSync(resolve(root, 'src/core/data/known-base-types.json'), 'utf8'),
  ).names ?? [],
);
export const gemLevels = JSON.parse(
  readFileSync(resolve(root, 'src/generated/gem-levels.json'), 'utf8'),
).gems;

/**
 * PoB's config defaults put a level-83 monster in front of every checkpoint,
 * including a level-12 one: `enemyLevel` moves the enemy's accuracy and life,
 * but evasion is a separate input that stays at 10k. Read the oracle's own
 * table so the early gates face the monster a character that level fights.
 */
export const monsterEvasion = (() => {
  const path = resolve(pobDir, 'Data/Misc.lua');
  if (!existsSync(path)) return [];
  const match = readFileSync(path, 'utf8').match(/monsterEvasionTable = \{([^}]*)\}/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));
})();

export const LUA_CPATH = findUtf8Cpath();

/**
 * A checkpoint cannot be measured without the pinned oracle. Call this only
 * from scripts that actually need PoB, so `builds:build` stays offline.
 */
export function requireOracle() {
  if (!existsSync(luaScript)) throw new Error('missing verify.lua');
  if (!existsSync(resolve(pobDir, 'HeadlessWrapper.lua'))) {
    throw new Error(`PoB not found at ${pobDir}. Clone the pinned tag there, or set POB_DIR.`);
  }
  if (!LUA_CPATH) {
    throw new Error(
      'lua-utf8 was not found. Install it (e.g. luajitPackages.luautf8) or set LUA_CPATH.',
    );
  }
}

/**
 * The highest gem level a character of `characterLevel` can hold, capped by
 * the checkpoint. A level-12 Witch cannot hold a level-2 Summon Skeletons
 * (that needs 13), so the answer comes from the gem's own table, not a guess.
 */
export function gemLevelFor(name, characterLevel, cap = 20) {
  const table = gemLevels[name]?.levels;
  if (!table) return null;
  let best = 0;
  for (const [level, required] of Object.entries(table)) {
    const gemLevel = Number(level);
    if (gemLevel <= cap && required <= characterLevel) best = Math.max(best, gemLevel);
  }
  return best;
}

/**
 * Slot name as PoB writes it. A shield or quiver lives in "Weapon 2"; "Shield"
 * is a type, not a slot, so PoB silently ignored it when it was used here.
 */
export const POB_SLOT = {
  weapon: 'Weapon 1',
  offhand: 'Weapon 2',
  helmet: 'Helmet',
  body: 'Body Armour',
  gloves: 'Gloves',
  boots: 'Boots',
  belt: 'Belt',
  amulet: 'Amulet',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
};

/**
 * Eldritch implicits for a profile and budget. Only the maps-red and pinnacle
 * budgets carry them; the act budgets stay what a character can actually buy.
 */
export function eldritchFor(profileId, budgetId) {
  const profiles = eldritchDefs.profiles ?? {};
  const profile = profiles[profileId] ?? profiles.caster ?? {};
  return profile[budgetId] ?? {};
}

export function affixValue(key, tier) {
  const affix = affixes[key];
  if (!affix) throw new Error(`unknown affix "${key}"`);
  const value = affix.tiers[tier] ?? affix.tiers[3];
  if (Array.isArray(value)) {
    const [low, high] = value;
    return {
      mod: affix.mod.replace('{v}', String(low)).replace('{v2}', String(high)),
      value: high,
    };
  }
  return { mod: affix.mod.replace('{v}', String(value)), value };
}

/**
 * Budget constraints -> one concrete item per slot. Deterministic: the same
 * budget and profile always produce the same text, so a gate report is
 * reproducible.
 *
 * The budget is the test condition and is shared; the profile is what the
 * archetype wears under it (`gear/profiles.yaml`). A profile may override a
 * slot or the jewel carry, and anything it leaves out stays as the budget's
 * shared slot.
 *
 * `options` is for calibration and repair only. A verified seed never reaches
 * it: `links` and `stripAffixes` exist so a must-fail fixture can be measured
 * by the same synthesiser instead of by a hand-written item.
 */
export function synthesizeGear(budgetId, profileId = 'caster', options = {}) {
  const budget = budgets[budgetId];
  if (!budget) throw new Error(`unknown gear budget "${budgetId}"`);
  const profiles = profileDefs.profiles ?? {};
  if (!profiles[profileId]) {
    throw new Error(`unknown gear profile "${profileId}" (see gear/profiles.yaml)`);
  }
  const override = profiles[profileId]?.[budgetId] ?? {};
  const slots = { ...budget.slots, ...(override.slots ?? {}) };
  const jewelSpec = override.jewels ?? budget.jewels ?? {};
  const links = options.links ?? budget.links;
  const strip = new Set(options.stripAffixes ?? []);
  const dropSlots = new Set(options.dropSlots ?? []);
  const eldritch = options.eldritch ?? {};
  const items = [];
  // Only a body armour carries the build's links; putting six sockets on a wand
  // produces an item PoB refuses to parse.
  const bodySockets = Array.from({ length: links }, () => 'B').join('-');
  for (const [slot, spec] of Object.entries(slots)) {
    if (dropSlots.has(slot)) continue;
    if (!knownBases.has(spec.base)) {
      throw new Error(`${budgetId}/${slot}: unknown base "${spec.base}"`);
    }
    const lines = spec.affixes
      .filter((key) => !strip.has(key))
      .map((key) => affixValue(key, budget.tier));
    const implicits = eldritch[slot] ?? [];
    const text = [
      `Rarity: ${budget.rarity ?? 'RARE'}`,
      `Synthesised ${slot}`,
      spec.base,
      // No `Unique ID` or `LevelReq` line: with either present PoB parses the
      // item but silently drops every explicit mod (S6), and a gate would then
      // measure a naked base type.
      `Item Level: ${budget.ilvl}`,
      `Quality: ${budget.quality ?? 0}`,
      ...(slot === 'body' ? [`Sockets: ${bodySockets}`] : []),
      `Implicits: ${implicits.length}`,
      ...implicits.map((implicit) => implicit.mod),
      ...lines.map((line) => line.mod),
    ].join('\n');
    items.push({
      slot: POB_SLOT[slot] ?? slot,
      text,
      expectedMods: lines.length,
      expectedImplicits: implicits.length,
      implicits,
    });
  }
  // Jewels are the carry slot: a summoner's Ghastly Eye, a ranger's Viridian.
  const jewels = [];
  const jewelCount = Math.min(jewelSpec.count ?? 0, options.maxJewels ?? Infinity);
  const jewelAffixes = jewelSpec.affixes ?? [];
  const jewelBase = jewelSpec.base ?? 'Ghastly Eye Jewel';
  if (jewelCount > 0 && !knownBases.has(jewelBase)) {
    throw new Error(`${budgetId}: unknown jewel base "${jewelBase}"`);
  }
  for (let index = 0; index < jewelCount; index += 1) {
    const lines = jewelAffixes
      .filter((key) => !strip.has(key))
      .map((key) => affixValue(key, budget.tier).mod);
    jewels.push({
      text: [
        'Rarity: RARE',
        `Synthesised jewel ${index + 1}`,
        jewelBase,
        `Item Level: ${budget.ilvl}`,
        'Implicits: 0',
        ...lines,
      ].join('\n'),
      expectedMods: lines.length,
    });
  }
  return { items, jewels, budget, jewelBase };
}

/**
 * The flasks the guide tells you to carry are part of the build, so the oracle
 * equips them and PoB treats an equipped flask as active (the seed declares the
 * uptime). Without this the gate measured a build the reader never plays.
 */
export function synthesizeFlasks(flasks, budget) {
  return (flasks ?? []).slice(0, 5).map((flask, index) => ({
    slot: `Flask ${index + 1}`,
    text: [
      'Rarity: MAGIC',
      `Synthesised ${flask.slot} flask`,
      flask.name,
      `Item Level: ${budget.ilvl}`,
      `Quality: ${budget.quality ?? 0}`,
      'Implicits: 0',
    ].join('\n'),
  }));
}

export function runOracle(spec, { xmlOut } = {}) {
  requireOracle();
  mkdirSync(scratchDir, { recursive: true });
  const specPath = resolve(scratchDir, `${spec.name}.spec.json`);
  writeFileSync(specPath, JSON.stringify(spec, null, 2));
  const result = spawnSync('luajit', [luaScript], {
    cwd: pobDir,
    env: {
      ...process.env,
      BUILD_SPEC: specPath,
      ...(xmlOut ? { BUILD_XML_OUT: xmlOut } : {}),
      LUA_PATH,
      LUA_CPATH,
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

export function gateThresholds(checkpointId, profile = 'standard') {
  const base = gates.checkpoints[checkpointId];
  const overlay = profile === 'dad' ? gates.profiles?.dad?.[checkpointId] : undefined;
  return overlay ? { ...base, ...overlay } : base;
}

export function evaluateGate(checkpointId, metrics, profile = 'standard') {
  return evaluateGatePure(metrics, gateThresholds(checkpointId, profile), 0);
}

/** PoB drops unparseable item lines silently, so compare against what we wrote. */
export function checkItemParsing(metrics, items) {
  const failures = [];
  const reported = metrics.items ?? [];
  for (const item of items) {
    const found = reported.find((entry) => entry.slot === item.slot);
    const parsed = found?.parsed ?? 0;
    const implicitParsed = found?.implicitParsed ?? 0;
    if (parsed < item.expectedMods) {
      failures.push(`${item.slot}: PoB parsed ${parsed} of ${item.expectedMods} mods`);
    }
    if (implicitParsed < (item.expectedImplicits ?? 0)) {
      failures.push(
        `${item.slot}: PoB parsed ${implicitParsed} of ${item.expectedImplicits} implicits`,
      );
    }
  }
  return failures;
}

/**
 * The published PoB code is the `maps-red` XML, deflated and encoded exactly as
 * PoB's own import tab does it (D19, D24). The same serialiser produces the XML
 * the oracle loaded and the code the reader imports, so "what we tested" and
 * "what you paste" cannot drift apart.
 */
export function encodePobCode(xml) {
  return deflateSync(Buffer.from(xml, 'utf8'))
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_');
}

/** The bracket a checkpoint's level falls into. */
export function bracketFor(seed, level) {
  return (
    seed.leveling.brackets.find((entry) => entry.until >= level) ??
    seed.leveling.brackets.at(-1)
  );
}

/** Resolve the seed's ascendancy id to the name PoB and TreeData use. */
export function ascendancyName(seed) {
  const table = readYaml(resolve(root, 'src/presets/ascendancies.yaml'));
  const list = table.ascendancies ?? table;
  const match = list.find?.((entry) => entry.id === seed.ascendancyId);
  return match?.name ?? seed.ascendancyId;
}

/**
 * Build the oracle spec for one checkpoint. Every caller (verify, calibration,
 * repair) goes through this, so a mutation is the only difference between a
 * published seed and a calibration fixture.
 */
export function buildCheckpointSpec(seed, checkpointId, options = {}) {
  const checkpoint = checkpoints.checkpoints[checkpointId];
  if (!checkpoint) throw new Error(`unknown checkpoint "${checkpointId}"`);
  const profileId = options.profileId ?? seed.gearProfile ?? 'caster';
  const budgetId = options.budgetId ?? checkpoint.budget;
  const level = options.level ?? checkpoint.level;
  const gemCap = options.gemLevelCap ?? checkpoint.gemLevelCap ?? 20;
  const points = options.points ?? checkpoint.points;
  const labs = options.labs ?? checkpoint.labs;
  const bracket = bracketFor(seed, level);

  const maxJewels = options.maxJewels ?? Infinity;
  const eldritch =
    options.eldritch !== undefined ? options.eldritch : eldritchFor(profileId, budgetId);
  const gear = synthesizeGear(budgetId, profileId, {
    links: options.links,
    stripAffixes: options.stripAffixes,
    dropSlots: options.dropSlots,
    eldritch,
    maxJewels,
  });
  // A core unique replaces the synthesised rare in its slot; the synthesised
  // rare is still what an ablation run measures.
  const uniques = uniqueSpecsFor(seed, budgetId, gear.budget.links, options.uniques);
  if (uniques.length > 0) {
    const uniqueSlots = new Set(uniques.map((unique) => unique.slot));
    gear.items = gear.items.filter((item) => !uniqueSlots.has(item.slot));
  }
  const dropped = new Set(options.dropGems ?? []);
  const groups = (bracket.skillGroups ?? [])
    .map((group) => ({
      slot: group.slot,
      gems: group.gems
        .map((gem) => {
          const name = typeof gem === 'string' ? gem : gem.name;
          const maxLevel = typeof gem === 'string' ? undefined : gem.maxLevel;
          const note = typeof gem === 'string' ? undefined : gem.note;
          const cap = Math.min(gemCap, maxLevel ?? 40);
          const gemLevel = gemLevelFor(name, level, cap);
          if (gemLevel === null) {
            throw new Error(
              `${seed.id}/${bracket.until}: unknown gem "${name}" in ${group.slot}`,
            );
          }
          return {
            name,
            level: gemLevel,
            quality: checkpoint.gemQuality ?? 0,
            ...(maxLevel ? { maxLevel } : {}),
            ...(note ? { note } : {}),
          };
        })
        .filter((gem) => !dropped.has(gem.name)),
    }))
    .filter((group) => group.gems.length > 0);
  if (options.maxGroupGems) {
    for (const group of groups) group.gems = group.gems.slice(0, options.maxGroupGems);
  }
  if (options.dropMainGroup) groups.splice(0, groups.length);

  const flasks = options.dropFlasks ? [] : synthesizeFlasks(bracket.flasks, gear.budget);

  const spec = {
    name: options.name ?? `${seed.id}-${checkpointId}`,
    treeVersion: checkpoints.treeVersion,
    className: seed.class,
    ascendancyClass: seed.ascendancyName ?? ascendancyName(seed),
    mainSkill: seed.mainSkill,
    level,
    points,
    labs,
    bandit: seed.bandit === 'kill-all' ? 'None' : seed.bandit,
    pantheon: seed.pantheon,
    targets: options.targets ?? seed.tree?.targets ?? [],
    keystones: options.keystones ?? seed.tree?.keystones ?? [],
    ascendancyPoints: seed.ascendancyOrder,
    spectres: seed.spectres ?? [],
    skillGroups: groups,
    items: gear.items.map((item) => ({ slot: item.slot, text: item.text })),
    jewels: gear.jewels.map((jewel) => ({ text: jewel.text, base: gear.jewelBase })),
    flasks,
    jewelCount: gear.jewels.length,
    config: [
      { name: 'enemyLevel', value: `number="${checkpoint.enemyLevel ?? 83}"` },
      ...(monsterEvasion[(checkpoint.enemyLevel ?? 83) - 1]
        ? [{
            name: 'enemyEvasion',
            value: `number="${monsterEvasion[(checkpoint.enemyLevel ?? 83) - 1]}"`,
          }]
        : []),
      ...(seed.config ?? []),
    ],
    ...(options.planOnly ? { planOnly: true } : {}),
    ...(options.endgameNodes ? { endgameNodes: options.endgameNodes } : {}),
    ...(options.allocatedNodes ? { allocatedNodes: options.allocatedNodes } : {}),
    ...(options.pruneTo ? { pruneTo: options.pruneTo } : {}),
    ...(options.repairInfo ? { repairInfo: true } : {}),
    ...(uniques.length > 0 ? { uniques } : {}),
  };
  return { spec, gear, bracket, groups, checkpoint };
}

/** Compare what PoB reported with what the seed planned. */
export function assertNodeCount(seedId, checkpointId, metrics) {
  const expectedNodes = (metrics.tree?.nodes.length ?? 0) + (metrics.ascendancy ?? 0);
  if (metrics.specNodes !== expectedNodes) {
    throw new Error(
      `${seedId}/${checkpointId}: PoB allocated ${metrics.specNodes} nodes, the planner wrote ${expectedNodes}`,
    );
  }
}

/** Core uniques are allowed once the budget is past the first week (D24, §8). */
export function budgetAllowsUniques(budgetId) {
  return budgetId === 'ssf-week1' || budgetId === 'trade';
}

/**
 * Seed uniques use the guide's slot names; PoB uses its own. A ring is Ring 1
 * unless the build says otherwise, and a weapon is always Weapon 1.
 */
export function uniqueSpecsFor(seed, budgetId, links, overrides) {
  if (overrides !== undefined) return overrides;
  if (!budgetAllowsUniques(budgetId)) return [];
  return (seed.uniques?.core ?? []).map((unique) => ({
    name: unique.displayName,
    slot: POB_SLOT[unique.slot] ?? unique.slot,
    kind: unique.slot,
    links: links ?? 0,
  }));
}

/** Minion-reported DPS is one minion; the build fights with all of them. */
export function scaledMetrics(seed, metrics) {
  const minionCount = metrics.dpsSource === 'minion' ? (seed.minionCount ?? 1) : 1;
  return {
    ...metrics,
    dps: metrics.dps * minionCount,
    minionCount,
    chaosResist: metrics.chaosResist,
  };
}
