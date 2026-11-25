import { describe, expect, it } from 'vitest';
import economy from '../../generated/economy.json';
import { evaluateRules, type PreviewItem } from '../preview/match.ts';
import { generateFilter } from './generate.ts';

const selection = { mode: 'family', familyId: 'minion' } as const;

type Rarity = PreviewItem['rarity'];

function item(
  baseType: string,
  itemClass: string,
  rarity: Rarity,
  extra: Partial<PreviewItem> = {},
): PreviewItem {
  return {
    id: `${baseType}-${rarity}`,
    name: baseType,
    itemClass,
    baseType,
    rarity,
    itemLevel: 100,
    areaLevel: 83,
    sockets: 1,
    linkedSockets: 1,
    identified: true,
    ...extra,
  };
}

function shown(
  sample: PreviewItem,
  phase: 'leveling' | 'endgame',
  strictness: 'soft' | 'strict' | 'uber',
): boolean {
  const filter = generateFilter({ selection, phase, strictness });
  return evaluateRules(filter.rules, sample).shown;
}

const lifeFlask = item('Divine Life Flask', 'Life Flasks', 'Magic');
const manaFlask = item('Divine Mana Flask', 'Mana Flasks', 'Magic');
const normalFlask = item('Divine Life Flask', 'Life Flasks', 'Normal');

describe('magic flasks stay visible when magic gear is hidden', () => {
  it('shows a used magic flask at endgame and leveling very strict', () => {
    for (const [phase, strictness] of [
      ['endgame', 'soft'],
      ['endgame', 'strict'],
      ['endgame', 'uber'],
      ['leveling', 'uber'],
    ] as const) {
      expect(shown(lifeFlask, phase, strictness), `${phase}/${strictness}`).toBe(
        true,
      );
    }
  });

  it('still hides a flask class the build does not use', () => {
    expect(shown(manaFlask, 'endgame', 'soft')).toBe(false);
  });

  it('still hides normal flasks', () => {
    expect(shown(normalFlask, 'endgame', 'soft')).toBe(false);
  });
});

// ilvl 10 is below every white floor, so only the 4-link rule can show these.
const allowedFourLink = item('Hubris Circlet', 'Helmets', 'Normal', {
  itemLevel: 10,
  sockets: 4,
  linkedSockets: 4,
});
const wrongBaseFourLink = item('Reaver Helmet', 'Helmets', 'Normal', {
  itemLevel: 10,
  sockets: 4,
  linkedSockets: 4,
});
const unusedClassFourLink = item('Crude Bow', 'Bows', 'Normal', {
  itemLevel: 10,
  sockets: 4,
  linkedSockets: 4,
});
const sixSocket = item('Hubris Circlet', 'Helmets', 'Normal', {
  itemLevel: 10,
  sockets: 6,
  linkedSockets: 6,
});

describe('4-link and 6-socket normal gear', () => {
  it('shows an allowed 4-link while leveling and in endgame normal', () => {
    expect(shown(allowedFourLink, 'leveling', 'uber')).toBe(true);
    expect(shown(allowedFourLink, 'endgame', 'soft')).toBe(true);
  });

  it('hides an allowed 4-link in endgame strict and very strict', () => {
    expect(shown(allowedFourLink, 'endgame', 'strict')).toBe(false);
    expect(shown(allowedFourLink, 'endgame', 'uber')).toBe(false);
  });

  it('never shows a 4-link on a wrong base or unused class', () => {
    expect(shown(wrongBaseFourLink, 'endgame', 'soft')).toBe(false);
    expect(shown(unusedClassFourLink, 'endgame', 'soft')).toBe(false);
  });

  it('keeps 6-sockets visible at every strictness', () => {
    for (const strictness of ['soft', 'strict', 'uber'] as const) {
      expect(shown(sixSocket, 'endgame', strictness), strictness).toBe(true);
    }
  });
});

const whiteHelmet = item('Hubris Circlet', 'Helmets', 'Normal');
const lowWhiteHelmet = item('Hubris Circlet', 'Helmets', 'Normal', {
  itemLevel: 20,
});
const wrongWhiteHelmet = item('Reaver Helmet', 'Helmets', 'Normal');
const whiteFlask = item('Divine Life Flask', 'Life Flasks', 'Normal');
const blueHelmet = item('Hubris Circlet', 'Helmets', 'Magic');
const lowBlueHelmet = item('Hubris Circlet', 'Helmets', 'Magic', {
  itemLevel: 60,
});

describe('map tiers and card scaling', () => {
  const text = (strictness: 'soft' | 'strict' | 'uber') =>
    generateFilter({ selection, phase: 'endgame', strictness }).text;

  it('grades maps T15 > T14 > T11 above the cutoff', () => {
    const strict = text('strict');
    expect(strict).toContain('# Maps - tier 15+');
    expect(strict).toContain('# Maps - tier 14');
    expect(strict).toContain('# Maps - tier 11-13');
    expect(strict).toContain('# Maps - below tier cutoff');
  });

  it('keeps only the top band at uber', () => {
    const uber = text('uber');
    expect(uber).toContain('# Maps - tier 15+');
    expect(uber).not.toContain('# Maps - tier 14');
    expect(uber).not.toContain('# Maps - tier 11-13');
  });

  it('hides low-tier cards and fragments as strictness rises', () => {
    expect(text('soft')).toContain('# Divination cards - tier 3');
    expect(text('soft')).not.toContain('# Divination cards - below tier cutoff');
    expect(text('strict')).toContain('# Divination cards - below tier cutoff');
    expect(text('uber')).toContain('# Divination cards - below tier cutoff');
    expect(text('uber')).not.toContain('# Map fragments - tier 2');
  });
});

describe('white and blue item-level floors', () => {
  it('shows a white base above the floor and hides one below', () => {
    expect(shown(whiteHelmet, 'endgame', 'soft')).toBe(true); // floor 68
    expect(shown(whiteHelmet, 'endgame', 'uber')).toBe(true); // floor 80
    expect(shown(lowWhiteHelmet, 'endgame', 'soft')).toBe(false);
    expect(shown(lowWhiteHelmet, 'endgame', 'strict')).toBe(false); // floor 75
  });

  it("only shows whites on the build's own bases", () => {
    expect(shown(wrongWhiteHelmet, 'endgame', 'soft')).toBe(false);
  });

  it('never shows normal flasks', () => {
    expect(shown(whiteFlask, 'endgame', 'soft')).toBe(false);
    expect(shown(whiteFlask, 'leveling', 'soft')).toBe(false);
  });

  it('shows a blue base at the blue floor', () => {
    expect(shown(blueHelmet, 'endgame', 'soft')).toBe(true); // floor 75
    expect(shown(blueHelmet, 'endgame', 'uber')).toBe(true); // floor 85
    expect(shown(lowBlueHelmet, 'endgame', 'soft')).toBe(false);
  });
});

const uniqueTiers = economy.tiers.uniqueBase as Record<string, number>;

function baseAtTier(tier: number): string {
  const base = Object.entries(uniqueTiers).find(
    ([name, value]) => value === tier && !name.endsWith('Jewel'),
  )?.[0];
  if (!base) throw new Error(`no unique base at tier ${tier}`);
  return base;
}

const tier1Base = baseAtTier(1);
const tier2Base = baseAtTier(2);
const tier3Base = baseAtTier(3);

const unique = (base: string) => item(base, 'Rings', 'Unique');

describe('unique tier cutoff', () => {
  it('shows every unique at normal and strict', () => {
    for (const strictness of ['soft', 'strict'] as const) {
      expect(shown(unique(tier3Base), 'endgame', strictness), strictness).toBe(
        true,
      );
    }
  });

  it('keeps tier 1 and 2 uniques at very strict', () => {
    expect(shown(unique(tier1Base), 'endgame', 'uber')).toBe(true);
    expect(shown(unique(tier2Base), 'endgame', 'uber')).toBe(true);
  });

  it('hides tier 3 uniques at very strict', () => {
    expect(shown(unique(tier3Base), 'endgame', 'uber')).toBe(false);
    expect(shown(unique(tier3Base), 'leveling', 'uber')).toBe(false);
  });
});
