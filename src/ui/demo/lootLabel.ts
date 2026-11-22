import type { CSSProperties } from 'react';
import { colorToCss } from '../../core/filter/style-utils.ts';
import type { Style } from '../../core/filter/types.ts';
import type { ItemRarity } from '../../core/preview/match.ts';

/** Fallback label colour when a rule has no explicit style. */
export const RARITY_COLOR: Record<ItemRarity, string> = {
  Normal: '#d6d6d6',
  Magic: '#9a9aff',
  Rare: '#fff07a',
  Unique: '#d98a4a',
  Quest: '#63e68b',
  Currency: '#d9b26a',
  Gem: '#1ba29b',
  'Divination Card': '#b0c4de',
};

/**
 * Colours and size for a loot label, shared by the loot simulator and the
 * wizard's inline preview so the two can never drift apart.
 */
export function lootLabelStyle(
  style: Style | undefined,
  rarity: ItemRarity,
  shown: boolean,
): CSSProperties {
  return {
    color:
      colorToCss(style?.textColor) ??
      (shown ? RARITY_COLOR[rarity] : '#8a8a8a'),
    backgroundColor:
      colorToCss(style?.backgroundColor) ?? 'rgba(2, 3, 6, 0.92)',
    borderColor:
      colorToCss(style?.borderColor) ??
      (shown ? RARITY_COLOR[rarity] : '#3f3f46'),
    fontSize: `${Math.min(18, Math.max(11, style?.fontSize ?? 13))}px`,
  };
}
