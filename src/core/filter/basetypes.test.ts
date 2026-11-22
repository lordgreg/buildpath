import { describe, expect, it } from 'vitest';
import known from '../data/known-base-types.json';
import { archetypes } from '../archetypes/index.ts';
import { generateFilter } from './generate.ts';
import type { Phase, Strictness } from './presets.ts';

const knownNames = new Set(known.names);
const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['soft', 'strict', 'uber'];

describe('known BaseType registry', () => {
  it('contains gear, currency and divination cards', () => {
    expect(knownNames.has('Convoking Wand')).toBe(true);
    expect(knownNames.has('Chaos Orb')).toBe(true);
    expect(knownNames.has('The Apothecary')).toBe(true);
  });

  it('does not contain unique item names', () => {
    // The game rejects filters that use unique names in BaseType conditions.
    expect(knownNames.has('Aegis Aurora')).toBe(false);
    expect(knownNames.has('Mageblood')).toBe(false);
  });
});

describe('generated filters', () => {
  it('only reference BaseType names the game knows', () => {
    const unknown = new Set<string>();

    for (const archetype of archetypes) {
      for (const phase of PHASES) {
        for (const strictness of STRICTNESS) {
          const filter = generateFilter({
            archetypeId: archetype.id,
            phase,
            strictness,
          });

          for (const line of filter.text.split('\n')) {
            const match = /^ {4}BaseType (.+)$/.exec(line);
            if (!match) continue;

            for (const quoted of match[1]!.matchAll(/"([^"]*)"/g)) {
              const name = quoted[1]!;
              if (!knownNames.has(name)) {
                unknown.add(`${archetype.id}/${phase}/${strictness}: ${name}`);
              }
            }
          }
        }
      }
    }

    expect([...unknown]).toEqual([]);
  });
});