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
    sockets: 1,
    linkedSockets: 1,
    identified: true,
    ...extra,
  };
}

function shown(
  sample: PreviewItem,
  phase: 'leveling' | 'endgame',
  strictness: 'normal' | 'strict' | 'very-strict',
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
      ['endgame', 'normal'],
      ['endgame', 'strict'],
      ['endgame', 'very-strict'],
      ['leveling', 'very-strict'],
    ] as const) {
      expect(shown(lifeFlask, phase, strictness), `${phase}/${strictness}`).toBe(
        true,
      );
    }
  });

  it('still hides a flask class the build does not use', () => {
    expect(shown(manaFlask, 'endgame', 'normal')).toBe(false);
  });

  it('still hides normal flasks', () => {
    expect(shown(normalFlask, 'endgame', 'normal')).toBe(false);
  });
});

const allowedFourLink = item('Hubris Circlet', 'Helmets', 'Normal', {
  sockets: 4,
  linkedSockets: 4,
});
const wrongBaseFourLink = item('Reaver Helmet', 'Helmets', 'Normal', {
  sockets: 4,
  linkedSockets: 4,
});
const unusedClassFourLink = item('Crude Bow', 'Bows', 'Normal', {
  sockets: 4,
  linkedSockets: 4,
});
const sixSocket = item('Hubris Circlet', 'Helmets', 'Normal', {
  sockets: 6,
  linkedSockets: 6,
});

describe('4-link and 6-socket normal gear', () => {
  it('shows an allowed 4-link while leveling and in endgame normal', () => {
    expect(shown(allowedFourLink, 'leveling', 'very-strict')).toBe(true);
    expect(shown(allowedFourLink, 'endgame', 'normal')).toBe(true);
  });

  it('hides an allowed 4-link in endgame strict and very strict', () => {
    expect(shown(allowedFourLink, 'endgame', 'strict')).toBe(false);
    expect(shown(allowedFourLink, 'endgame', 'very-strict')).toBe(false);
  });

  it('never shows a 4-link on a wrong base or unused class', () => {
    expect(shown(wrongBaseFourLink, 'endgame', 'normal')).toBe(false);
    expect(shown(unusedClassFourLink, 'endgame', 'normal')).toBe(false);
  });

  it('keeps 6-sockets visible at every strictness', () => {
    for (const strictness of ['normal', 'strict', 'very-strict'] as const) {
      expect(shown(sixSocket, 'endgame', strictness), strictness).toBe(true);
    }
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
    for (const strictness of ['normal', 'strict'] as const) {
      expect(shown(unique(tier3Base), 'endgame', strictness), strictness).toBe(
        true,
      );
    }
  });

  it('keeps tier 1 and 2 uniques at very strict', () => {
    expect(shown(unique(tier1Base), 'endgame', 'very-strict')).toBe(true);
    expect(shown(unique(tier2Base), 'endgame', 'very-strict')).toBe(true);
  });

  it('hides tier 3 uniques at very strict', () => {
    expect(shown(unique(tier3Base), 'endgame', 'very-strict')).toBe(false);
    expect(shown(unique(tier3Base), 'leveling', 'very-strict')).toBe(false);
  });
});
