#!/usr/bin/env node
/**
 * Publishes each verified build's PoB code to pobb.in and writes the link map.
 *
 *   npm run builds:publish-pobs
 *
 * One paste per guide step, so the pasted build shows the tree, gear and gems
 * for the step the reader selected. This is a release step, not part of the
 * nightly verification: it creates public pastes on a third-party service and
 * the ids are not reproducible. Run it after `builds:verify`, commit the link
 * map, then tag. `builds.test.ts` checks that every link still matches the
 * code it was created from.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function publish(buildId, checkpoint, code) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'BuildPath release publisher (+https://github.com/lordgreg/buildpath)',
      },
      body: JSON.stringify({ content: code }),
    });
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(response.headers.get('retry-after')) || attempt * 3000;
      console.log(
        `${buildId}/${checkpoint}: ${response.status}; retrying in ${retryAfter} ms`,
      );
      await sleep(retryAfter);
      continue;
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok || typeof payload !== 'string') {
      throw new Error(
        `${buildId}/${checkpoint}: pobb.in rejected the code (${response.status}) ${JSON.stringify(payload)}`,
      );
    }
    return payload;
  }
  throw new Error(`${buildId}/${checkpoint}: pobb.in rate limit did not clear`);
}

const links = {};
let published = 0;
let reused = 0;
const linksPath = resolve(root, 'src/generated/builds/pob-links.json');
const previous = existsSync(linksPath)
  ? JSON.parse(readFileSync(linksPath, 'utf8')).links ?? {}
  : {};
for (const file of files) {
  const build = JSON.parse(readFileSync(resolve(outDir, file), 'utf8'));
  const code = build.pob?.code;
  if (!code) {
    console.error(`${build.id}: no PoB code; run builds:verify first`);
    process.exit(1);
  }
  const codeHash = createHash('sha256').update(code).digest('hex').slice(0, 16);
  // A build whose code did not move keeps its paste: re-posting every build on
  // every release churns public ids and hits the rate limit for no reason.
  const kept = previous[build.id];
  if (kept?.codeHash === codeHash) {
    links[build.id] = kept;
    reused += 1;
    continue;
  }
  const payload = await publish(build.id, 'full', code);
  links[build.id] = {
    id: payload,
    url: `https://pobb.in/${payload}`,
    codeHash,
  };
  published += 1;
  console.log(`${build.id}: https://pobb.in/${payload}`);
  // The API is rate-limited; a release step can afford a pause.
  await sleep(900);
}

writeFileSync(
  linksPath,
  `${JSON.stringify({ schemaVersion: 1, links }, null, 2)}\n`,
);
console.log(
  `pob links: ${published} new pastes, ${reused} reused across ${Object.keys(links).length} builds`,
);
