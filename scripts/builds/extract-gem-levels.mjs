#!/usr/bin/env node
/**
 * Writes src/generated/gem-levels.json: for every gem, the character level its
 * *gem level* needs, straight from the pinned RePoE export.
 *
 * This is what makes "gems until level 12" checkable instead of hopeful. A
 * level-12 Witch cannot hold a level-9 Summon Skeletons, and a bracket that
 * lists one is wrong. The table is also what lets the pipeline derive the
 * highest gem level a checkpoint can actually have, instead of hand-writing a
 * number that drifts out of step with the game.
 *
 * Shape:
 *   { "Summon Skeletons": { "levels": { "1": 12, "2": 15, ... }, "quest": {...} } }
 *
 * `levels` is keyed by gem level and valued by required character level. The
 * `quest` block (when RePoE has one) says which quest grants it and to which
 * classes, so the guide can say "Witch quest reward, The Caged Brute" rather
 * than guessing.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const base = JSON.parse(
  readFileSync(resolve(root, 'src/core/data/base-types.json'), 'utf8'),
);
const ref = base.meta.ref;
const source = `https://raw.githubusercontent.com/repoe-fork/repoe-fork.github.io/${ref}/data/gems.json`;

const response = await fetch(source, {
  headers: { 'user-agent': 'BuildPath/0.1 (+https://github.com/lordgreg/buildpath)' },
});
if (!response.ok) {
  console.error(`gems: ${response.status} ${response.statusText} from ${source}`);
  process.exit(1);
}
const raw = await response.text();
const gems = JSON.parse(raw);

/** "Minion Damage Support" is what players call "Minion Damage". */
const playerName = (display) => display.replace(/ Support$/, '');

/** Highest gem level we keep; past 21 is corruption-only territory. */
const MAX_GEM_LEVEL = 21;

const out = {};
for (const [id, gem] of Object.entries(gems)) {
  // Royale/Ruthless variants require a much lower level and would make every
  // gem look available from level 1. They are not part of the main game.
  if (/Royale/i.test(id)) continue;
  const name = playerName(gem.display_name ?? '');
  if (!name) continue;

  const levels = {};
  for (const [level, row] of Object.entries(gem.per_level ?? {})) {
    const gemLevel = Number(level);
    if (!Number.isInteger(gemLevel) || gemLevel < 1 || gemLevel > MAX_GEM_LEVEL) continue;
    const required = row?.required_level;
    if (typeof required === 'number') levels[gemLevel] = required;
  }
  if (Object.keys(levels).length === 0) continue;

  // A name can appear as several variants (old/new). Keep the variant with the
  // earliest level-1 requirement and the most complete table.
  const existing = out[name];
  if (existing && existing.levels[1] <= levels[1]) continue;

  const quest = gem.quest_reward
    ? {
        act: gem.quest_reward.act ?? null,
        quest: gem.quest_reward.quest ?? null,
        classes: [...new Set(gem.quest_reward.classes ?? [])].sort(),
      }
    : null;

  // What the gem does. Skill gems carry a prose description; supports do not,
  // so their level-20 stat line is the useful explanation. Constants (e.g.
  // Lightning Arrow's conversion) live in `static.stat_text`.
  const active = gem.active_skill ?? {};
  const bestLevel = gem.per_level?.['20'] ? '20' : Object.keys(gem.per_level ?? {})[0];
  const perLevel = bestLevel ? gem.per_level?.[bestLevel] : null;
  const statText = {
    ...(gem.static?.stat_text ?? {}),
    ...(perLevel?.stat_text ?? {}),
  };
  const effect = [...new Set(Object.values(statText).filter(Boolean))].slice(0, 8);
  const ignoredTags = new Set([
    'intelligence',
    'strength',
    'dexterity',
    'grants_active_skill',
    'support',
    'default',
  ]);
  const tags = [...new Set(gem.tags ?? [])]
    .filter((tag) => !ignoredTags.has(tag))
    .sort();

  // Quality advice: RePoE gives the quality stat template, not a prose line.
  // Strip the placeholders so the guide can say what quality buys and whether
  // capping it is worth a Gemcutter's Prism.
  const qualityEffect = (gem.static?.quality_stats ?? [])
    .map((quality) => quality.stat.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('; ');
  const qualityWorth =
    qualityEffect.length === 0
      ? 'none'
      : /damage|attack speed|cast speed|life|resistance|projectile|minion|critical|area|duration|skeleton|maximum|effect|enemies/i.test(
            qualityEffect,
          )
        ? 'recommended'
        : 'optional';

  out[name] = {
    levels,
    quest,
    color: gem.color ?? null,
    support: gem.is_support === true,
    description: active.description ?? null,
    effect,
    tags,
    qualityEffect,
    qualityWorth,
  };
}

const names = Object.keys(out).sort();
const sorted = Object.fromEntries(names.map((name) => [name, out[name]]));
const json = {
  meta: {
    source,
    ref,
    generatedAt: new Date().toISOString(),
    count: names.length,
    sha256: createHash('sha256').update(raw).digest('hex'),
  },
  gems: sorted,
};
writeFileSync(resolve(root, 'src/generated/gem-levels.json'), `${JSON.stringify(json, null, 2)}\n`);
console.log(`gem levels: ${names.length} gems (RePoE ${ref.slice(0, 8)})`);
