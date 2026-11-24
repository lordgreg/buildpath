import { describe, expect, it } from 'vitest';
import { archetypes, getArchetype } from '../archetypes/index.ts';
import {
  DEFAULT_SECTIONS,
  generateFilter,
  normalizeSections,
  type FilterConfig,
} from './generate.ts';
import type { Phase, Strictness } from './presets.ts';
import { validateFilter } from './validate.ts';

const PHASES: Phase[] = ['leveling', 'endgame'];
const STRICTNESS: Strictness[] = ['soft', 'strict', 'uber'];

function block(text: string, comment: string): string {
  const start = text.indexOf(`# ${comment}`);
  if (start === -1) return '';
  const end = text.indexOf('\n\n', start);
  return text.slice(start, end === -1 ? undefined : end);
}

describe('archetype matrix', () => {
  it('ships twelve builds', () => {
    expect(archetypes).toHaveLength(12);
  });

  it('covers all seven classes', () => {
    expect(new Set(archetypes.map((entry) => entry.class)).size).toBe(7);
  });

  it('marks at least one build as not leveling-friendly', () => {
    expect(archetypes.some((entry) => !entry.leveling)).toBe(true);
  });
});

describe('generateFilter', () => {
  it('rejects unknown archetypes', () => {
    expect(() =>
      generateFilter({
        archetypeId: 'nope',
        phase: 'leveling',
        strictness: 'soft',
      }),
    ).toThrow(/Unknown archetype/);
  });

  for (const archetype of archetypes) {
    for (const phase of PHASES) {
      for (const strictness of STRICTNESS) {
        const label = `${archetype.id}/${phase}/${strictness}`;

        it(`emits a valid filter: ${label}`, () => {
          const filter = generateFilter({
            archetypeId: archetype.id,
            phase,
            strictness,
          });

          expect(filter.warnings, label).toEqual([]);
          expect(validateFilter(filter.text), label).toEqual([]);
          expect(filter.ruleCount, label).toBeGreaterThan(15);
          expect(filter.text, label).toContain('Show');
          expect(filter.text, label).toContain(archetype.name);
          expect(filter.fileName, label).toMatch(
            /^filterpath-[a-z0-9-]+-(leveling|endgame)-(soft|strict|uber)\.filter$/,
          );
          // The game client reads filters as plain text; keep it ASCII.
          expect(filter.text, label).not.toMatch(/[^\x09\x0a\x20-\x7e]/);
        });
      }
    }
  }

  it('uses an item level floor for weapons but not accessories', () => {
    const filter = generateFilter({
      archetypeId: 'necro-minions',
      phase: 'endgame',
      strictness: 'uber',
    });

    expect(block(filter.text, 'weapon - rare')).toContain('ItemLevel >= 86');
    expect(block(filter.text, 'ring - rare')).toContain('ItemLevel >= 68');
  });

  it('applies the map tier cutoff', () => {
    const filter = generateFilter({
      archetypeId: 'deadeye-lightning-arrow',
      phase: 'endgame',
      strictness: 'strict',
    });
    expect(block(filter.text, 'Maps - tier 11-13')).toContain('MapTier >= 11');
    expect(block(filter.text, 'Maps - tier 14')).toContain('MapTier >= 14');
    expect(block(filter.text, 'Maps - tier 15+')).toContain('MapTier >= 15');
  });

  it('hides low currency in strict endgame presets', () => {
    const filter = generateFilter({
      archetypeId: 'jugg-boneshatter',
      phase: 'endgame',
      strictness: 'uber',
    });
    expect(filter.text).toContain('# Currency - below tier cutoff');
    expect(filter.text).toContain('"Scroll of Wisdom"');
  });

  it('omits disabled sections', () => {
    const config: FilterConfig = {
      archetypeId: 'necro-minions',
      phase: 'leveling',
      strictness: 'soft',
      sections: { ...DEFAULT_SECTIONS, gear: false, currency: false },
    };
    const filter = generateFilter(config);

    expect(filter.text).not.toContain('# helmet - rare');
    expect(filter.text).not.toContain('# Currency - tier 1');
    expect(filter.text).not.toContain('# Divination cards - top');
    expect(filter.text).toContain('# Gems');
    expect(filter.sections.gear).toBe(false);
  });

  it('normalizes partial section maps', () => {
    expect(normalizeSections({ gear: false })).toEqual({
      ...DEFAULT_SECTIONS,
      gear: false,
    });
  });

  it('embeds the build version and filter format', () => {
    const filter = generateFilter({
      archetypeId: 'necro-minions',
      phase: 'leveling',
      strictness: 'soft',
      version: '9.9.9',
    });

    expect(filter.text).toContain('# FilterPath 9.9.9 - filter format 2');
    expect(filter.text).toMatch(/^# Presets: [a-f0-9]+$/m);
    expect(filter.fileName).toBe(
      'filterpath-necro-minions-leveling-soft.filter',
    );
  });

  it('writes a Selection line for a build selection', () => {
    const filter = generateFilter({
      selection: { mode: 'family', familyId: 'bow' },
      phase: 'endgame',
      strictness: 'strict',
      theme: 'contrast',
      buildName: 'My Bow',
    });

    expect(filter.text).toMatch(
      /^# Selection: mode=family&family=bow&phase=endgame&strictness=strict&theme=contrast&name=My\+Bow$/m,
    );
    // Legacy archetype configs carry no selection of their own.
    expect(
      generateFilter({
        archetypeId: 'necro-minions',
        phase: 'leveling',
        strictness: 'soft',
      }).text,
    ).not.toContain('# Selection:');
  });

  it('resolves a known archetype for the UI', () => {
    expect(getArchetype('slayer-cyclone')?.ascendancy).toBe('Slayer');
  });
});