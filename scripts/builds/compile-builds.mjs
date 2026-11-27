#!/usr/bin/env node
/**
 * Compiles every build seed under src/builds/ into committed JSON.
 *
 * The browser never parses YAML, and the pipeline never invents a build: this
 * script only validates a hand-written seed and adds the fields the site needs.
 * Provenance (gates, PoB code, patch) is added later by the PoB pipeline; until
 * then a build compiles as `draft`.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';
import { resolveGuide } from './guide.mjs';
import { medalFor } from '../../src/core/builds/ratings.ts';
import {
  applyBuildStaleness,
  leagueWindowOpen,
} from '../../src/core/builds/staleness.ts';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const seedsDir = resolve(root, 'src/builds');
const schemaPath = resolve(root, 'src/presets/schema/build.schema.json');
const outDir = resolve(root, 'src/generated/builds');

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function fail(file, errors) {
  const detail = (errors ?? [])
    .map((error) => `  ${error.instancePath || '/'} ${error.message ?? ''}`)
    .join('\n');
  console.error(`build seed invalid: ${file}\n${detail}`);
  process.exit(1);
}

function hashOf(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 12);
}

const gemLevels = JSON.parse(
  readFileSync(resolve(root, 'src/generated/gem-levels.json'), 'utf8'),
).gems;
const gearProfiles =
  parse(readFileSync(resolve(seedsDir, 'gear/profiles.yaml'), 'utf8')).profiles ?? {};
const pantheon = parse(
  readFileSync(resolve(seedsDir, 'config/pantheon.yaml'), 'utf8'),
);
const ascendanciesFull = parse(
  readFileSync(resolve(seedsDir, 'config/ascendancies-full.yaml'), 'utf8'),
);
const league = parse(
  readFileSync(resolve(seedsDir, 'config/league.yaml'), 'utf8'),
);
const viscera = parse(
  readFileSync(resolve(seedsDir, 'config/viscera.yaml'), 'utf8'),
);
const stepPlanConfig = parse(
  readFileSync(resolve(seedsDir, 'config/step-plans.yaml'), 'utf8'),
);
const gemSources = parse(
  readFileSync(resolve(seedsDir, 'config/gem-sources.yaml'), 'utf8'),
).gems ?? {};
// A typo in the supplement would silently fall back to RePoE, so fail loudly.
for (const [name, extra] of Object.entries(gemSources)) {
  if (!gemLevels[name]) {
    console.error(`gem-sources: unknown gem "${name}"`);
    process.exit(1);
  }
  for (const route of ['reward', 'vendor']) {
    const entry = extra?.[route];
    if (!entry) continue;
    if (!Array.isArray(entry.classes) || entry.classes.length === 0) {
      console.error(`gem-sources: ${name} ${route} has no classes`);
      process.exit(1);
    }
    if (typeof entry.quest !== 'string' || !entry.quest) {
      console.error(`gem-sources: ${name} ${route} has no quest`);
      process.exit(1);
    }
  }
}
const checkpointConfig = parse(
  readFileSync(resolve(seedsDir, 'config/checkpoints.yaml'), 'utf8'),
).checkpoints ?? {};
const checkpointIds = Object.keys(checkpointConfig);
const budgets = parse(
  readFileSync(resolve(seedsDir, 'gear/budgets.yaml'), 'utf8'),
);
const visceraByName = new Map(
  (viscera.items ?? []).map((item) => [item.name, item]),
);
const WICKERMAN_STEPS = ['leveling', 'maps', 'bossing'];
const WICKERMAN_SLOTS = ['head', 'torso', 'upperLimb', 'lowerLimb'];
// Season tags are display names from the reviewed league registry, never the
// raw id, so the catalogue reads "Covens" rather than "covens".
const leaguesIndex = parse(
  readFileSync(resolve(root, 'src/presets/leagues/index.yaml'), 'utf8'),
);
const leaguesById = new Map(
  (leaguesIndex.leagues ?? []).map((entry) => {
    const detailPath = resolve(root, `src/presets/leagues/${entry.id}.yaml`);
    const detail = existsSync(detailPath)
      ? parse(readFileSync(detailPath, 'utf8'))
      : undefined;
    return [
      entry.id,
      { id: entry.id, name: detail?.league?.name ?? entry.name ?? entry.id },
    ];
  }),
);
const leagueOpen = leagueWindowOpen(new Date(), league.startsAt);
const patchFactsPath = resolve(root, 'src/generated/patch-facts.json');
const patchFacts = existsSync(patchFactsPath)
  ? JSON.parse(readFileSync(patchFactsPath, 'utf8'))
  : undefined;
const gemLevel1 = (name) => gemLevels[name]?.levels?.[1];
const gemName = (gem) => (typeof gem === 'string' ? gem : gem.name);
const baseItems = new Map(
  JSON.parse(
    readFileSync(resolve(root, 'src/core/data/base-types.json'), 'utf8'),
  ).items.map((item) => [item.name, item]),
);

const ARMOUR_SLOTS = new Set(['helmet', 'body', 'gloves', 'boots']);
const DEFENCE_TAGS = new Set([
  'int_armour',
  'str_armour',
  'dex_armour',
  'str_int_armour',
  'str_dex_armour',
  'dex_int_armour',
]);

/**
 * A build's filter is generated from the gear the PoB gates measured, not from
 * the ascendancy default. The seed may still override a slot (D15), but a slot
 * the seed leaves out is derived from the same profiles and budgets the
 * verifier used, so a build can never publish a filter that hides its own gear.
 */
function deriveGearFilter(seed) {
  const profile = gearProfiles[seed.gearProfile ?? 'caster'] ?? {};
  const collected = new Map();
  let offhandRemoved = false;
  const add = (slot, baseName) => {
    if (!baseName) return;
    if (!collected.has(slot)) collected.set(slot, new Set());
    collected.get(slot).add(baseName);
  };
  for (const checkpoint of Object.values(checkpointConfig)) {
    const budget = budgets[checkpoint.budget];
    if (!budget) continue;
    const override = profile[checkpoint.budget] ?? {};
    const slots = { ...(budget.slots ?? {}), ...(override.slots ?? {}) };
    for (const slot of ['weapon', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet']) {
      const spec = slots[slot];
      if (spec) add(slot, spec.base);
    }
    for (const ring of ['ring1', 'ring2']) {
      const spec = slots[ring];
      if (spec) add('ring', spec.base);
    }
    if (slots.offhand === null) offhandRemoved = true;
    else if (slots.offhand) add('offhand', slots.offhand.base);
    const jewel = override.jewels ?? budget.jewels ?? {};
    if ((jewel.count ?? 0) > 0) add('jewel', jewel.base ?? 'Ghastly Eye Jewel');
  }
  const slots = {};
  for (const [slot, names] of collected) {
    const items = [...names].map((name) => baseItems.get(name)).filter(Boolean);
    if (items.length === 0) continue;
    const itemClasses = [...new Set(items.map((item) => item.itemClass))].sort();
    const tags = new Set();
    if (ARMOUR_SLOTS.has(slot) || slot === 'offhand') {
      for (const item of items) {
        for (const tag of item.tags) {
          if (DEFENCE_TAGS.has(tag)) tags.add(tag);
        }
      }
    }
    if (slot === 'jewel') {
      for (const item of items) {
        for (const tag of item.tags) {
          if (tag === 'abyss_jewel') continue;
          if (
            tag.startsWith('abyss_jewel_') ||
            ['strjewel', 'dexjewel', 'intjewel'].includes(tag)
          ) {
            tags.add(tag);
          }
        }
      }
    }
    slots[slot] = {
      itemClasses,
      ...(tags.size > 0 ? { tags: [...tags].sort() } : {}),
    };
  }
  if (offhandRemoved) slots.offhand = null;
  const explicit = seed.filter?.slots ?? {};
  return { slots: { ...slots, ...explicit } };
}

/**
 * A bracket is a promise about what you can have at that level, so nothing may
 * name a gem or flask that the game does not let you use yet.
 */
function checkAvailability(seed, file) {
  for (const bracket of seed.leveling.brackets) {
    for (const group of bracket.skillGroups ?? []) {
      for (const gem of group.gems) {
        const name = gemName(gem);
        const required = gemLevel1(name);
        if (required === undefined) {
          console.error(
            `build seed invalid: ${file}\n  unknown gem "${name}" in ${bracket.until}/${group.slot}`,
          );
          process.exit(1);
        }
        if (required > bracket.until) {
          console.error(
            `build seed invalid: ${file}\n  ${name} needs level ${required}, but ${bracket.until} lists it`,
          );
          process.exit(1);
        }
      }
    }
    for (const flask of bracket.flasks ?? []) {
      const base = baseItems.get(flask.name);
      if (!base) {
        console.error(
          `build seed invalid: ${file}\n  unknown flask "${flask.name}" in ${bracket.until}`,
        );
        process.exit(1);
      }
      if ((base.dropLevel ?? 1) > bracket.until) {
        console.error(
          `build seed invalid: ${file}\n  ${flask.name} drops from level ${base.dropLevel}, but ${bracket.until} lists it`,
        );
        process.exit(1);
      }
    }
  }
}

/**
 * A swap is editorial advice, but it still may not name a gem the character
 * cannot hold at `fromLevel`, and it must replace a gem the build actually
 * levels with.
 */
function checkSwaps(seed, file) {
  const swaps = seed.leveling.swaps ?? [];
  if (swaps.length === 0) return;
  const bracketGems = new Set();
  for (const bracket of seed.leveling.brackets) {
    for (const skill of bracket.skills ?? []) bracketGems.add(gemName(skill));
    for (const group of bracket.skillGroups ?? []) {
      for (const gem of group.gems) bracketGems.add(gemName(gem));
    }
  }
  for (const swap of swaps) {
    const required = gemLevel1(swap.gem);
    if (required === undefined) {
      console.error(`build seed invalid: ${file}\n  unknown swap gem "${swap.gem}"`);
      process.exit(1);
    }
    if (required > swap.fromLevel) {
      console.error(
        `build seed invalid: ${file}\n  swap gem ${swap.gem} needs level ${required}, but fromLevel is ${swap.fromLevel}`,
      );
      process.exit(1);
    }
    if (!seed.leveling.brackets.some((bracket) => bracket.until >= swap.fromLevel)) {
      console.error(
        `build seed invalid: ${file}\n  swap gem ${swap.gem} starts at ${swap.fromLevel}, after the last bracket`,
      );
      process.exit(1);
    }
    if (swap.untilLevel !== undefined && swap.untilLevel <= swap.fromLevel) {
      console.error(
        `build seed invalid: ${file}\n  swap gem ${swap.gem} must end after it starts (${swap.fromLevel}–${swap.untilLevel})`,
      );
      process.exit(1);
    }
    if (swap.replaces !== undefined && !bracketGems.has(swap.replaces)) {
      console.error(
        `build seed invalid: ${file}\n  swap gem ${swap.gem} replaces "${swap.replaces}", which the build never lists`,
      );
      process.exit(1);
    }
  }
}

/** Declared leveling brackets must be ordered, unique and end at 100. */
function checkBrackets(seed, file) {
  const brackets = seed.leveling.brackets;
  let previous = 0;
  for (const bracket of brackets) {
    if (bracket.until <= previous) {
      console.error(
        `build seed invalid: ${file}\n  brackets must ascend; ${bracket.until} follows ${previous}`,
      );
      process.exit(1);
    }
    previous = bracket.until;
  }
  if (previous !== 100) {
    console.error(
      `build seed invalid: ${file}\n  the last bracket must end at 100, not ${previous}`,
    );
    process.exit(1);
  }
}

/**
 * A guide's season tag and its changelog are one promise: the tag says which
 * league the current guide belongs to, and the newest changelog entry must be
 * that league's update. Updating for a new league therefore cannot land with a
 * stale tag, and a tag cannot move without a line saying what changed.
 */
function checkSeason(seed, file) {
  const season = leaguesById.get(seed.season);
  if (!season) {
    console.error(
      `build seed invalid: ${file}\n  unknown season "${seed.season}" (see src/presets/leagues/index.yaml)`,
    );
    process.exit(1);
  }
  if (!Array.isArray(seed.changelog) || seed.changelog.length === 0) {
    console.error(`build seed invalid: ${file}\n  changelog must have at least one entry`);
    process.exit(1);
  }
  let previous = 0;
  for (const entry of seed.changelog) {
    if (!leaguesById.has(entry.season)) {
      console.error(
        `build seed invalid: ${file}\n  changelog names unknown season "${entry.season}"`,
      );
      process.exit(1);
    }
    const at = Date.parse(`${entry.date}T00:00:00Z`);
    if (!Number.isFinite(at)) {
      console.error(`build seed invalid: ${file}\n  changelog date "${entry.date}" is invalid`);
      process.exit(1);
    }
    if (at < previous) {
      console.error(`build seed invalid: ${file}\n  changelog entries must be oldest first`);
      process.exit(1);
    }
    previous = at;
  }
  const newest = seed.changelog.at(-1);
  if (newest.season !== seed.season) {
    console.error(
      `build seed invalid: ${file}\n  season "${seed.season}" does not match the newest changelog entry "${newest.season}"`,
    );
    process.exit(1);
  }
}

/**
 * Resolve the Covens Wickerman section. A profile is an archetype's best
 * Viscera per phase; the build only names the profile. Every pick must exist,
 * match the slot and have the named tier, so a typo cannot publish an item the
 * game does not have.
 */
function resolveWickerman(seed, file) {
  const profileId = seed.wickerman?.profile;
  const profile = viscera.profiles?.[profileId];
  if (!profile) {
    console.error(
      `build seed invalid: ${file}\n  unknown wickerman profile "${profileId}" (see config/viscera.yaml)`,
    );
    process.exit(1);
  }
  const steps = {};
  for (const step of WICKERMAN_STEPS) {
    const picks = profile[step];
    if (!picks) {
      console.error(`build seed invalid: ${file}\n  wickerman profile "${profileId}" is missing ${step}`);
      process.exit(1);
    }
    const slotPicks = {};
    for (const slot of WICKERMAN_SLOTS) {
      const pick = picks[slot];
      if (!pick) {
        console.error(
          `build seed invalid: ${file}\n  wickerman ${profileId}/${step} is missing ${slot}`,
        );
        process.exit(1);
      }
      const item = visceraByName.get(pick.item);
      if (!item) {
        console.error(
          `build seed invalid: ${file}\n  wickerman item "${pick.item}" is not in config/viscera.yaml`,
        );
        process.exit(1);
      }
      if (item.slot !== slot) {
        console.error(
          `build seed invalid: ${file}\n  wickerman item "${pick.item}" is ${item.slot}, not ${slot}`,
        );
        process.exit(1);
      }
      const effect = item.tiers?.[pick.tier];
      if (!effect) {
        console.error(
          `build seed invalid: ${file}\n  wickerman item "${pick.item}" has no ${pick.tier} tier`,
        );
        process.exit(1);
      }
      slotPicks[slot] = {
        name: item.name,
        tier: pick.tier,
        effect,
        source: item.source,
        area: item.area,
        ...(pick.note ? { note: pick.note } : {}),
      };
    }
    steps[step] = slotPicks;
  }
  return { profile: profileId, steps };
}

/**
 * Resolve the per-checkpoint step plan: goals, gear targets and crafting. The
 * seed names a profile; every checkpoint in checkpoints.yaml must be covered.
 */
function resolveStepPlans(seed, file) {
  const profileId = seed.stepPlan;
  const profile = stepPlanConfig.profiles?.[profileId];
  if (!profile) {
    console.error(
      `build seed invalid: ${file}\n  unknown stepPlan profile "${profileId}" (see config/step-plans.yaml)`,
    );
    process.exit(1);
  }
  const plans = {};
  for (const checkpoint of checkpointIds) {
    const plan = profile[checkpoint];
    if (!plan) {
      console.error(
        `build seed invalid: ${file}\n  stepPlan profile "${profileId}" is missing ${checkpoint}`,
      );
      process.exit(1);
    }
    if (!Array.isArray(plan.goals) || plan.goals.length === 0) {
      console.error(
        `build seed invalid: ${file}\n  stepPlan ${profileId}/${checkpoint} has no goals`,
      );
      process.exit(1);
    }
    if (!Array.isArray(plan.lookFor) || plan.lookFor.length === 0) {
      console.error(
        `build seed invalid: ${file}\n  stepPlan ${profileId}/${checkpoint} has no lookFor`,
      );
      process.exit(1);
    }
    for (const entry of [...plan.lookFor, ...(plan.crafting ?? [])]) {
      if (!entry.slot || !Array.isArray(entry.mods) || entry.mods.length === 0) {
        console.error(
          `build seed invalid: ${file}\n  stepPlan ${profileId}/${checkpoint} has a slot without mods`,
        );
        process.exit(1);
      }
    }
    plans[checkpoint] = {
      goals: plan.goals,
      lookFor: plan.lookFor,
      ...(plan.crafting?.length ? { crafting: plan.crafting } : {}),
    };
  }
  return plans;
}

/**
 * Where each gem comes from for this class: a free quest reward, the vendor
 * pool the quest opens, Siosa, or the Divine Font. The distinction matters to a
 * new player ("do I have to buy this?") so the guide carries it. The reviewed
 * supplement wins over RePoE, whose export names one quest per gem and drops
 * the rest; see src/builds/config/gem-sources.yaml.
 */
function sourceForGem(name, className, entry) {
  const extra = gemSources[name] ?? {};
  if (extra.transfigured) return { kind: 'divine-font', act: null, quest: null };
  const reward = extra.reward;
  if (reward?.classes?.includes(className)) {
    return { kind: 'reward', act: reward.act ?? null, quest: reward.quest ?? null };
  }
  const vendor = extra.vendor;
  if (vendor?.classes?.includes(className)) {
    return { kind: 'vendor', act: vendor.act ?? null, quest: vendor.quest ?? null };
  }
  if (extra.siosa) return { kind: 'siosa', act: 3, quest: 'A Fixture of Fate' };
  if (extra.lilly) return { kind: 'lilly', act: 6, quest: 'Fallen from Grace' };
  const quest = entry.quest ?? null;
  if (quest) {
    return {
      kind: quest.classes.includes(className) ? 'reward' : 'vendor',
      act: quest.act ?? null,
      quest: quest.quest ?? null,
    };
  }
  // A gem some other class buys from an early vendor is also on Siosa's shelf.
  if ((extra.vendor || extra.reward) && entry.levels[1] <= 31) {
    return { kind: 'siosa', act: 3, quest: 'A Fixture of Fate' };
  }
  return { kind: 'level', act: null, quest: null };
}

function describeGems(seed) {
  const names = new Set();
  for (const bracket of seed.leveling.brackets) {
    for (const group of bracket.skillGroups ?? []) {
      for (const gem of group.gems) names.add(gemName(gem));
    }
    for (const gem of bracket.skills ?? []) names.add(gemName(gem));
  }
  // Swap gems are shown on the guide too, so their colour, availability and
  // description have to be present even when they never appear in a gate.
  for (const swap of seed.leveling.swaps ?? []) {
    names.add(swap.gem);
    if (swap.replaces) names.add(swap.replaces);
  }
  const info = {};
  for (const name of [...names].sort()) {
    const entry = gemLevels[name];
    if (!entry) continue;
    info[name] = {
      requiredLevel: entry.levels[1],
      source: sourceForGem(name, seed.class, entry),
      color: entry.color ?? null,
      support: entry.support === true,
      description: entry.description ?? null,
      effect: entry.effect ?? [],
      tags: entry.tags ?? [],
      qualityEffect: entry.qualityEffect ?? '',
      qualityWorth: entry.qualityWorth ?? 'none',
    };
  }
  return info;
}

const files = readdirSync(seedsDir)
  .filter((name) => name.endsWith('.yaml'))
  .sort();

if (files.length === 0) {
  console.error('no build seeds found under src/builds/');
  process.exit(1);
}

const builds = [];
const seedById = new Map();
const previousById = new Map();
for (const file of files) {
  const path = resolve(seedsDir, file);
  const seed = parse(readFileSync(path, 'utf8'));
  if (!validate(seed)) fail(file, validate.errors);
  // A profile that does not exist would only fail in the oracle, which needs
  // PoB; catch it where every build is compiled.
  if (seed.gearProfile && !gearProfiles[seed.gearProfile]) {
    fail(file, [
      {
        instancePath: '/gearProfile',
        message: `unknown gear profile "${seed.gearProfile}" (see gear/profiles.yaml)`,
      },
    ]);
  }
  checkBrackets(seed, file);
  checkAvailability(seed, file);
  checkSwaps(seed, file);
  checkSeason(seed, file);
  const wickerman = resolveWickerman(seed, file);
  const stepPlans = resolveStepPlans(seed, file);
  if (`${seed.id}.yaml` !== file) {
    console.error(
      `build seed invalid: ${file}\n  id "${seed.id}" must match the file name`,
    );
    process.exit(1);
  }
  if (builds.some((entry) => entry.id === seed.id)) {
    console.error(`build seed invalid: ${file}\n  duplicate id "${seed.id}"`);
    process.exit(1);
  }
  // Prose edits must not force a re-verification, so the mechanics hash leaves
  // the guide out. Season tags and the build changelog are editorial too: moving
  // a tag or adding an update must not throw away the measured gates.
  const {
    guide: seedGuide,
    season: seedSeason,
    changelog: seedChangelog,
    wickerman: seedWickerman,
    stepPlan: seedStepPlan,
    ...mechanics
  } = seed;
  // A swap is advice about what to use between checkpoints; it never changes
  // what PoB measured, so it stays out of the hash like the guide prose.
  const hashedLeveling = { ...mechanics.leveling };
  delete hashedLeveling.swaps;
  // The profile's bases and affixes are part of what PoB measured, so a change
  // to profiles.yaml must invalidate the gates the same way a seed edit does.
  const gearProfileHash = hashOf(gearProfiles[seed.gearProfile ?? 'caster'] ?? {});
  const seedHash = hashOf({
    ...mechanics,
    leveling: hashedLeveling,
    gearProfileHash,
  });
  seedById.set(seed.id, seed);
  // Verification writes gates, the published PoB code and the pipeline stamp
  // into the same file. Keep them when the seed has not changed, so compiling
  // never destroys a report.
  const previousPath = resolve(outDir, `${seed.id}.json`);
  let carried = {};
  if (existsSync(previousPath)) {
    const previous = JSON.parse(readFileSync(previousPath, 'utf8'));
    previousById.set(seed.id, previous);
    if (previous.seedHash === seedHash && previous.gates) {
      carried = {
        status: previous.status ?? 'draft',
        gates: previous.gates,
        ...(previous.patch ? { patch: previous.patch } : {}),
        ...(previous.tree ? { tree: previous.tree } : {}),
        ...(previous.pob ? { pob: previous.pob } : {}),
        ...(previous.pipeline ? { pipeline: previous.pipeline } : {}),
      };
    }
  }
  builds.push({
    ...mechanics,
    ...carried,
    filter: deriveGearFilter(seed),
    ...(carried.gates ? {} : { status: 'draft' }),
    season: leaguesById.get(seedSeason),
    changelog: seedChangelog.map((entry) => ({
      ...entry,
      seasonName: leaguesById.get(entry.season)?.name ?? entry.season,
    })),
    wickerman,
    stepPlans,
    gemInfo: describeGems(seed),
    seedHash,
  });
}

// One build per (main skill, ascendancy): a second seed for the same pair is
// rejected rather than published as a near-duplicate (D26).
const pairs = new Map();
for (const build of builds) {
  const key = `${build.mainSkill.toLowerCase()}|${build.ascendancyId}`;
  if (pairs.has(key)) {
    console.error(
      `build seed invalid: ${build.id}\n  ${build.mainSkill} / ${build.ascendancyId} is already ${pairs.get(key)} (D26)`,
    );
    process.exit(1);
  }
  pairs.set(key, build.id);
}

// Resolve prose only when the build has a gate report to resolve against. A
// new seed compiles as a draft; `builds:verify` writes the gates and then
// resolves the guide. An existing build re-resolves on every compile.
for (const build of builds) {
  if (!build.gates) continue;
  const seed = seedById.get(build.id);
  const { guide, errors } = resolveGuide(build, seed.guide, {
    previous: previousById.get(build.id)?.guide,
    flagship: seed.flagship !== false,
  });
  if (errors.length > 0) {
    console.error(`guide invalid: ${build.id}\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  build.guide = guide;
  if (!['signed', 'auto-breadth'].includes(guide.summary.status)) {
    build.status = 'draft';
  }
}

for (const build of builds) {
  build.medal = medalFor(build.ratings);
}

// R10: a build whose patch fact set moved is delisted, not silently kept.
applyBuildStaleness(builds, patchFacts);

// R4: the league's first 72 hours publish nothing.
if (!leagueOpen) {
  for (const build of builds) {
    build.status = 'stale';
    build.stale = {
      status: 'waiting-for-pob',
      reason: 'The league is still inside its first 72 hours.',
    };
  }
}

/**
 * Catalogue chips. SSF is the gate for every published build; the playstyle
 * comes from the family, with Totems layered on when the guide is built around
 * a totem skill; Hardcore is only claimed when the measured defensive
 * thresholds at red maps and pinnacle are met, Boss killer when single-target
 * damage is the build's defining strength.
 */
function chipsFor(build) {
  const chips = [];
  if (build.status === 'verified') {
    chips.push({
      label: 'SSF',
      kind: 'ssf',
      title:
        (build.uniques?.core?.length ?? 0) > 0
          ? 'Verified against self-found budgets; the required uniques are cheap drops, not chase items.'
          : 'Verified against self-found budgets with no required unique.',
    });
  }
  if (build.season) {
    chips.push({
      label: build.season.name,
      kind: 'season',
      title: `Created for, or last updated for, the ${build.season.name} league.`,
    });
  }
  const playstyle =
    { minion: 'Minion', melee: 'Melee', bow: 'Ranged', caster: 'Caster', hybrid: 'Hybrid' }[
      build.family
    ];
  if (playstyle) chips.push({ label: playstyle, kind: 'playstyle' });
  // The main skill gem alone does not say "totem" (Arc is still Arc), so the
  // guide name is part of the signal: "Arc Totem Hierophant".
  if (/\btotems?\b/i.test(`${build.name} ${build.mainSkill}`)) {
    chips.push({
      label: 'Totems',
      kind: 'playstyle',
      title: 'The damage comes from summoned totems, not from self-casting.',
    });
  }
  const red = build.gates?.['maps-red'];
  const pinnacle = build.gates?.['pinnacle'];
  if (
    red?.pass &&
    pinnacle?.pass &&
    red.metrics.maxHit >= 10000 &&
    pinnacle.metrics.maxHit >= 10000 &&
    red.metrics.ehp >= 25000 &&
    pinnacle.metrics.ehp >= 30000 &&
    pinnacle.metrics.chaosResist >= 75
  ) {
    chips.push({
      label: 'Hardcore',
      kind: 'defence',
      title:
        'Passes the published defensive thresholds at red maps and pinnacle. Still a guide, not a guarantee.',
    });
  }
  if (build.dad) {
    chips.push({
      label: 'Dad',
      kind: 'note',
      title: 'Easy to play: low-APM, forgiving and a good build to learn the league with.',
    });
  }
  if ((build.ratings?.singleTarget ?? 0) >= 9) {
    chips.push({
      label: 'Boss killer',
      kind: 'note',
      title: 'Single-target damage is the build’s defining strength.',
    });
  }
  const note =
    build.family === 'bow'
      ? { label: 'Fast clear', kind: 'note', title: 'A single arrow clears packs at range.' }
      : build.family === 'melee'
        ? build.mainSkill === 'Flicker Strike'
          ? { label: 'Fast clear', kind: 'note', title: 'Flicker teleports through the pack.' }
          : { label: 'Tanky', kind: 'note', title: 'Armour, endurance charges and Juggernaut defences.' }
        : null;
  if (note) chips.push(note);
  return chips;
}

const version = hashOf(builds.map((build) => [build.id, build.seedHash]));
const index = {
  version,
  builds: builds.map((build) => ({
    id: build.id,
    name: build.name,
    class: build.class,
    ascendancyId: build.ascendancyId,
    family: build.family,
    mainSkill: build.mainSkill,
    summary: build.summary,
    status: build.status,
    seedHash: build.seedHash,
    ...(build.pipeline ? { calibrated: build.pipeline.calibrated } : {}),
    ...(build.pipeline?.checkedAt ? { verifiedAt: build.pipeline.checkedAt } : {}),
    ...(build.stale ? { stale: build.stale } : {}),
    ...(build.ratings ? { ratings: build.ratings } : {}),
    ...(build.medal ? { medal: build.medal } : {}),
    ...(build.season ? { season: build.season } : {}),
    chips: chipsFor(build),
    // The catalogue page reads the index only (no per-build fetch), so each
    // checkpoint's pass flag and damage travel with it.
    ...(build.gates
      ? {
          steps: Object.entries(build.gates).map(([id, gate]) => ({
            id,
            pass: gate.pass,
            level: gate.level,
            dps: gate.metrics.dps,
          })),
        }
      : {}),
    ...(build.filter ? { filter: build.filter } : {}),
  })),
};

// The calibration report and the published PoB links are evidence, not
// generated build files: compiling a seed must not delete them. The calibration
// run and the release publisher own them.
const preserved = new Map();
for (const name of ['calibration.json', 'pob-links.json']) {
  const path = resolve(outDir, name);
  if (existsSync(path)) preserved.set(path, readFileSync(path, 'utf8'));
}
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const [path, content] of preserved) writeFileSync(path, content);
writeFileSync(resolve(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
writeFileSync(
  resolve(root, 'src/generated/pantheon.json'),
  `${JSON.stringify(pantheon, null, 2)}\n`,
);
writeFileSync(
  resolve(root, 'src/generated/ascendancies-full.json'),
  `${JSON.stringify(ascendanciesFull, null, 2)}\n`,
);
for (const build of builds) {
  writeFileSync(
    resolve(outDir, `${build.id}.json`),
    `${JSON.stringify(build, null, 2)}\n`,
  );
}

console.log(
  `builds: ${builds.length} compiled (version ${version}): ${builds.map((build) => build.id).join(', ')}`,
);
