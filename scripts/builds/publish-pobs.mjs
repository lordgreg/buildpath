#!/usr/bin/env node
/**
 * Publishes each verified build's PoB code to pobb.in and writes the link map.
 *
 *   npm run builds:publish-pobs
 *
 * This is a release step, not part of the nightly verification: it creates a
 * public paste on a third-party service and the id is not reproducible. Run it
 * after `builds:verify`, commit the link map, then tag. `builds.test.ts` checks
 * that every link still matches the code it was created from.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  outDir,
  root,
} from './pipeline.mjs';

const endpoint = process.env.POBB_API ?? 'https://pobb.in/api/internal/paste/';
const files = readdirSync(outDir)
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

const links = {};
for (const file of files) {
  const build = JSON.parse(readFileSync(resolve(outDir, file), 'utf8'));
  if (!build.pob?.code) {
    console.error(`${build.id}: no published PoB code; run builds:verify first`);
    process.exit(1);
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'BuildPath release publisher (+https://github.com/lordgreg/buildpath)',
    },
    body: JSON.stringify({ content: build.pob.code }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || typeof payload !== 'string') {
    console.error(`${build.id}: pobb.in rejected the code`, response.status, payload);
    process.exit(1);
  }
  links[build.id] = {
    id: payload,
    url: `https://pobb.in/${payload}`,
    codeHash: createHash('sha256').update(build.pob.code).digest('hex').slice(0, 16),
  };
  console.log(`${build.id}: https://pobb.in/${payload}`);
}

writeFileSync(
  resolve(root, 'src/generated/builds/pob-links.json'),
  `${JSON.stringify({ schemaVersion: 1, links }, null, 2)}\n`,
);
console.log(`pob links: ${Object.keys(links).length} published`);
