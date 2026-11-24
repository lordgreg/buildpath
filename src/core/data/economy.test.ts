import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { ECONOMY, ECONOMY_TIERS } from './economy.ts';
import raw from '../../generated/economy.json';

const overrides = parse(
  readFileSync(
    new URL('../../presets/economy-overrides.yaml', import.meta.url),
    'utf8',
  ),
) as { tiers?: Record<string, Record<string, number>> };

const CATEGORIES = ['currency', 'fragment', 'divination', 'uniqueBase'];

describe('economy overrides', () => {
  it('only names entries that exist in their category', () => {
    const problems: string[] = [];
    for (const [category, values] of Object.entries(overrides.tiers ?? {})) {
      const tiers = (raw.tiers as Record<string, Record<string, number>>)[
        category
      ];
      if (!tiers) {
        problems.push(`unknown category "${category}"`);
        continue;
      }
      for (const [name, tier] of Object.entries(values ?? {})) {
        if (!(name in tiers)) problems.push(`${category}: "${name}" is missing`);
        if (![1, 2, 3].includes(tier)) {
          problems.push(`${category}: ${name} has tier ${tier}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('is compiled into the preset data', () => {
    for (const category of CATEGORIES) {
      expect(Object.keys(ECONOMY_TIERS[category as keyof typeof ECONOMY_TIERS])
        .length).toBeGreaterThan(0);
    }

    const expected = structuredClone(raw.tiers) as Record<
      string,
      Record<string, number>
    >;
    for (const [category, values] of Object.entries(overrides.tiers ?? {})) {
      for (const [name, tier] of Object.entries(values ?? {})) {
        expected[category]![name] = tier;
      }
    }

    expect(ECONOMY_TIERS).toEqual(expected);
    expect(ECONOMY.league).toEqual(raw.league);
  });
});
