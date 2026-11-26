#!/usr/bin/env node
/**
 * Writes the patch fact set the catalogue is checked against (R10).
 *
 *   POB_DIR=.cache/pob/src npm run builds:patch-facts
 *
 * The hashes are content hashes of the pinned PoB tree and gem data, so a PoB
 * tag bump changes the fact set and delists every build that has not been
 * re-verified. This is the offline half of patch tracking: no pathofexile.com
 * call, no runtime network.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { checkpoints, pobDir, root, seedsDir } from './pipeline.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 16);
const league = parse(readFileSync(resolve(seedsDir, 'config/league.yaml'), 'utf8'));
const treePath = resolve(pobDir, 'TreeData', checkpoints.treeVersion, 'tree.lua');
const gemsPath = resolve(pobDir, 'Data/Gems.lua');
for (const path of [treePath, gemsPath]) {
  if (!existsSync(path)) {
    console.error(`missing ${path}; clone the pinned PoB checkout or set POB_DIR`);
    process.exit(1);
  }
}
const treeHash = hash(readFileSync(treePath));
const gemsHash = hash(readFileSync(gemsPath));
const patchHash = hash(`${treeHash}:${gemsHash}`);
const facts = {
  schemaVersion: 1,
  pobRef: process.env.POB_REF ?? 'v2.69.0',
  patch: league.patch,
  treeVersion: checkpoints.treeVersion,
  treeHash,
  gemsHash,
  patchHash,
};
writeFileSync(
  resolve(root, 'src/generated/patch-facts.json'),
  `${JSON.stringify(facts, null, 2)}\n`,
);
console.log(`patch facts: ${facts.patch} (${facts.pobRef}) ${patchHash}`);
