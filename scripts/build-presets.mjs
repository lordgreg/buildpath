#!/usr/bin/env node
/**
 * Compiles YAML presets into JSON and validates them.
 *
 * YAML is the editable source; the browser only ever imports the generated
 * JSON. Run with `npm run presets:build`; `npm test` and `npm run build` do it
 * automatically.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRESETS = resolve(ROOT, 'src/presets');
const SCHEMA = resolve(PRESETS, 'schema');
const OUT = resolve(ROOT, 'src/generated/presets.json');

const readYaml = async (path) =>
  parse(await readFile(resolve(PRESETS, path), 'utf8'));
const readJson = async (path) =>
  JSON.parse(await readFile(resolve(ROOT, path), 'utf8'));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const errors = [];
function validate(schemaFile, data, label) {
  const schema = JSON.parse(
    readFileSync(resolve(SCHEMA, schemaFile), 'utf8'),
  );
  const check = ajv.compile(schema);
  if (!check(data)) {
    errors.push(
      `${label}: ${check.errors
        .map((error) => `${error.instancePath || '/'} ${error.message}`)
        .join('; ')}`,
    );
  }
}

const familiesDoc = await readYaml('families.yaml');
const ascendanciesDoc = await readYaml('ascendancies.yaml');
const leagueIndex = await readYaml('leagues/index.yaml');

validate('families.schema.json', familiesDoc, 'families.yaml');
validate('ascendancies.schema.json', ascendanciesDoc, 'ascendancies.yaml');
validate('leagues-index.schema.json', leagueIndex, 'leagues/index.yaml');

const snapshots = {};
for (const league of leagueIndex.leagues) {
  const snapshot = await readYaml(`leagues/${league.id}.yaml`);
  validate('league.schema.json', snapshot, `leagues/${league.id}.yaml`);

  if (snapshot.league?.id !== league.id) {
    errors.push(
      `leagues/${league.id}.yaml: league.id is ${snapshot.league?.id}`,
    );
  }
  if (snapshot.league?.name !== league.name) {
    errors.push(
      `leagues/${league.id}.yaml: league.name is ${snapshot.league?.name}`,
    );
  }
  if (snapshot.capturedAt !== league.capturedAt) {
    errors.push(
      `leagues/${league.id}.yaml: capturedAt differs from index.yaml`,
    );
  }
  snapshots[league.id] = snapshot;
}

if (!snapshots[leagueIndex.current]) {
  errors.push(`index.yaml: current league "${leagueIndex.current}" has no file`);
}

// Cross-file checks that a JSON Schema cannot express.
const familyIds = new Set(familiesDoc.families?.map((family) => family.id));
const ascendancyIds = new Set(
  ascendanciesDoc.ascendancies?.map((ascendancy) => ascendancy.id),
);
const ascendancyClass = new Map(
  ascendanciesDoc.ascendancies?.map((ascendancy) => [
    ascendancy.id,
    ascendancy.class,
  ]),
);
const skillCatalog = new Set(
  (await readJson('src/meta/skill-names.json')).skills.map(
    (skill) => skill.name,
  ),
);
for (const name of await readJson('src/meta/skill-names-extra.json')) {
  skillCatalog.add(name);
}

for (const ascendancy of ascendanciesDoc.ascendancies ?? []) {
  if (!familyIds.has(ascendancy.defaultFamily)) {
    errors.push(
      `ascendancies.yaml: ${ascendancy.id} defaultFamily "${ascendancy.defaultFamily}" does not exist`,
    );
  }
}

for (const [leagueId, snapshot] of Object.entries(snapshots)) {
  const ids = new Set();
  for (const skill of snapshot.skills ?? []) {
    if (ids.has(skill.id)) {
      errors.push(`leagues/${leagueId}.yaml: duplicate skill id "${skill.id}"`);
    }
    ids.add(skill.id);
    if (!familyIds.has(skill.family)) {
      errors.push(
        `leagues/${leagueId}.yaml: ${skill.id} has unknown family "${skill.family}"`,
      );
    }
    if (!skillCatalog.has(skill.name)) {
      errors.push(
        `leagues/${leagueId}.yaml: "${skill.name}" is not a released active gem`,
      );
    }
    for (const ascendancyId of skill.topAscendancies ?? []) {
      const className = ascendancyClass.get(ascendancyId);
      if (!className) {
        errors.push(
          `leagues/${leagueId}.yaml: ${skill.id} lists unknown ascendancy "${ascendancyId}"`,
        );
      } else if (!skill.classes.includes(className)) {
        errors.push(
          `leagues/${leagueId}.yaml: ${skill.id} lists ${ascendancyId} (${className}) but not that class`,
        );
      }
    }
  }
  for (const family of familyIds) {
    const count = snapshot.skills.filter(
      (skill) => skill.family === family,
    ).length;
    if (count < 4) {
      errors.push(
        `leagues/${leagueId}.yaml: family "${family}" has ${count} skills, need at least 4`,
      );
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exit(1);
}

const base = {
  schemaVersion: 1,
  families: familiesDoc.families,
  ascendancies: ascendanciesDoc.ascendancies,
  leagues: {
    current: leagueIndex.current,
    index: leagueIndex.leagues,
    snapshots,
  },
};
const version = createHash('sha256')
  .update(JSON.stringify(base))
  .digest('hex')
  .slice(0, 12);
const output = { ...base, version };

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);

console.log(
  `Compiled ${output.families.length} families, ${output.ascendancies.length} ascendancies, ${Object.keys(snapshots).length} leagues to src/generated/presets.json`,
);
console.log(`Preset version ${version}`);