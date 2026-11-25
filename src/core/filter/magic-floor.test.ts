import { describe, expect, it } from 'vitest';
import { evaluateRules, type PreviewItem } from '../preview/match.ts';
import { generateFilter } from './generate.ts';
import type { Phase, Strictness } from './presets.ts';

const selection = {
  mode: 'ascendancy' as const,
  ascendancyId: 'necromancer',
};

function item(
  name: string,
  itemClass: string,
  itemLevel: number,
  extra: Partial<PreviewItem> = {},
): PreviewItem {
  return {
    id: `${name}-${itemLevel}`,
    name,
    itemClass,
    baseType: name,
    rarity: 'Magic',
    itemLevel,
    areaLevel: 45,
    identified: true,
    ...extra,
  };
}

function shownAt(
  sample: PreviewItem,
  phase: Phase,
  strictness: Strictness,
): boolean {
  const filter = generateFilter({ selection, phase, strictness });
  return evaluateRules(filter.rules, sample).shown;
}

describe('leveling magic stages', () => {
  it('shows every magic item in the first two stages', () => {
    for (const strictness of ['soft', 'strict', 'uber'] as const) {
      const early = item('Silken Vest', 'Body Armours', 15, { areaLevel: 15 });
      expect(shownAt(early, 'leveling', strictness), strictness).toBe(true);
    }
  });

  it('hides unlinked magic armour from area 20 on', () => {
    const vest = item('Silken Vest', 'Body Armours', 45);
    for (const strictness of ['soft', 'strict', 'uber'] as const) {
      expect(shownAt(vest, 'leveling', strictness), strictness).toBe(false);
    }
  });

  it('keeps a 4-link or linked RGB magic item', () => {
    const fourLink = item('Silken Vest', 'Body Armours', 45, {
      sockets: 4,
      linkedSockets: 4,
    });
    const rgb = item('Silken Vest', 'Body Armours', 45, {
      sockets: 3,
      linkedSockets: 3,
      socketGroups: ['RGB'],
    });
    for (const strictness of ['soft', 'strict', 'uber'] as const) {
      expect(shownAt(fourLink, 'leveling', strictness), `4L ${strictness}`).toBe(
        true,
      );
      expect(shownAt(rgb, 'leveling', strictness), `RGB ${strictness}`).toBe(
        true,
      );
    }
  });

  it('keeps magic accessories worth an identify', () => {
    const ring = item('Topaz Ring', 'Rings', 43);
    for (const strictness of ['soft', 'strict', 'uber'] as const) {
      expect(shownAt(ring, 'leveling', strictness), strictness).toBe(true);
    }
  });

  it('does not revive a wrong base with the link gate', () => {
    const strengthHelmet = item('Reaver Helmet', 'Helmets', 45, {
      rarity: 'Rare',
    });
    expect(shownAt(strengthHelmet, 'leveling', 'soft')).toBe(false);
  });
});

describe('endgame magic floor', () => {
  it('keeps the existing item level floor', () => {
    const lowRing = item('Topaz Ring', 'Rings', 43);
    const highRing = item('Topaz Ring', 'Rings', 80);
    expect(shownAt(lowRing, 'endgame', 'soft')).toBe(false);
    expect(shownAt(highRing, 'endgame', 'soft')).toBe(true);
  });
});
