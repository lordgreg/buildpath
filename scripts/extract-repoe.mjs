#!/usr/bin/env node
/**
 * Downloads RePoE's base item dump and trims it to what a loot filter needs.
 *
 * RePoE: https://github.com/brather1ng/RePoE (community datamining).
 * We keep name, item class, tags, drop level and inventory size. Tags are the
 * important part: they let archetypes select whole families of bases without
 * hand-typing hundreds of names.
 *
 * Override the source with REPOE_REF=<tag-or-commit> for a reproducible run.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REF = process.env.REPOE_REF ?? 'master';
const SOURCE = `https://raw.githubusercontent.com/brather1ng/RePoE/${REF}/RePoE/data/base_items.json`;
const OUT = fileURLToPath(new URL('../src/core/data/base-types.json', import.meta.url));
const USER_AGENT = 'FilterPath/0.1 (+https://github.com/lordgreg/filterpath)';

// RePoE splits gear, flasks and jewels across domains. Filter rules need all
// three, so include them and normalise flask classes to singular names.
const DOMAINS = new Set(['item', 'flask', 'misc', 'abyss_jewel', 'affliction_jewel']);
const FLASK_CLASSES = {
  LifeFlask: 'Life Flask',
  ManaFlask: 'Mana Flask',
  HybridFlask: 'Hybrid Flask',
  UtilityFlask: 'Utility Flask',
};

const response = await fetch(SOURCE, { headers: { 'user-agent': USER_AGENT } });
if (!response.ok) {
  throw new Error(`RePoE request failed: ${response.status} ${response.statusText}`);
}

const raw = await response.json();
const byKey = new Map();

for (const item of Object.values(raw)) {
  if (!DOMAINS.has(item.domain)) continue;
  if (item.release_state !== 'released') continue;
  if (!item.name || !item.item_class) continue;
  if (item.item_class === 'FishingRod') continue;

  const itemClass = FLASK_CLASSES[item.item_class] ?? item.item_class;
  const key = `${item.name}\u0000${itemClass}`;
  const existing = byKey.get(key);

  if (existing) {
    existing.tags = [...new Set([...existing.tags, ...(item.tags ?? [])])].sort();
    existing.dropLevel = Math.min(existing.dropLevel, item.drop_level ?? existing.dropLevel);
    continue;
  }

  byKey.set(key, {
    name: item.name,
    itemClass,
    tags: [...new Set(item.tags ?? [])].sort(),
    dropLevel: item.drop_level ?? 0,
    width: item.inventory_width ?? 1,
    height: item.inventory_height ?? 1,
  });
}

const items = [...byKey.values()].sort(
  (a, b) => a.name.localeCompare(b.name) || a.itemClass.localeCompare(b.itemClass),
);

const digest = createHash('sha256').update(JSON.stringify(items)).digest('hex');

const output = {
  meta: {
    source: SOURCE,
    ref: REF,
    generatedAt: new Date().toISOString(),
    count: items.length,
    sha256: digest,
  },
  items,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(output, null, 0)}\n`);

console.log(`Wrote ${items.length} base types to ${OUT}`);
console.log(`sha256 ${digest}`);