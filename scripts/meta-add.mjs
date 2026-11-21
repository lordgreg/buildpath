#!/usr/bin/env node
/**
 * Manual editor for the poe.ninja league snapshots.
 *
 * The builds API is closed to third parties, so capture is human work:
 * read the public builds pages, then add the skills here.
 *
 *   npm run meta:add -- --league covens --skill "Lightning Arrow" \
 *     --family bow --classes Ranger,Duelist,Scion \
 *     --ascendancies deadeye,pathfinder --share 12
 *
 * Options:
 *   --league <id>          league file to edit (required)
 *   --skill <name>         gem display name, checked against RePoE
 *   --family <id>          caster | minion | bow | melee | hybrid
 *   --classes <a,b>        playable classes
 *   --ascendancies <a,b>   preferred ascendancies, in order
 *   --share <number>       approximate play share
 *   --weapon <itemClass>   skill weapon override
 *   --two-handed           drop the offhand
 *   --offhand <itemClass>  offhand override
 *   --no-leveling          mark as endgame-only
 *   --list-skills          print the valid gem names and exit
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const CATALOG = new URL('src/meta/skill-names.json', ROOT);
const LEAGUES = new URL('src/meta/leagues/', ROOT);

const FAMILIES = ['caster', 'minion', 'bow', 'melee', 'hybrid'];
const CLASSES = [
  'Scion',
  'Marauder',
  'Ranger',
  'Duelist',
  'Witch',
  'Templar',
  'Shadow',
];
// Keep in sync with src/meta/ascendancies.ts.
const ASCENDANCY_CLASS = {
  ascendant: 'Scion',
  juggernaut: 'Marauder',
  berserker: 'Marauder',
  chieftain: 'Marauder',
  deadeye: 'Ranger',
  raider: 'Ranger',
  pathfinder: 'Ranger',
  slayer: 'Duelist',
  gladiator: 'Duelist',
  champion: 'Duelist',
  necromancer: 'Witch',
  elementalist: 'Witch',
  occultist: 'Witch',
  inquisitor: 'Templar',
  hierophant: 'Templar',
  guardian: 'Templar',
  assassin: 'Shadow',
  trickster: 'Shadow',
  saboteur: 'Shadow',
};

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}
function flag(name) {
  return args.includes(`--${name}`);
}
function list(name) {
  return (option(name) ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

if (flag('help') || args.length === 0) {
  console.log(
    'Usage: npm run meta:add -- --league <id> --skill "<gem>" --family <id> --classes A,B --ascendancies x,y [--share N] [--weapon Class] [--two-handed] [--no-leveling]',
  );
  process.exit(0);
}

const catalog = JSON.parse(await readFile(fileURLToPath(CATALOG), 'utf8'));

if (flag('list-skills')) {
  console.log(catalog.skills.map((skill) => skill.name).join('\n'));
  process.exit(0);
}

const leagueId = option('league');
const skillName = option('skill');
const family = option('family');
const classes = list('classes');
const topAscendancies = list('ascendancies');
const share = option('share');
const weapon = option('weapon');
const offhand = option('offhand');

const errors = [];
if (!leagueId) errors.push('--league is required');
if (!skillName) errors.push('--skill is required');
if (!family) errors.push('--family is required');
if (family && !FAMILIES.includes(family)) {
  errors.push(`--family must be one of ${FAMILIES.join(', ')}`);
}
if (classes.length === 0) errors.push('--classes is required');
for (const className of classes) {
  if (!CLASSES.includes(className)) errors.push(`unknown class "${className}"`);
}
for (const ascendancy of topAscendancies) {
  if (!ASCENDANCY_CLASS[ascendancy]) {
    errors.push(`unknown ascendancy "${ascendancy}"`);
  } else if (!classes.includes(ASCENDANCY_CLASS[ascendancy])) {
    errors.push(`ascendancy "${ascendancy}" belongs to ${ASCENDANCY_CLASS[ascendancy]}, not in --classes`);
  }
}
if (skillName && !catalog.skills.some((skill) => skill.name === skillName)) {
  errors.push(`"${skillName}" is not a released active skill gem`);
}
if (share !== undefined && !Number.isFinite(Number(share))) {
  errors.push('--share must be a number');
}
if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exit(1);
}

const leagueFile = new URL(`${leagueId}.json`, LEAGUES);
let snapshot;
try {
  snapshot = JSON.parse(await readFile(fileURLToPath(leagueFile), 'utf8'));
} catch {
  console.error(`error: no snapshot at src/meta/leagues/${leagueId}.json`);
  process.exit(1);
}

const entry = {
  id: slug(skillName),
  name: skillName,
  family,
  classes,
  topAscendancies,
  ...(share !== undefined ? { playShare: Number(share) } : {}),
  leveling: !flag('no-leveling'),
  ...(weapon ? { weapon: { itemClasses: [weapon] } } : {}),
  ...(flag('two-handed')
    ? { offhand: null }
    : offhand
      ? { offhand: { itemClasses: [offhand] } }
      : {}),
};

const existingIndex = snapshot.skills.findIndex(
  (skill) => skill.name === skillName,
);
if (existingIndex >= 0) snapshot.skills[existingIndex] = entry;
else snapshot.skills.push(entry);

snapshot.skills.sort(
  (a, b) =>
    (b.playShare ?? 0) - (a.playShare ?? 0) || a.name.localeCompare(b.name),
);
snapshot.capturedAt = new Date().toISOString();

await writeFile(
  fileURLToPath(leagueFile),
  `${JSON.stringify(snapshot, null, 2)}\n`,
);

console.log(
  `${existingIndex >= 0 ? 'Updated' : 'Added'} ${skillName} in ${leagueId} (${snapshot.skills.length} skills).`,
);
console.log('Review the diff, then commit and open a PR.');