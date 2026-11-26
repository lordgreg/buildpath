#!/usr/bin/env node
/**
 * Stamps a guide section with a sign-off.
 *
 *   npm run builds:sign -- --build summon-skeletons-necromancer --section summary --by "your name"
 *
 * Then run `npm run builds:build`; the compiler resolves placeholders, computes
 * the facts hash and publishes the section as signed. Re-signing after a fact
 * change replaces the old stamp, which is what clears a `stale` section.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { seedsDir } from './pipeline.mjs';

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const build = value('build');
const section = value('section') ?? 'summary';
const by = value('by');
const at = value('at') ?? new Date().toISOString();
const sections = new Set(['summary', 'leveling', 'maps', 'bossing']);

if (!build || !by) {
  console.error(
    'usage: npm run builds:sign -- --build <seed-id> --section summary --by "your name"',
  );
  process.exit(1);
}
if (!sections.has(section)) {
  console.error(`unknown section "${section}"; use ${[...sections].join(', ')}`);
  process.exit(1);
}

const path = resolve(seedsDir, `${build}.yaml`);
const lines = readFileSync(path, 'utf8').split('\n');
const guideIndex = lines.findIndex((line) => line === 'guide:');
if (guideIndex < 0) {
  console.error(`${build}: no guide block`);
  process.exit(1);
}
const sectionIndex = lines.findIndex(
  (line, index) => index > guideIndex && line === `  ${section}:`,
);
if (sectionIndex < 0) {
  console.error(`${build}: no guide.${section} section`);
  process.exit(1);
}
let end = sectionIndex + 1;
while (end < lines.length && (lines[end] === '' || lines[end].startsWith('    '))) {
  end += 1;
}
const stamp = `    signed: { by: ${JSON.stringify(by)}, at: ${JSON.stringify(at)} }`;
const existing = lines.findIndex(
  (line, index) =>
    index > sectionIndex && index < end && line.trimStart().startsWith('signed:'),
);
if (existing >= 0) {
  lines[existing] = stamp;
} else {
  lines.splice(sectionIndex + 1, 0, stamp);
}
writeFileSync(path, `${lines.join('\n')}\n`);
console.log(`${build}/guide.${section}: signed by ${by} at ${at}`);
console.log('Run `npm run builds:build` to resolve the prose and update the facts hash.');
