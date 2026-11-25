import type { Rule } from '../filter/types.ts';
import { hasEmptyListCondition } from '../filter/rule-lists.ts';

export type ItemRarity =
  | 'Normal'
  | 'Magic'
  | 'Rare'
  | 'Unique'
  | 'Quest'
  | 'Currency'
  | 'Gem'
  | 'Divination Card';

/**
 * The subset of item data a filter rule can match. This is also the shape the
 * inventory preview consumes; it is deliberately independent of GGG's data.
 */
export interface PreviewItem {
  id: string;
  name: string;
  /** Filter `Class` value, e.g. "Gloves" or "One Hand Axes". */
  itemClass: string;
  baseType: string;
  rarity: ItemRarity;
  itemLevel: number;
  dropLevel?: number;
  areaLevel?: number;
  sockets?: number;
  linkedSockets?: number;
  /** Colours of each linked group, e.g. ["RGB", "B"]. */
  socketGroups?: string[];
  quality?: number;
  stackSize?: number;
  mapTier?: number;
  corrupted?: boolean;
  identified?: boolean;
  /** Names of the item's explicit mods, e.g. "Veiled" or "of Renewal". */
  explicitMods?: string[];
}

export interface MatchResult {
  shown: boolean;
  rule: Rule | null;
  index: number;
  reason: string;
}

function inRange(
  value: number | undefined,
  range: { min?: number; max?: number } | undefined,
): boolean {
  if (!range) return true;
  if (value === undefined) return false;
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

/** The game matches an item mod whose name contains the filter string. */
function hasExplicitMod(item: PreviewItem, names: readonly string[]): boolean {
  const mods = (item.explicitMods ?? []).map((mod) => mod.toLowerCase());
  return names.some((name) => {
    const needle = name.toLowerCase();
    return mods.some((mod) => mod.includes(needle));
  });
}

/**
 * Currency, gems, divination cards and quest items are Normal-rarity items
 * with a special class, so `Rarity Normal` matches them in game.
 */
const NORMAL_RARITIES = new Set<ItemRarity>([
  'Normal',
  'Currency',
  'Gem',
  'Divination Card',
  'Quest',
]);

function matchesRarity(item: PreviewItem, rarity: Rule['rarity']): boolean {
  if (!rarity) return true;
  if (rarity === 'Normal') return NORMAL_RARITIES.has(item.rarity);
  return rarity === item.rarity;
}

export function ruleMatches(rule: Rule, item: PreviewItem): boolean {
  // The emitter skips such a block, so the preview must not match it either.
  if (hasEmptyListCondition(rule)) return false;
  if (rule.classNames && !rule.classNames.includes(item.itemClass)) return false;
  if (rule.baseTypes && !rule.baseTypes.includes(item.baseType)) return false;
  if (!matchesRarity(item, rule.rarity)) return false;

  if (!inRange(item.itemLevel, rule.itemLevel)) return false;
  if (!inRange(item.dropLevel, rule.dropLevel)) return false;
  if (!inRange(item.areaLevel, rule.areaLevel)) return false;
  // The game reports 0 sockets, links and quality, and a stack size of 1, for
  // items that do not have the property.
  if (!inRange(item.stackSize ?? 1, rule.stackSize)) return false;
  if (!inRange(item.quality ?? 0, rule.quality)) return false;
  if (!inRange(item.sockets ?? 0, rule.sockets)) return false;
  if (!inRange(item.linkedSockets ?? 0, rule.linkedSockets)) return false;
  if (rule.socketGroup) {
    const wanted = rule.socketGroup.toUpperCase();
    const groups = (item.socketGroups ?? []).map((group) =>
      group.toUpperCase(),
    );
    // `SocketGroup "RGB"` means one linked group holding all three colours.
    if (!groups.some((group) => [...wanted].every((c) => group.includes(c)))) {
      return false;
    }
  }
  if (!inRange(item.mapTier, rule.mapTier)) return false;

  if (
    rule.corrupted !== undefined &&
    (item.corrupted ?? false) !== rule.corrupted
  ) {
    return false;
  }
  if (
    rule.identified !== undefined &&
    (item.identified ?? false) !== rule.identified
  ) {
    return false;
  }

  if (
    rule.hasExplicitMod?.length &&
    !hasExplicitMod(item, rule.hasExplicitMod)
  ) {
    return false;
  }

  return true;
}

/**
 * First matching block decides, unless it has `Continue`. A `Continue` block
 * sets the current decision and lets later blocks override it.
 */
export function evaluateRules(
  rules: readonly Rule[],
  item: PreviewItem,
): MatchResult {
  let decision: { rule: Rule; index: number } | null = null;

  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index]!;
    if (rule.disabled) continue;
    if (!ruleMatches(rule, item)) continue;

    decision = { rule, index };
    if (!rule.continue) break;
  }

  if (!decision) {
    return {
      shown: true,
      rule: null,
      index: -1,
      reason: 'No rule matched, items default to visible',
    };
  }

  const shown = decision.rule.action === 'Show';
  return {
    shown,
    rule: decision.rule,
    index: decision.index,
    reason: decision.rule.comment ?? (shown ? 'Shown' : 'Hidden'),
  };
}