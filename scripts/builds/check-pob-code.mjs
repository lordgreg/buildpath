#!/usr/bin/env node
/**
 * Proves every published PoB code is the build the page claims (R3).
 *
 *   POB_DIR=.cache/pob/src npm run builds:check
 *
 * Three checks, cheapest first:
 *
 *   1. Node decodes the code: url-safe base64 -> zlib -> one XML document.
 *   2. The XML names the node, item and gem counts of the checkpoint it claims
 *      (`maps-red`, D24), so the page and the code cannot describe different
 *      builds.
 *   3. Real PoB loads the code and reports the same counts. A code that decodes
 *      but imports as an empty build fails here, not in a reader's client.
 *
 * Needs the pinned PoB checkout and LuaJIT. CI runs it from
 * `.github/workflows/validate-builds.yml`; it is deliberately not part of
 * `npm test`, which must stay fast and offline.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { findUtf8Cpath, LUA_PATH } from './pob/lua-env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const buildsDir = resolve(root, 'src/generated/builds');
const scratchDir = resolve(root, '.cache/builds');
const pobDir = resolve(root, process.env.POB_DIR ?? '.cache/pob/src');
const luaScript = resolve(root, 'scripts/builds/pob/load-build.lua');
const LUA_CPATH = findUtf8Cpath();

if (!existsSync(resolve(pobDir, 'HeadlessWrapper.lua'))) {
  console.error(`PoB not found at ${pobDir}. Clone the pinned tag there, or set POB_DIR.`);
  process.exit(1);
}
if (!LUA_CPATH) {
  console.error('lua-utf8 was not found. Install it (e.g. luajitPackages.luautf8) or set LUA_CPATH.');
  process.exit(1);
}

const count = (text, pattern) => (text.match(new RegExp(pattern, 'g')) ?? []).length;

/** Decode the code exactly as PoB's import tab does. */
function decode(code) {
  const standard = code.replaceAll('-', '+').replaceAll('_', '/');
  return inflateSync(Buffer.from(standard, 'base64')).toString('utf8');
}

const files = readdirSync(buildsDir)
  .filter(
    (name) =>
      name.endsWith('.json') &&
      name !== 'index.json' &&
      name !== 'calibration.json' &&
      name !== 'pob-links.json',
  )
  .sort();

if (files.length === 0) {
  console.error('no compiled builds found; run `npm run builds:build` first');
  process.exit(1);
}

let failed = 0;

function activeSpecNodes(xml) {
  const tree = xml.match(/<Tree\b[^>]*activeSpec="(\d+)"[^>]*>([\s\S]*?)<\/Tree>/);
  if (!tree) return 0;
  const specs = [...tree[2].matchAll(/<Spec\b[^>]*\bnodes="([^"]*)"/g)];
  const nodes = specs[Number(tree[1]) - 1]?.[1] ?? '';
  return nodes.split(',').filter(Boolean).length;
}

function activeItemSetSlots(xml) {
  const items = xml.match(/<Items\b[^>]*activeItemSet="(\d+)"[^>]*>([\s\S]*?)<\/Items>/);
  if (!items) return 0;
  const sets = [...items[2].matchAll(/<ItemSet\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/ItemSet>/g)];
  const set = sets.find((entry) => entry[1] === items[1])?.[2] ?? '';
  return (set.match(/<Slot\b/g) ?? []).length;
}

function activeSkillSetGems(xml) {
  const skills = xml.match(/<Skills\b[^>]*activeSkillSet="(\d+)"[^>]*>([\s\S]*?)<\/Skills>/);
  if (!skills) return 0;
  const sets = [...skills[2].matchAll(/<SkillSet\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/SkillSet>/g)];
  const set = sets.find((entry) => entry[1] === skills[1])?.[2] ?? '';
  return (set.match(/<Gem\b/g) ?? []).length;
}

for (const file of files) {
  const build = JSON.parse(readFileSync(resolve(buildsDir, file), 'utf8'));
  const problems = [];
  const code = build.pob?.code;
  const gate = build.gates?.[build.pob?.checkpoint ?? ''];
  if (!code) {
    console.error(`${file}: no published PoB code`);
    failed += 1;
    continue;
  }
  if (!gate?.tree) {
    console.error(`${file}: ${build.pob.checkpoint} has no gate report to compare against`);
    failed += 1;
    continue;
  }
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(code)) {
    problems.push('code is not url-safe base64');
  }

  let xml = '';
  try {
    xml = decode(code);
  } catch (error) {
    problems.push(`code does not inflate: ${error.message}`);
  }
  if (xml && !xml.startsWith('<?xml')) problems.push('decoded bytes are not XML');
  if (xml && !xml.includes('<PathOfBuilding>')) problems.push('XML has no <PathOfBuilding> root');
  if (xml && !xml.includes('<Notes>')) problems.push('XML has no <Notes> block');

  const stepIds = build.pob.steps ?? Object.keys(build.gates ?? {});
  const gates = stepIds.map((id) => build.gates?.[id]).filter(Boolean);
  const expectedSpecs = stepIds.length;
  const expectedItems = gates.reduce(
    (sum, entry) => sum + (entry.gear?.length ?? 0) + (entry.flasks?.length ?? 0),
    0,
  );
  const expectedGems = gates.reduce(
    (sum, entry) => sum + (entry.gems ?? []).reduce((count, group) => count + group.gems.length, 0),
    0,
  );
  const expectedFlasks = gates.reduce((sum, entry) => sum + (entry.flasks?.length ?? 0), 0);
  const expectedNodes = gate.tree.nodes.length + (gate.metrics?.ascendancy ?? 0);
  const expectedActiveItems =
    (gate.gear?.filter((item) => !item.slot.startsWith('Jewel')).length ?? 0) +
    (gate.flasks?.length ?? 0);
  const expectedActiveGems = (gate.gems ?? []).reduce(
    (sum, group) => sum + group.gems.length,
    0,
  );

  if (xml) {
    const allocated = activeSpecNodes(xml);
    const specs = count(xml, '<Spec ');
    const itemSets = count(xml, '<ItemSet ');
    const skillSets = count(xml, '<SkillSet ');
    const items = count(xml, '<Item id=');
    const gems = count(xml, '<Gem ');
    const flaskSlots = count(xml, '<Slot name="Flask ');
    if (allocated !== expectedNodes) {
      problems.push(`active spec has ${allocated} nodes, the ${build.pob.checkpoint} gate has ${expectedNodes}`);
    }
    if (specs !== expectedSpecs) {
      problems.push(`XML has ${specs} specs, expected ${expectedSpecs}`);
    }
    if (itemSets !== expectedSpecs) {
      problems.push(`XML has ${itemSets} item sets, expected ${expectedSpecs}`);
    }
    if (skillSets !== expectedSpecs) {
      problems.push(`XML has ${skillSets} skill sets, expected ${expectedSpecs}`);
    }
    if (items !== expectedItems) {
      problems.push(`XML has ${items} items, expected ${expectedItems}`);
    }
    if (gems !== expectedGems) {
      problems.push(`XML has ${gems} gems, expected ${expectedGems}`);
    }
    if (flaskSlots !== expectedFlasks) {
      problems.push(`XML has ${flaskSlots} flasks, expected ${expectedFlasks}`);
    }
  }

  let result;
  if (xml) {
    // The headless wrapper has no zlib host function, so Node writes the bytes
    // PoB would inflate from the paste; PoB then loads them for real.
    mkdirSync(scratchDir, { recursive: true });
    const xmlPath = resolve(scratchDir, `${build.id}-published.xml`);
    writeFileSync(xmlPath, xml);
    result = spawnSync('luajit', [luaScript], {
      cwd: pobDir,
      env: { ...process.env, POB_XML: xmlPath, LUA_PATH, LUA_CPATH },
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  }
  const line = (result?.stdout ?? '')
    .split('\n')
    .reverse()
    .find((entry) => entry.startsWith('RESULT '));
  if (xml && !line) {
    problems.push(`PoB did not load the code: ${(result?.stderr ?? '').trim().split('\n').at(-1)}`);
  } else if (line) {
    const [nodes, specs, itemSets, skillSets, items, gems, flasks, activeSlots, activeGems] = line
      .slice('RESULT '.length)
      .split(' ')
      .map(Number);
    if (nodes !== expectedNodes) problems.push(`PoB loaded ${nodes} nodes, expected ${expectedNodes}`);
    if (specs !== expectedSpecs) problems.push(`PoB loaded ${specs} specs, expected ${expectedSpecs}`);
    if (itemSets !== expectedSpecs) problems.push(`PoB loaded ${itemSets} item sets, expected ${expectedSpecs}`);
    if (skillSets !== expectedSpecs) problems.push(`PoB loaded ${skillSets} skill sets, expected ${expectedSpecs}`);
    if (items !== expectedItems) problems.push(`PoB loaded ${items} items, expected ${expectedItems}`);
    if (gems !== expectedGems) problems.push(`PoB loaded ${gems} gems, expected ${expectedGems}`);
    if (flasks !== expectedFlasks) problems.push(`PoB loaded ${flasks} flasks, expected ${expectedFlasks}`);
    if (activeSlots !== expectedActiveItems) {
      problems.push(`PoB active item set has ${activeSlots} slots, expected ${expectedActiveItems}`);
    }
    if (activeGems !== expectedActiveGems) {
      problems.push(`PoB active skill set has ${activeGems} gems, expected ${expectedActiveGems}`);
    }
  }

  if (problems.length > 0) {
    failed += 1;
    console.error(`${file}:`);
    for (const problem of problems) console.error(`  ${problem}`);
  } else {
    console.log(
      `${file}: full code loads ` +
        `(${expectedSpecs} steps, ${expectedNodes} active nodes, ${expectedItems} items, ${expectedGems} gems)`,
    );
  }
}

if (failed > 0) {
  console.error(`${failed} of ${files.length} published codes do not match their build`);
  process.exit(1);
}
console.log(`${files.length} published PoB codes verified`);
