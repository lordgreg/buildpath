#!/usr/bin/env node
/**
 * Refreshes the economy tier snapshot from poe.ninja's supported economy API.
 *
 * The builds API is closed; the economy endpoints are explicitly public. We
 * fetch once per run, compute divine-based tiers, and write a committed JSON
 * file. The browser never calls poe.ninja.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/generated/economy.json');
const KNOWN = resolve(ROOT, 'src/core/data/known-base-types.json');
const UA = 'FilterPath/0.9.0 (contact: lordgreg@users.noreply.github.com)';
const BASE = 'https://poe.ninja/poe1/api/economy';

const UNIQUE_TYPES = [
  'UniqueWeapon',
  'UniqueArmour',
  'UniqueAccessory',
  'UniqueFlask',
  'UniqueJewel',
];

async function get(path) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'user-agent': UA, accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
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

const leagues = await get('/leagues');
const league = leagues[0];
if (!league) throw new Error('No economy leagues returned');

const query = `?league=${encodeURIComponent(league.id)}`;
const [currency, fragments, divination, ...uniqueGroups] = await Promise.all([
  get(`/stash/current/currency/overview${query}&type=Currency`),
  get(`/stash/current/currency/overview${query}&type=Fragment`),
  get(`/exchange/current/overview${query}&type=DivinationCard`),
  ...UNIQUE_TYPES.map((type) =>
    get(`/stash/current/item/overview${query}&type=${type}`),
  ),
]);

const divineChaos =
  currency.lines.find((line) => line.currencyTypeName === 'Divine Orb')
    ?.chaosEquivalent ?? 1;

const known = new Set(
  JSON.parse(await readFile(KNOWN, 'utf8')).names,
);

const currencyTiers = {};
for (const line of currency.lines) {
  if (!line.currencyTypeName || !Number.isFinite(line.chaosEquivalent)) continue;
  if (!known.has(line.currencyTypeName)) continue;
  currencyTiers[line.currencyTypeName] = tier(
    line.chaosEquivalent,
    divineChaos,
  );
}
for (const name of STATIC_CURRENCY_T1) currencyTiers[name] = 1;
for (const name of STATIC_CURRENCY_T2) {
  // Floor, not a cap: keep a value-tiered T1, promote everything else.
  if (currencyTiers[name] === undefined || currencyTiers[name] > 2) {
    currencyTiers[name] = 2;
  }
}

const fragmentTiers = {};
for (const line of fragments.lines) {
  if (!line.currencyTypeName || !Number.isFinite(line.chaosEquivalent)) continue;
  fragmentTiers[line.currencyTypeName] = tier(
    line.chaosEquivalent,
    divineChaos,
  );
}

const divinationNames = new Map(
  (divination.items ?? []).map((item) => [item.id, item.name]),
);
const divinationTiers = {};
for (const line of divination.lines) {
  const name = divinationNames.get(line.id);
  if (!name || !Number.isFinite(line.primaryValue)) continue;
  if (!known.has(name)) continue;
  divinationTiers[name] = tier(line.primaryValue, divineChaos);
}

const uniqueBaseValue = new Map();
for (const group of uniqueGroups) {
  for (const line of group.lines ?? []) {
    if (!line.baseType || !Number.isFinite(line.chaosValue)) continue;
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

const output = {
  schemaVersion: 1,
  league: { id: league.id, name: league.name },
  fetchedAt: new Date().toISOString(),
  source: 'https://poe.ninja/poe1/economy',
  divineChaos,
  tiers: {
    currency: currencyTiers,
    fragment: fragmentTiers,
    divination: divinationTiers,
    uniqueBase: uniqueBaseTiers,
  },
};

// Hand-written overrides are applied by build-presets.mjs, so this file stays a
// faithful snapshot of what poe.ninja returned.
await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`);

const count = (tiers, wanted) =>
  Object.values(tiers).filter((value) => value === wanted).length;
console.log(
  `Wrote ${OUT}\n${league.name}: divine ${divineChaos}c, ` +
    `currency T1/T2/T3 ${count(currencyTiers, 1)}/${count(currencyTiers, 2)}/${count(currencyTiers, 3)}, ` +
    `unique bases ${Object.keys(uniqueBaseTiers).length}`,
);