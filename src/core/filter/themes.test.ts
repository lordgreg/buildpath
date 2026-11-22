import { describe, expect, it } from 'vitest';
import { applyTheme, isThemeId } from './themes.ts';
import { COLORS, type Rule } from './types.ts';

const baseStyle = {
  textColor: [1, 2, 3, 255] as [number, number, number, number],
  borderColor: [4, 5, 6, 255] as [number, number, number, number],
  backgroundColor: [7, 8, 9, 255] as [number, number, number, number],
  fontSize: 40,
  alertSound: 3,
  minimapIcon: { size: 1 as const, color: 'Green' as const, shape: 'Hexagon' as const },
};

const rareGear: Rule = {
  action: 'Show',
  section: 'gear',
  rarity: 'Rare',
  comment: 'ring - rare',
  style: baseStyle,
};
const magicGear: Rule = {
  action: 'Show',
  section: 'gear',
  rarity: 'Magic',
  style: baseStyle,
};
const unique: Rule = {
  action: 'Show',
  section: 'uniques',
  rarity: 'Unique',
  style: baseStyle,
};
const currency: Rule = {
  action: 'Show',
  section: 'currency',
  comment: 'Currency - tier 1',
  style: baseStyle,
};
const card: Rule = {
  action: 'Show',
  section: 'currency',
  comment: 'Divination cards - top',
  style: baseStyle,
};
const gem: Rule = {
  action: 'Show',
  section: 'gems',
  style: baseStyle,
};
const map: Rule = {
  action: 'Show',
  section: 'maps',
  comment: 'Maps - tier 15+',
  style: baseStyle,
};
const fragment: Rule = {
  action: 'Show',
  section: 'maps',
  comment: 'Map fragments',
  style: baseStyle,
};
const sixSocketNormal: Rule = {
  action: 'Show',
  section: 'gear',
  rarity: 'Normal',
  comment: 'Six sockets - normal',
  style: baseStyle,
};
const hide: Rule = { action: 'Hide', section: 'junk', comment: 'junk' };
const custom: Rule = {
  action: 'Show',
  section: 'custom',
  comment: 'my rule',
  style: baseStyle,
};
const sTier: Rule = {
  action: 'Show',
  section: 'currency',
  styleKind: 's-tier',
  style: baseStyle,
};
const cardBackground: Rule = { ...card, styleKind: 'card' };
const gemBackground: Rule = { ...gem, styleKind: 'gem' };
const fragmentBackground: Rule = { ...fragment, styleKind: 'fragment' };
const jewelBest: Rule = {
  action: 'Show',
  section: 'uniques',
  rarity: 'Unique',
  styleKind: 'jewel-best',
  style: baseStyle,
};
const jewel: Rule = {
  action: 'Show',
  section: 'gear',
  rarity: 'Rare',
  styleKind: 'jewel',
  style: baseStyle,
};
const flask: Rule = {
  action: 'Show',
  section: 'gear',
  rarity: 'Magic',
  styleKind: 'flask',
  style: baseStyle,
};
const gold: Rule = {
  action: 'Show',
  section: 'currency',
  styleKind: 'gold',
  style: baseStyle,
};
const league: Rule = {
  action: 'Show',
  section: 'league',
  styleKind: 'league',
  style: baseStyle,
};

const styleOf = (rule: Rule) => applyTheme([rule], 'classic')[0]!.style!;

describe('rarity theme', () => {
  it('uses rarity colours for gear and a black background', () => {
    expect(styleOf(rareGear)).toMatchObject({
      textColor: COLORS.yellow,
      borderColor: COLORS.yellow,
      backgroundColor: COLORS.black,
      fontSize: 40,
      alertSound: 3,
    });
    expect(styleOf(magicGear)).toMatchObject({
      textColor: COLORS.blue,
      borderColor: COLORS.blue,
      backgroundColor: COLORS.black,
    });
    expect(styleOf(unique)).toMatchObject({
      textColor: COLORS.orange,
      borderColor: COLORS.orange,
      backgroundColor: COLORS.black,
    });
  });

  it('keeps default colours for currency, cards, gems, maps and fragments', () => {
    expect(styleOf(currency)).toMatchObject({
      textColor: COLORS.gold,
      borderColor: COLORS.gold,
      backgroundColor: COLORS.black,
    });
    expect(styleOf(card)).toMatchObject({
      textColor: COLORS.card,
      borderColor: COLORS.card,
    });
    expect(styleOf(gem)).toMatchObject({
      textColor: COLORS.gem,
      borderColor: COLORS.gem,
    });
    expect(styleOf(map)).toMatchObject({
      textColor: COLORS.map,
      borderColor: COLORS.map,
    });
    expect(styleOf(fragment)).toMatchObject({
      textColor: COLORS.gold,
      borderColor: COLORS.gold,
    });
  });

  it('gives six-socket rules rarity colours too', () => {
    expect(styleOf(sixSocketNormal)).toMatchObject({
      textColor: COLORS.white,
      borderColor: COLORS.white,
      backgroundColor: COLORS.black,
    });
  });

  it('uses category backgrounds without changing rarity colours', () => {
    expect(styleOf(sTier)).toMatchObject({
      textColor: COLORS.gold,
      borderColor: COLORS.gold,
      backgroundColor: COLORS.sTier,
    });
    expect(styleOf(cardBackground)).toMatchObject({
      textColor: COLORS.card,
      backgroundColor: COLORS.cardBg,
    });
    expect(styleOf(gemBackground)).toMatchObject({
      textColor: COLORS.gem,
      backgroundColor: COLORS.gemBg,
    });
    expect(styleOf(fragmentBackground)).toMatchObject({
      textColor: COLORS.gold,
      backgroundColor: COLORS.fragmentBg,
    });
    expect(styleOf(jewelBest)).toMatchObject({
      textColor: COLORS.orange,
      backgroundColor: COLORS.jewelBest,
    });
    expect(styleOf(jewel)).toMatchObject({
      textColor: COLORS.yellow,
      backgroundColor: COLORS.jewelBg,
    });
    expect(styleOf(flask)).toMatchObject({
      textColor: COLORS.blue,
      backgroundColor: COLORS.flaskBg,
    });
    expect(styleOf(gold)).toMatchObject({
      textColor: COLORS.gold,
      backgroundColor: COLORS.goldBg,
    });
    expect(styleOf(league)).toMatchObject({
      textColor: COLORS.orange,
      backgroundColor: COLORS.leagueBg,
    });
  });

  it('leaves unclassified custom rules and Hide rules alone', () => {
    expect(styleOf(custom)).toEqual(baseStyle);
    expect(applyTheme([hide], 'classic')[0]).toEqual(hide);
  });

  it('still applies contrast and muted', () => {
    expect(applyTheme([rareGear], 'contrast')[0]?.style).toMatchObject({
      textColor: COLORS.white,
      borderColor: COLORS.white,
      backgroundColor: COLORS.black,
      fontSize: 42,
    });
    expect(applyTheme([rareGear], 'muted')[0]?.style).toMatchObject({
      textColor: COLORS.grey,
      borderColor: COLORS.grey,
      backgroundColor: COLORS.black,
      fontSize: 32,
    });
  });

  it('validates theme ids', () => {
    expect(isThemeId('classic')).toBe(true);
    expect(isThemeId('neon')).toBe(false);
  });
});