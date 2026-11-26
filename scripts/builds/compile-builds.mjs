#!/usr/bin/env node
/**
 * Compiles every build seed under src/builds/ into committed JSON.
 *
 * The browser never parses YAML, and the pipeline never invents a build: this
 * script only validates a hand-written seed and adds the fields the site needs.
 * Provenance (gates, PoB code, patch) is added later by the PoB pipeline; until
 * then a build compiles as `draft`.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';
import { resolveGuide } from './guide.mjs';
import { leagueWindowOpen } from '../../src/core/builds/staleness.ts';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const seedsDir = resolve(root, 'src/builds');
const schemaPath = resolve(root, 'src/presets/schema/build.schema.json');
const outDir = resolve(root, 'src/generated/builds');

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function fail(file, errors) {
  const detail = (errors ?? [])
    .map((error) => `  ${error.instancePath || '/'} ${error.message ?? ''}`)
    .join('\n');
  console.error(`build seed invalid: ${file}\n${detail}`);
  process.exit(1);
}

function hashOf(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 12);
}

const gemLevels = JSON.parse(
  readFileSync(resolve(root, 'src/generated/gem-levels.json'), 'utf8'),
).gems;
const gearProfiles =
  parse(readFileSync(resolve(seedsDir, 'gear/profiles.yaml'), 'utf8')).profiles ?? {};
const pantheon = parse(
  readFileSync(resolve(seedsDir, 'config/pantheon.yaml'), 'utf8'),
);
const ascendanciesFull = parse(
  readFileSync(resolve(seedsDir, 'config/ascendancies-full.yaml'), 'utf8'),
);
const league = parse(
  readFileSync(resolve(seedsDir, 'config/league.yaml'), 'utf8'),
);
const leagueOpen = leagueWindowOpen(new Date(), league.startsAt);
const gemLevel1 = (name) => gemLevels[name]?.levels?.[1];
const gemName = (gem) => (typeof gem === 'string' ? gem : gem.name);
const baseItems = new Map(
  JSON.parse(
    readFileSync(resolve(root, 'src/core/data/base-types.json'), 'utf8'),
  ).items.map((item) => [item.name, item]),
);

/**
 * A bracket is a promise about what you can have at that level, so nothing may
 * name a gem or flask that the game does not let you use yet.
 */
function checkAvailability(seed, file) {
  for (const bracket of seed.leveling.brackets) {
    for (const group of bracket.skillGroups ?? []) {
      for (const gem of group.gems) {
        const name = gemName(gem);
        const required = gemLevel1(name);
        if (required === undefined) {
          console.error(
            `build seed invalid: ${file}\n  unknown gem "${name}" in ${bracket.until}/${group.slot}`,
          );
          process.exit(1);
        }
        if (required > bracket.until) {
          console.error(
            `build seed invalid: ${file}\n  ${name} needs level ${required}, but ${bracket.until} lists it`,
          );
          process.exit(1);
        }
      }
    }
    for (const flask of bracket.flasks ?? []) {
      const base = baseItems.get(flask.name);
      if (!base) {
        console.error(
          `build seed invalid: ${file}\n  unknown flask "${flask.name}" in ${bracket.until}`,
        );
        process.exit(1);
      }
      if ((base.dropLevel ?? 1) > bracket.until) {
        console.error(
          `build seed invalid: ${file}\n  ${flask.name} drops from level ${base.dropLevel}, but ${bracket.until} lists it`,
        );
        process.exit(1);
      }
    }
  }
}

/** Declared leveling brackets must be ordered, unique and end at 100. */
function checkBrackets(seed, file) {
  const brackets = seed.leveling.brackets;
  let previous = 0;
  for (const bracket of brackets) {
    if (bracket.until <= previous) {
      console.error(
        `build seed invalid: ${file}\n  brackets must ascend; ${bracket.until} follows ${previous}`,
      );
      process.exit(1);
    }
    previous = bracket.until;
  }
  if (previous !== 100) {
    console.error(
      `build seed invalid: ${file}\n  the last bracket must end at 100, not ${previous}`,
    );
    process.exit(1);
  }
}

/**
 * Where each gem comes from for this class: a free quest reward, or the same
 * quest's vendor pool. The distinction matters to a new player ("do I have to
 * buy this?") and it is already in the data, so the guide carries it.
 */
function describeGems(seed) {
  const names = new Set();
  for (const bracket of seed.leveling.brackets) {
    for (const group of bracket.skillGroups ?? []) {
      for (const gem of group.gems) names.add(gemName(gem));
    }
    for (const gem of bracket.skills ?? []) names.add(gemName(gem));
  }
  const info = {};
  for (const name of [...names].sort()) {
    const entry = gemLevels[name];
    if (!entry) continue;
    const quest = entry.quest ?? null;
    info[name] = {
      requiredLevel: entry.levels[1],
      quest: quest
        ? { act: quest.act, quest: quest.quest, classes: quest.classes }
        : null,
      free: quest ? quest.classes.includes(seed.class) : false,
      color: entry.color ?? null,
      support: entry.support === true,
      description: entry.description ?? null,
      effect: entry.effect ?? [],
      tags: entry.tags ?? [],
      qualityEffect: entry.qualityEffect ?? '',
      qualityWorth: entry.qualityWorth ?? 'none',
    };
  }
  return info;
}

const files = readdirSync(seedsDir)
  .filter((name) => name.endsWith('.yaml'))
  .sort();

if (files.length === 0) {
  console.error('no build seeds found under src/builds/');
  process.exit(1);
}

const builds = [];
const seedById = new Map();
const previousById = new Map();
for (const file of files) {
  const path = resolve(seedsDir, file);
  const seed = parse(readFileSync(path, 'utf8'));
  if (!validate(seed)) fail(file, validate.errors);
  // A profile that does not exist would only fail in the oracle, which needs
  // PoB; catch it where every build is compiled.
  if (seed.gearProfile && !gearProfiles[seed.gearProfile]) {
    fail(file, [
      {
        instancePath: '/gearProfile',
        message: `unknown gear profile "${seed.gearProfile}" (see gear/profiles.yaml)`,
      },
    ]);
  }
  checkBrackets(seed, file);
  checkAvailability(seed, file);
  if (`${seed.id}.yaml` !== file) {
    console.error(
      `build seed invalid: ${file}\n  id "${seed.id}" must match the file name`,
    );
    process.exit(1);
  }
  if (builds.some((entry) => entry.id === seed.id)) {
    console.error(`build seed invalid: ${file}\n  duplicate id "${seed.id}"`);
    process.exit(1);
  }
  // Prose edits must not force a re-verification, so the mechanics hash leaves
  // the guide out. The guide gets its own facts hash when it is resolved.
  const { guide: seedGuide, ...mechanics } = seed;
  const seedHash = hashOf(mechanics);
  seedById.set(seed.id, seed);
  // Verification writes gates, the published PoB code and the pipeline stamp
  // into the same file. Keep them when the seed has not changed, so compiling
  // never destroys a report.
  const previousPath = resolve(outDir, `${seed.id}.json`);
  let carried = {};
  if (existsSync(previousPath)) {
    const previous = JSON.parse(readFileSync(previousPath, 'utf8'));
    previousById.set(seed.id, previous);
    if (previous.seedHash === seedHash && previous.gates) {
      carried = {
        status: previous.status ?? 'draft',
        gates: previous.gates,
        ...(previous.tree ? { tree: previous.tree } : {}),
        ...(previous.pob ? { pob: previous.pob } : {}),
        ...(previous.pipeline ? { pipeline: previous.pipeline } : {}),
      };
    }
  }
  builds.push({
    ...mechanics,
    ...carried,
    ...(carried.gates ? {} : { status: 'draft' }),
    gemInfo: describeGems(seed),
    seedHash,
  });
}

// One build per (main skill, ascendancy): a second seed for the same pair is
// rejected rather than published as a near-duplicate (D26).
const pairs = new Map();
for (const build of builds) {
  const key = `${build.mainSkill.toLowerCase()}|${build.ascendancyId}`;
  if (pairs.has(key)) {
    console.error(
      `build seed invalid: ${build.id}\n  ${build.mainSkill} / ${build.ascendancyId} is already ${pairs.get(key)} (D26)`,
    );
    process.exit(1);
  }
  pairs.set(key, build.id);
}

// Resolve prose only when the build has a gate report to resolve against. A
// new seed compiles as a draft; `builds:verify` writes the gates and then
// resolves the guide. An existing build re-resolves on every compile.
for (const build of builds) {
  if (!build.gates) continue;
  const seed = seedById.get(build.id);
  const { guide, errors } = resolveGuide(build, seed.guide, {
    previous: previousById.get(build.id)?.guide,
  });
  if (errors.length > 0) {
    console.error(`guide invalid: ${build.id}\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  build.guide = guide;
  if (guide.summary.status === 'stale') build.status = 'draft';
}

// R4: the league's first 72 hours publish nothing.
if (!leagueOpen) {
  for (const build of builds) build.status = 'draft';
}

/**
 * Catalogue chips. SSF is the gate for every published build; the playstyle
 * comes from the family; HC-ready is only claimed when the measured defensive
 * thresholds at red maps and pinnacle are met.
 */
function chipsFor(build) {
  const chips = [];
  if (build.status === 'verified') {
    chips.push({
      label: 'SSF',
      kind: 'ssf',
      title: 'Verified against self-found budgets with no required unique.',
    });
  }
  const playstyle =
    { minion: 'Minion', melee: 'Melee', bow: 'Ranged', caster: 'Caster', hybrid: 'Hybrid' }[
      build.family
    ];
  if (playstyle) chips.push({ label: playstyle, kind: 'playstyle' });
  const red = build.gates?.['maps-red'];
  const pinnacle = build.gates?.['pinnacle'];
  if (
    red?.pass &&
    pinnacle?.pass &&
    red.metrics.maxHit >= 10000 &&
    pinnacle.metrics.maxHit >= 10000 &&
    red.metrics.ehp >= 25000 &&
    pinnacle.metrics.ehp >= 30000 &&
    pinnacle.metrics.chaosResist >= 75
  ) {
    chips.push({
      label: 'HC-ready',
      kind: 'defence',
      title:
        'Passes the published defensive thresholds at red maps and pinnacle. Still a guide, not a guarantee.',
    });
  }
  const note =
    build.family === 'bow'
      ? { label: 'Fast clear', kind: 'note', title: 'A single arrow clears packs at range.' }
      : build.family === 'melee'
        ? { label: 'Tanky', kind: 'note', title: 'Armour, endurance charges and Juggernaut recovery.' }
        : build.family === 'minion'
          ? { label: 'Minion army', kind: 'note', title: 'Minions take the hits while you position.' }
          : null;
  if (note) chips.push(note);
  return chips;
}

const version = hashOf(builds.map((build) => [build.id, build.seedHash]));
const index = {
  version,
  builds: builds.map((build) => ({
    id: build.id,
    name: build.name,
    class: build.class,
    ascendancyId: build.ascendancyId,
    family: build.family,
    mainSkill: build.mainSkill,
    summary: build.summary,
    status: build.status,
    seedHash: build.seedHash,
    ...(build.pipeline ? { calibrated: build.pipeline.calibrated } : {}),
    chips: chipsFor(build),
    // The catalogue page reads the index only (no per-build fetch), so each
    // checkpoint's pass flag and damage travel with it.
    ...(build.gates
      ? {
          steps: Object.entries(build.gates).map(([id, gate]) => ({
            id,
            pass: gate.pass,
            level: gate.level,
            dps: gate.metrics.dps,
          })),
        }
      : {}),
    ...(build.filter ? { filter: build.filter } : {}),
  })),
};

// The calibration report and the published PoB links are evidence, not
// generated build files: compiling a seed must not delete them. The calibration
// run and the release publisher own them.
const preserved = new Map();
for (const name of ['calibration.json', 'pob-links.json']) {
  const path = resolve(outDir, name);
  if (existsSync(path)) preserved.set(path, readFileSync(path, 'utf8'));
}
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const [path, content] of preserved) writeFileSync(path, content);
writeFileSync(resolve(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
writeFileSync(
  resolve(root, 'src/generated/pantheon.json'),
  `${JSON.stringify(pantheon, null, 2)}\n`,
);
writeFileSync(
  resolve(root, 'src/generated/ascendancies-full.json'),
  `${JSON.stringify(ascendanciesFull, null, 2)}\n`,
);
for (const build of builds) {
  writeFileSync(
    resolve(outDir, `${build.id}.json`),
    `${JSON.stringify(build, null, 2)}\n`,
  );
}

console.log(
  `builds: ${builds.length} compiled (version ${version}): ${builds.map((build) => build.id).join(', ')}`,
);
