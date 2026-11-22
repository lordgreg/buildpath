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
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REF = process.env.REPOE_REF ?? 'master';
const SOURCE = `https://raw.githubusercontent.com/brather1ng/RePoE/${REF}/RePoE/data/base_items.json`;
const OUT = fileURLToPath(new URL('../src/core/data/base-types.json', import.meta.url));
const KNOWN_OUT = fileURLToPath(
  new URL('../src/core/data/known-base-types.json', import.meta.url),
);
const EXTRA = fileURLToPath(
  new URL('../src/core/data/base-types-extra.json', import.meta.url),
);
const SKILLS_OUT = fileURLToPath(
  new URL('../src/meta/skill-names.json', import.meta.url),
);
const SKILLS_EXTRA = fileURLToPath(
  new URL('../src/meta/skill-names-extra.json', import.meta.url),
);
const GEMS_SOURCE = `https://raw.githubusercontent.com/brather1ng/RePoE/${REF}/RePoE/data/gems.json`;
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
    requirements: item.requirements
      ? {
          str: item.requirements.strength ?? 0,
          dex: item.requirements.dexterity ?? 0,
          int: item.requirements.intelligence ?? 0,
        }
      : undefined,
  });
}

const items = [...byKey.values()].sort(
  (a, b) => a.name.localeCompare(b.name) || a.itemClass.localeCompare(b.itemClass),
);

// Every name the game will accept in a BaseType condition: gear, currency,
// divination cards, gems, and unique-only bases. Unique item names are not in
// this namespace, which is why filters must reference a unique's base type.
const known = new Set();
for (const item of Object.values(raw)) {
  if (!item.name || !item.item_class) continue;
  if (item.release_state !== 'released' && item.release_state !== 'unique_only') {
    continue;
  }
  if (item.item_class === 'FishingRod') continue;
  known.add(item.name);
}

// RePoE occasionally lags behind newly added items. The supplement is
// hand-checked against a working filter and reviewed in diffs.
try {
  const extra = JSON.parse(await readFile(EXTRA, 'utf8'));
  for (const name of extra) known.add(name);
} catch {
  // No supplement file, nothing to merge.
}

const knownNames = [...known].sort();

const gemsResponse = await fetch(GEMS_SOURCE, {
  headers: { 'user-agent': USER_AGENT },
});
if (!gemsResponse.ok) {
  throw new Error(
    `RePoE gems request failed: ${gemsResponse.status} ${gemsResponse.statusText}`,
  );
}
const gemData = await gemsResponse.json();
const skillByName = new Map();
for (const gem of Object.values(gemData)) {
  const name = gem.base_item?.display_name;
  if (!name || name.startsWith('[')) continue;
  if (gem.is_support) continue;
  if (gem.base_item.release_state !== 'released') continue;
  if (!gem.active_skill) continue;
  if (skillByName.has(name)) continue;

  const tags = gem.tags ?? [];
  skillByName.set(name, {
    name,
    types: gem.active_skill.types ?? [],
    tags,
    weaponRestrictions: gem.active_skill.weapon_restrictions ?? [],
    primaryAttribute:
      ['strength', 'dexterity', 'intelligence'].find((tag) =>
        tags.includes(tag),
      ) ?? null,
  });
}
const skillNames = [...skillByName.values()];

// RePoE's gem feed lags on transfigured and other new gems, so a reviewed
// supplement is merged in the same way as base-types-extra.json.
try {
  const extra = JSON.parse(await readFile(SKILLS_EXTRA, 'utf8'));
  const seen = new Set(skillNames.map((skill) => skill.name));
  for (const name of extra) {
    if (seen.has(name)) continue;
    skillNames.push({
      name,
      types: [],
      tags: [],
      weaponRestrictions: [],
      primaryAttribute: null,
    });
    seen.add(name);
  }
} catch {
  // No supplement file, nothing to merge.
}

skillNames.sort((a, b) => a.name.localeCompare(b.name));

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
await writeFile(
  KNOWN_OUT,
  `${JSON.stringify(
    {
      meta: { ...output.meta, count: knownNames.length },
      names: knownNames,
    },
    null,
    0,
  )}\n`,
);
await writeFile(
  SKILLS_OUT,
  `${JSON.stringify(
    {
      meta: {
        source: GEMS_SOURCE,
        ref: REF,
        generatedAt: new Date().toISOString(),
        count: skillNames.length,
      },
      skills: skillNames,
    },
    null,
    0,
  )}\n`,
);

console.log(`Wrote ${items.length} base types to ${OUT}`);
console.log(`Wrote ${knownNames.length} known BaseType names to ${KNOWN_OUT}`);
console.log(`Wrote ${skillNames.length} skill gems to ${SKILLS_OUT}`);
console.log(`sha256 ${digest}`);