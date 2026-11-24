#!/usr/bin/env node
/**
 * Refreshes the economy tier snapshot from poe.ninja's supported economy API.
 *
 * The builds API is closed; the economy endpoints are explicitly public. We
 * fetch once per run, compute divine-based tiers, and write a committed JSON
 * file. The browser never calls poe.ninja.
 *
 * Rules from PLAN 2.3: descriptive User-Agent, conditional requests, a timeout,
 * a short retry, and no write when the data looks wrong. A failed run leaves the
 * committed snapshot (the last good one) untouched.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/generated/economy.json');
const KNOWN = resolve(ROOT, 'src/core/data/known-base-types.json');
const CACHE = resolve(ROOT, process.env.ECONOMY_CACHE ?? '.cache/economy');
const BASE = 'https://poe.ninja/poe1/api/economy';
const TIMEOUT_MS = 15_000;
const ATTEMPTS = 3;

const pkg = JSON.parse(
  await readFile(resolve(ROOT, 'package.json'), 'utf8'),
);
const UA = `FilterPath/${pkg.version} (+https://github.com/lordgreg/filterpath)`;

const UNIQUE_TYPES = [
  'UniqueWeapon',
  'UniqueArmour',
  'UniqueAccessory',
  'UniqueFlask',
  'UniqueJewel',
];

function cacheFile(path) {
  const name = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  return resolve(CACHE, `${name}.json`);
}

async function readCache(path) {
  try {
    const cached = JSON.parse(await readFile(cacheFile(path), 'utf8'));
    return cached && typeof cached === 'object' ? cached : null;
  } catch {
    return null;
  }
}

/**
 * One economy request with an ETag cache, a timeout and two retries. A 304
 * replays the cached body, so an unchanged endpoint costs no bandwidth.
 */
async function get(path) {
  const cached = await readCache(path);
  const headers = { 'user-agent': UA, accept: 'application/json' };
  if (cached?.etag) headers['if-none-match'] = cached.etag;

  let response;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      response = await fetch(`${BASE}${path}`, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      break;
    } catch (error) {
      if (attempt === ATTEMPTS) {
        throw new Error(`${path}: ${error.message}`);
      }
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, 500 * 2 ** (attempt - 1)),
      );
    }
  }

  if (response.status === 304 && cached) return cached.body;
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  const etag = response.headers.get('etag');
  if (etag) {
    await mkdir(CACHE, { recursive: true });
    await writeFile(cacheFile(path), JSON.stringify({ etag, body }));
  }
  return body;
}

/** A response that does not look like an economy payload is an error. */
function expectArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label}: expected an array, got ${typeof value}`);
  }
  return value;
}

// Curated tiers, mirrored by FALLBACK_TIER_1/2 in
// src/core/filter/rules/currency.ts. T1 always shows; T2 is a floor.
const STATIC_CURRENCY_T1 = [
  'Divine Orb',
  'Eldritch Chaos Orb',
  'Eldritch Exalted Orb',
  'Eldritch Orb of Annulment',
  'Exalted Orb',
  'Fracturing Orb',
  "Hinekora's Lock",
  'Mirror of Kalandra',
  'Sacred Orb',
];
const STATIC_CURRENCY_T2 = [
  'Ancient Orb',
  'Blessed Orb',
  "Cartographer's Chisel",
  'Chaos Orb',
  'Chromatic Orb',
  "Gemcutter's Prism",
  "Glassblower's Bauble",
  'Instilling Orb',
  'Enkindling Orb',
  "Jeweller's Orb",
  'Orb of Alchemy',
  'Orb of Alteration',
  'Orb of Annulment',
  'Orb of Binding',
  'Orb of Chance',
  'Orb of Fusing',
  'Orb of Regret',
  'Orb of Scouring',
  'Orb of Unmaking',
  'Prime Regrading Lens',
  'Regal Orb',
  'Secondary Regrading Lens',
  'Tailoring Orb',
  'Tempering Orb',
  'Vaal Orb',
];

function uniqueTier(value, divineChaos) {
  if (value >= divineChaos * 10) return 1;
  if (value >= divineChaos * 2) return 2;
  return 3;
}

function tier(value, divineChaos) {
  if (value >= divineChaos) return 1;
  if (value >= 10) return 2;
  return 3;
}

/** Sorted keys keep the file and the preset hash stable across runs. */
function sorted(map) {
  return Object.fromEntries(
    Object.entries(map).sort(([a], [b]) => a.localeCompare(b)),
  );
}

const leagues = expectArray(await get('/leagues'), 'leagues');
const league = leagues[0];
if (!league?.id) throw new Error('No economy leagues returned');

const query = `?league=${encodeURIComponent(league.id)}`;
const [currency, fragments, divination, ...uniqueGroups] = await Promise.all([
  get(`/stash/current/currency/overview${query}&type=Currency`),
  get(`/stash/current/currency/overview${query}&type=Fragment`),
  get(`/exchange/current/overview${query}&type=DivinationCard`),
  ...UNIQUE_TYPES.map((type) =>
    get(`/stash/current/item/overview${query}&type=${type}`),
  ),
]);

const currencyLines = expectArray(currency?.lines, 'currency.lines');
const fragmentLines = expectArray(fragments?.lines, 'fragment.lines');
const divinationLines = expectArray(divination?.lines, 'divination.lines');
const divinationItems = expectArray(divination?.items, 'divination.items');

const divineChaos =
  currencyLines.find((line) => line?.currencyTypeName === 'Divine Orb')
    ?.chaosEquivalent ?? 1;
if (!Number.isFinite(divineChaos) || divineChaos <= 0) {
  throw new Error(`Divine Orb price looks wrong: ${divineChaos}`);
}

const known = new Set(JSON.parse(await readFile(KNOWN, 'utf8')).names);

const currencyTiers = {};
for (const line of currencyLines) {
  if (!line?.currencyTypeName || !Number.isFinite(line.chaosEquivalent)) continue;
  if (!known.has(line.currencyTypeName)) continue;
  currencyTiers[line.currencyTypeName] = tier(line.chaosEquivalent, divineChaos);
}
for (const name of STATIC_CURRENCY_T1) currencyTiers[name] = 1;
for (const name of STATIC_CURRENCY_T2) {
  // Floor, not a cap: keep a value-tiered T1, promote everything else.
  if (currencyTiers[name] === undefined || currencyTiers[name] > 2) {
    currencyTiers[name] = 2;
  }
}

const fragmentTiers = {};
for (const line of fragmentLines) {
  if (!line?.currencyTypeName || !Number.isFinite(line.chaosEquivalent)) continue;
  if (!known.has(line.currencyTypeName)) continue;
  fragmentTiers[line.currencyTypeName] = tier(line.chaosEquivalent, divineChaos);
}

const divinationNames = new Map(
  divinationItems.map((item) => [item?.id, item?.name]),
);
const divinationTiers = {};
for (const line of divinationLines) {
  const name = divinationNames.get(line?.id);
  if (!name || !Number.isFinite(line.primaryValue)) continue;
  if (!known.has(name)) continue;
  divinationTiers[name] = tier(line.primaryValue, divineChaos);
}

const uniqueBaseValue = new Map();
for (const group of uniqueGroups) {
  for (const line of expectArray(group?.lines, 'unique.lines')) {
    if (!line?.baseType || !Number.isFinite(line.chaosValue)) continue;
    if (!known.has(line.baseType)) continue;
    uniqueBaseValue.set(
      line.baseType,
      Math.max(uniqueBaseValue.get(line.baseType) ?? 0, line.chaosValue),
    );
  }
}
const uniqueBaseTiers = {};
for (const [baseType, value] of uniqueBaseValue) {
  uniqueBaseTiers[baseType] = uniqueTier(value, divineChaos);
}

const tiers = {
  currency: sorted(currencyTiers),
  fragment: sorted(fragmentTiers),
  divination: sorted(divinationTiers),
  uniqueBase: sorted(uniqueBaseTiers),
};

const count = (map, wanted) =>
  Object.values(map).filter((value) => value === wanted).length;
console.log(
  `${league.name}: divine ${divineChaos}c, ` +
    `currency T1/T2/T3 ${count(tiers.currency, 1)}/${count(tiers.currency, 2)}/${count(tiers.currency, 3)}, ` +
    `fragments ${Object.keys(tiers.fragment).length}, ` +
    `unique bases ${Object.keys(tiers.uniqueBase).length}`,
);

// Keep the committed snapshot when nothing moved, so a run without a tier
// change produces no diff and no pull request.
let previous = null;
try {
  previous = JSON.parse(await readFile(OUT, 'utf8'));
} catch {
  // First run, or the file is unreadable; write it.
}
if (
  previous &&
  JSON.stringify(previous.tiers) === JSON.stringify(tiers) &&
  previous.league?.id === league.id
) {
  console.log('No tier changes; economy.json left untouched.');
  process.exit(0);
}

const output = {
  schemaVersion: 1,
  league: { id: league.id, name: league.name },
  fetchedAt: new Date().toISOString(),
  source: 'https://poe.ninja/poe1/economy',
  divineChaos,
  tiers,
};

// Hand-written overrides are applied by build-presets.mjs, so this file stays a
// faithful snapshot of what poe.ninja returned.
await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${OUT}`);