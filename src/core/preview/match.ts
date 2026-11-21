import type { Rule } from '../filter/types.ts';

export type ItemRarity = 'Normal' | 'Magic' | 'Rare' | 'Unique';

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
  quality?: number;
  stackSize?: number;
  mapTier?: number;
  corrupted?: boolean;
  identified?: boolean;
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

export function ruleMatches(rule: Rule, item: PreviewItem): boolean {
  if (rule.classNames && !rule.classNames.includes(item.itemClass)) return false;
  if (rule.baseTypes && !rule.baseTypes.includes(item.baseType)) return false;
  if (rule.rarity && rule.rarity !== item.rarity) return false;

  if (!inRange(item.itemLevel, rule.itemLevel)) return false;
  if (!inRange(item.dropLevel, rule.dropLevel)) return false;
  if (!inRange(item.areaLevel, rule.areaLevel)) return false;
  if (!inRange(item.stackSize, rule.stackSize)) return false;
  if (!inRange(item.quality, rule.quality)) return false;
  if (!inRange(item.sockets, rule.sockets)) return false;
  if (!inRange(item.linkedSockets, rule.linkedSockets)) return false;
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