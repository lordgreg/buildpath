#!/usr/bin/env node
/**
 * Downloads a Path of Exile data export and trims it to what a loot filter
 * needs. We keep name, item class, tags, drop level and inventory size. Tags
 * are the important part: they let archetypes select whole families of bases
 * without hand-typing hundreds of names.
 *
 * The source is the maintained RePoE export published by repoe-fork, which is
 * no longer the frozen brather1ng/RePoE repository:
 *
 *   https://github.com/repoe-fork/repoe            parser and schema
 *   https://github.com/repoe-fork/repoe-fork.github.io   generated data
 *
 * The export is pinned to one commit of the generated-data repository, so a
 * run is reproducible even though the site serves the newest export. Bump the
 * pin deliberately and review the diff.
 *
 * Override the pin with REPOE_REF=<commit> for a one-off run.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Export 3.30.0.4.3, published by repoe-fork/repoe-fork.github.io. */
const REF = process.env.REPOE_REF ?? '1d825f53356023dee0fbb3ec23d94057da8fe0ac';
const DATA_ROOT = `https://raw.githubusercontent.com/repoe-fork/repoe-fork.github.io/${REF}/data`;
const SOURCE = `${DATA_ROOT}/base_items.json`;
const OUT = fileURLToPath(new URL('../src/core/data/base-types.json', import.meta.url));
const KNOWN_OUT = fileURLToPath(
  new URL('../src/core/data/known-base-types.json', import.meta.url),
);
const EXTRA = fileURLToPath(
  new URL('../src/core/data/base-types-extra.json', import.meta.url),
);
const REMOVED = fileURLToPath(
  new URL('../src/core/data/base-types-removed.json', import.meta.url),
);
const CLASS_MAP = fileURLToPath(
  new URL('../src/core/data/class-map.json', import.meta.url),
);
const EQUIPMENT_CLASSES = fileURLToPath(
  new URL('../src/core/data/equipment-classes.json', import.meta.url),
);
const CLASSES_EXTRA = fileURLToPath(
  new URL('../src/core/data/classes-extra.json', import.meta.url),
);
const CLASSES_REMOVED = fileURLToPath(
  new URL('../src/core/data/classes-removed.json', import.meta.url),
);
const CLASSES_OUT = fileURLToPath(
  new URL('../src/core/data/known-classes.json', import.meta.url),
);
const SKILLS_OUT = fileURLToPath(
  new URL('../src/meta/skill-names.json', import.meta.url),
);
const SKILLS_EXTRA = fileURLToPath(
  new URL('../src/meta/skill-names-extra.json', import.meta.url),
);
const GEMS_SOURCE = `${DATA_ROOT}/gems.json`;
const USER_AGENT = 'BuildPath/0.1 (+https://github.com/lordgreg/buildpath)';

/** Reads a JSON array, treating a missing or malformed file as empty. */
async function readJsonList(path) {
  try {
    const value = JSON.parse(await readFile(path, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/** Reads a required JSON object; a missing or malformed file is a build error. */
async function readJsonObject(path) {
  const value = JSON.parse(await readFile(path, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must hold a JSON object`);
  }
  return value;
}

// The export has one entry per item class, and item classes are the stable
// unit. Which classes hold gear comes from the reviewed equipment list; which
// raw classes map to a filter class comes from class-map.json. A raw class
// without a mapping is not filterable, so it is left out instead of guessed.
const classMap = await readJsonObject(CLASS_MAP);
const classExtras = await readJsonList(CLASSES_EXTRA);
const classRemoved = new Set(await readJsonList(CLASSES_REMOVED));
const equipmentClasses = new Set(await readJsonList(EQUIPMENT_CLASSES));

/** The flask classes the game names differently from RePoE's `LifeFlask`. */
const FLASK_CLASSES = {
  LifeFlask: 'Life Flask',
  ManaFlask: 'Mana Flask',
  HybridFlask: 'Hybrid Flask',
  UtilityFlask: 'Utility Flask',
};

const filterClassOf = (item) => {
  const rawClass = FLASK_CLASSES[item.item_class] ?? item.item_class;
  return classMap[rawClass] ?? null;
};

const response = await fetch(SOURCE, { headers: { 'user-agent': USER_AGENT } });
if (!response.ok) {
  throw new Error(`Data export request failed: ${response.status} ${response.statusText}`);
}

const raw = await response.json();
const byKey = new Map();

for (const item of Object.values(raw)) {
  if (item.release_state !== 'released') continue;
  if (!item.name || !item.item_class) continue;
  if (item.item_class === 'FishingRod') continue;

  const itemClass = FLASK_CLASSES[item.item_class] ?? item.item_class;
  if (!equipmentClasses.has(classMap[itemClass])) continue;

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

// RePoE still reports a few bases as released that the live game has dropped or
// renamed. Every entry here is checked against the game's own item data, since
// a single unknown name makes the client refuse the whole filter.
const removed = new Set(await readJsonList(REMOVED));

const items = [...byKey.values()]
  .filter((item) => !removed.has(item.name))
  .sort(
    (a, b) =>
      a.name.localeCompare(b.name) || a.itemClass.localeCompare(b.itemClass),
  );

// Every `Class` value the game accepts. The export's item_class values are the
// raw source; class-map.json turns them into the plural names filters use. A
// raw class without a mapping is a class the filter language does not know, so
// it is left out and reported instead of guessed.
const knownClasses = new Set();
const unmappedClasses = new Set();
for (const item of Object.values(raw)) {
  const rawClass = FLASK_CLASSES[item.item_class] ?? item.item_class;
  if (!rawClass) continue;
  const filterClass = classMap[rawClass];
  if (!filterClass) {
    unmappedClasses.add(rawClass);
    continue;
  }
  knownClasses.add(filterClass);
}
for (const name of classExtras) knownClasses.add(name);
for (const name of classRemoved) knownClasses.delete(name);

const knownClassNames = [...knownClasses].sort();

// Every name the game will accept in a BaseType condition: gear, currency,
// divination cards, fragments, gems, and unique-only bases. Unique item names
// are not in this namespace, which is why filters must reference a unique's
// base type. Only item classes the filter language knows are admitted, so
// placeholder classes (HiddenItem, RemovedItem, GhostItem, ...) never enter the
// registry and a typo still fails the build.
const known = new Set();
for (const item of Object.values(raw)) {
  if (!item.name || !item.item_class) continue;
  if (item.release_state !== 'released' && item.release_state !== 'unique_only') {
    continue;
  }
  if (item.item_class === 'FishingRod') continue;
  const filterClass = filterClassOf(item);
  if (!filterClass || !knownClasses.has(filterClass)) continue;
  known.add(item.name);
}

// A supplement for names the export lags on. Hand-checked against a working
// filter and reviewed in diffs.
try {
  const extra = JSON.parse(await readFile(EXTRA, 'utf8'));
  for (const name of extra) known.add(name);
} catch {
  // No supplement file, nothing to merge.
}

// Names the game rejects must leave the registry too, or it would validate a
// filter the client then refuses to load.
for (const name of removed) known.delete(name);

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
  CLASSES_OUT,
  `${JSON.stringify(
    {
      meta: {
        source: SOURCE,
        ref: REF,
        generatedAt: new Date().toISOString(),
        count: knownClassNames.length,
      },
      names: knownClassNames,
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
console.log(`Wrote ${knownClassNames.length} known Class names to ${CLASSES_OUT}`);
console.log(`Wrote ${skillNames.length} skill gems to ${SKILLS_OUT}`);
console.log(`sha256 ${digest}`);
if (unmappedClasses.size > 0) {
  console.log(
    `Left out ${unmappedClasses.size} item classes with no filter class: ${[...unmappedClasses].sort().join(', ')}`,
  );
}