import { ECONOMY_TIERS } from '../data/economy.ts';
import { EQUIPMENT_CLASSES } from '../filter/classes.ts';
import { SLOT_STYLES, type Rule } from '../filter/types.ts';

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
}

function tierNames(map: Record<string, number>, tiers: number[]): string[] {
  return Object.entries(map)
    .filter(([, tier]) => tiers.includes(tier))
    .map(([name]) => name)
    .sort();
}

const TOP_CURRENCY = tierNames(
  ECONOMY_TIERS.currency as Record<string, number>,
  [1, 2],
);
const TOP_CARDS = tierNames(
  ECONOMY_TIERS.divination as Record<string, number>,
  [1],
);

export const TEMPLATES: RuleTemplate[] = [
  {
    id: 'show-uniques',
    name: 'Show all uniques',
    description: 'Every unique item, with the usual unique styling.',
    rules: [
      {
        action: 'Show',
        section: 'custom',
        rarity: 'Unique',
        style: SLOT_STYLES.unique,
      },
    ],
  },
  {
    id: 'show-six-links',
    name: 'Show all 6-links',
    description: 'Any item with a six-linked socket group.',
    rules: [
      {
        action: 'Show',
        section: 'custom',
        linkedSockets: { min: 6 },
        style: SLOT_STYLES.link,
      },
    ],
  },
  {
    id: 'show-t15-maps',
    name: 'Show T15+ maps',
    description: 'Maps at tier 15 or higher.',
    rules: [
      {
        action: 'Show',
        section: 'custom',
        classNames: ['Maps'],
        mapTier: { min: 15 },
        style: SLOT_STYLES.map,
      },
    ],
  },
  {
    id: 'show-quality-gems',
    name: 'Show quality gems',
    description: 'Skill and support gems with any quality.',
    rules: [
      {
        action: 'Show',
        section: 'custom',
        classNames: ['Skill Gems', 'Support Gems'],
        quality: { min: 1 },
        style: SLOT_STYLES.gem,
      },
    ],
  },
  {
    id: 'show-top-currency',
    name: 'Show top currency',
    description: 'Economy tiers 1 and 2 from the latest snapshot.',
    rules: TOP_CURRENCY.length
      ? [
          {
            action: 'Show',
            section: 'custom',
            baseTypes: TOP_CURRENCY,
            style: SLOT_STYLES.currencyTop,
          },
        ]
      : [],
  },
  {
    id: 'show-top-cards',
    name: 'Show top divination cards',
    description: 'Tier 1 divination cards from the latest snapshot.',
    rules: TOP_CARDS.length
      ? [
          {
            action: 'Show',
            section: 'custom',
            baseTypes: TOP_CARDS,
            style: SLOT_STYLES.currencyTop,
          },
        ]
      : [],
  },
  {
    id: 'show-rare-80',
    name: 'Show rare items ilvl 80+',
    description: 'High item level rares of any slot.',
    rules: [
      {
        action: 'Show',
        section: 'custom',
        rarity: 'Rare',
        itemLevel: { min: 80 },
        style: SLOT_STYLES.armour,
      },
    ],
  },
  {
    id: 'hide-normal-magic-gear',
    name: 'Hide normal and magic gear',
    description: 'Removes white and blue equipment drops.',
    rules: [
      {
        action: 'Hide',
        section: 'custom',
        classNames: [...EQUIPMENT_CLASSES],
        rarity: 'Normal',
      },
      {
        action: 'Hide',
        section: 'custom',
        classNames: [...EQUIPMENT_CLASSES],
        rarity: 'Magic',
      },
    ],
  },
];