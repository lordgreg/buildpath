#!/usr/bin/env node
/**
 * Refreshes the baked visitor feedback for every verified build.
 *
 *   npm run feedback:refresh            # create missing issues, fetch counts
 *   npm run feedback:refresh -- --dry-run
 *
 * Each build gets one `guide-feedback` issue; visitors vote with the 👍/👎
 * reactions on it. This script reads those reactions through the GitHub CLI and
 * writes `src/generated/feedback.json`, so the static site never calls GitHub
 * at runtime. It creates an issue only when the build has none, and it leaves
 * `fetchedAt` alone when no count moved, so a quiet week produces no PR.
 *
 * Needs an authenticated `gh` (locally) or `GH_TOKEN` (in Actions).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEEDBACK_LABEL,
  FEEDBACK_REPO,
  feedbackIssueBody,
  feedbackIssueMarker,
  feedbackIssueTitle,
  summariseReactions,
} from '../../src/core/feedback.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outPath = resolve(root, 'src/generated/feedback.json');
const dryRun = process.argv.includes('--dry-run');
const repo = process.env.GH_REPO ?? FEEDBACK_REPO;

function gh(...args) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

const index = JSON.parse(
  readFileSync(resolve(root, 'src/generated/builds/index.json'), 'utf8'),
);
const verified = index.builds
  .filter((build) => build.status === 'verified')
  .sort((a, b) => a.id.localeCompare(b.id));

gh(
  'label',
  'create',
  FEEDBACK_LABEL,
  '--description',
  'Visitor feedback on a build guide',
  '--color',
  '0E8A16',
  '--force',
  '--repo',
  repo,
);

const listed = JSON.parse(
  gh(
    'issue',
    'list',
    '--label',
    FEEDBACK_LABEL,
    '--state',
    'all',
    '--limit',
    '200',
    '--json',
    'number,body',
    '--repo',
    repo,
  ),
);

/** Marker -> lowest issue number, so a duplicate thread never wins. */
const issueByMarker = new Map();
for (const issue of listed) {
  const match = /<!-- buildpath-feedback:([a-z0-9-]+) -->/.exec(issue.body ?? '');
  if (!match) continue;
  const current = issueByMarker.get(match[1]);
  if (current === undefined || issue.number < current) {
    issueByMarker.set(match[1], issue.number);
  }
}

const missing = verified.filter((build) => !issueByMarker.has(build.id));

if (dryRun) {
  console.log(
    `${verified.length} verified builds, ${issueByMarker.size} issues found, ${missing.length} would be created`,
  );
  for (const build of missing) {
    console.log(`\n${feedbackIssueTitle(build.name)}\n${feedbackIssueBody(build)}`);
  }
  process.exit(0);
}

for (const build of missing) {
  const url = gh(
    'issue',
    'create',
    '--title',
    feedbackIssueTitle(build.name),
    '--body',
    feedbackIssueBody(build),
    '--label',
    FEEDBACK_LABEL,
    '--repo',
    repo,
  );
  const number = Number(url.split('/').pop());
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${build.id}: could not read the new issue number from "${url}"`);
  }
  issueByMarker.set(build.id, number);
  console.log(`${build.id}: created issue #${number}`);
}

const builds = {};
for (const build of verified) {
  const issue = issueByMarker.get(build.id);
  const contents = gh(
    'api',
    '--paginate',
    `repos/${repo}/issues/${issue}/reactions?per_page=100`,
    '--jq',
    '.[].content',
  )
    .split('\n')
    .filter(Boolean);
  builds[build.id] = {
    issue,
    url: `https://github.com/${repo}/issues/${issue}`,
    ...summariseReactions(contents),
  };
}

const previous = existsSync(outPath)
  ? JSON.parse(readFileSync(outPath, 'utf8'))
  : null;
if (previous && JSON.stringify(previous.builds) === JSON.stringify(builds)) {
  console.log('feedback unchanged; fetchedAt left alone');
  process.exit(0);
}

const report = {
  schemaVersion: 1,
  fetchedAt: new Date().toISOString(),
  builds,
};
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `feedback: ${verified.length} builds, ${Object.values(builds).reduce(
    (total, entry) => total + entry.up + entry.down,
    0,
  )} votes`,
);
