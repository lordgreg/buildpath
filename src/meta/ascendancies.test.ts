import { describe, expect, it } from 'vitest';
import { resolveSlotBases } from '../core/data/resolve.ts';
import { EXPECTED_ASCENDANCIES } from '../presets/ascendancies.expected.ts';
import { ASCENDANCIES } from './ascendancies.ts';
import { FAMILIES } from './families.ts';

const FAMILY_IDS = new Set(FAMILIES.map((family) => family.id));
const ARMOUR_CLASSES = ['Helmet', 'Body Armour', 'Gloves', 'Boots'];

describe('ascendancy registry', () => {
  it('matches the reviewed expected list exactly, in order', () => {
    expect(
      ASCENDANCIES.map(({ id, name, class: className }) => ({
        id,
        name,
        class: className,
      })),
    ).toEqual(EXPECTED_ASCENDANCIES);
  });

  it('has no duplicate ids', () => {
    const ids = ASCENDANCIES.map((ascendancy) => ascendancy.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every defaultFamily at a real family', () => {
    for (const ascendancy of ASCENDANCIES) {
      expect(
        FAMILY_IDS.has(ascendancy.defaultFamily),
        `${ascendancy.id}: unknown family "${ascendancy.defaultFamily}"`,
      ).toBe(true);
    }
  });

  it('carries valid attributes', () => {
    for (const ascendancy of ASCENDANCIES) {
      expect(ascendancy.attributes.length, ascendancy.id).toBeGreaterThan(0);
      for (const attribute of ascendancy.attributes) {
        expect(['str', 'dex', 'int'], `${ascendancy.id}: ${attribute}`).toContain(
          attribute,
        );
      }
    }
  });

  it('resolves every defence, shield and jewel tag to a base', () => {
    const failures: string[] = [];

    const resolved = (
      tags: string[],
      itemClasses: string[],
    ): boolean => resolveSlotBases({ itemClasses, tags }).length > 0;

    for (const ascendancy of ASCENDANCIES) {
      for (const tag of ascendancy.defenceTags) {
        if (!resolved([tag], ARMOUR_CLASSES)) {
          failures.push(`${ascendancy.id}: defenceTag "${tag}"`);
        }
      }
      for (const tag of ascendancy.shieldTags) {
        if (!resolved([tag], ['Shield'])) {
          failures.push(`${ascendancy.id}: shieldTag "${tag}"`);
        }
      }
      if (!resolved([ascendancy.jewelTag], ['Jewel'])) {
        failures.push(`${ascendancy.id}: jewelTag "${ascendancy.jewelTag}"`);
      }
    }

    expect(failures).toEqual([]);
  });
});
