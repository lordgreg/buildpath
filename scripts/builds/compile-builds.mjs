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
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';

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

const files = readdirSync(seedsDir)
  .filter((name) => name.endsWith('.yaml'))
  .sort();

if (files.length === 0) {
  console.error('no build seeds found under src/builds/');
  process.exit(1);
}

const builds = [];
for (const file of files) {
  const path = resolve(seedsDir, file);
  const seed = parse(readFileSync(path, 'utf8'));
  if (!validate(seed)) fail(file, validate.errors);
  checkBrackets(seed, file);
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
  builds.push({
    ...seed,
    status: 'draft',
    seedHash: hashOf(seed),
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
  })),
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
for (const build of builds) {
  writeFileSync(
    resolve(outDir, `${build.id}.json`),
    `${JSON.stringify(build, null, 2)}\n`,
  );
}

console.log(
  `builds: ${builds.length} compiled (version ${version}): ${builds.map((build) => build.id).join(', ')}`,
);
