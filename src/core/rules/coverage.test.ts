import { describe, expect, it } from 'vitest';
import { compileFilter } from '../filter/generate.ts';
import { ruleCovers, templateIsCovered } from './coverage.ts';
import { TEMPLATES } from './templates.ts';
import type { Rule } from '../filter/types.ts';

const rulesFor = (
  phase: 'leveling' | 'endgame',
  strictness: 'soft' | 'strict' | 'uber',
) =>
  compileFilter({
    selection: { mode: 'family', familyId: 'minion' },
    phase,
    strictness,
  }).rules;

const template = (id: string) => {
  const found = TEMPLATES.find((entry) => entry.id === id);
  if (!found) throw new Error(`missing template ${id}`);
  return found;
};

const covered = (
  id: string,
  phase: 'leveling' | 'endgame',
  strictness: 'soft' | 'strict' | 'uber',
) => templateIsCovered(template(id), rulesFor(phase, strictness));

describe('template coverage', () => {
  it('recognises six-links through the six-socket rule', () => {
    const showSockets: Rule = {
      action: 'Show',
      sockets: { min: 6 },
    };
    const showLinks: Rule = {
      action: 'Show',
      linkedSockets: { min: 6 },
    };
    expect(ruleCovers(showSockets, showLinks)).toBe(true);
    expect(ruleCovers(showLinks, showSockets)).toBe(false);
    expect(covered('show-six-links', 'leveling', 'uber')).toBe(true);
  });

  it('marks endgame normal templates already in the preset', () => {
    expect(covered('show-uniques', 'endgame', 'soft')).toBe(true);
    expect(covered('show-six-links', 'endgame', 'soft')).toBe(true);
    expect(covered('show-t15-maps', 'endgame', 'soft')).toBe(true);
    expect(covered('show-quality-gems', 'endgame', 'soft')).toBe(true);
    expect(covered('show-top-currency', 'endgame', 'soft')).toBe(true);
    expect(covered('show-top-cards', 'endgame', 'soft')).toBe(true);
  });

  it('follows strictness cutoffs', () => {
    expect(covered('show-quality-gems', 'endgame', 'strict')).toBe(false);
    expect(covered('show-quality-gems', 'endgame', 'uber')).toBe(false);
    // Uber now keeps tier-2 currency, so tiers 1 and 2 are covered.
    expect(covered('show-top-currency', 'endgame', 'uber')).toBe(true);
    expect(covered('show-t15-maps', 'endgame', 'uber')).toBe(true);
  });

  it('does not claim leveling map coverage', () => {
    expect(covered('show-t15-maps', 'leveling', 'soft')).toBe(false);
    expect(covered('show-quality-gems', 'leveling', 'soft')).toBe(true);
    expect(covered('show-top-currency', 'leveling', 'soft')).toBe(true);
  });

  it('leaves broad templates and Hide templates uncovered', () => {
    expect(covered('show-rare-80', 'endgame', 'soft')).toBe(false);
    expect(covered('hide-normal-magic-gear', 'endgame', 'soft')).toBe(false);
  });

  it('marks nothing covered for From Scratch', () => {
    const scratch = compileFilter({
      selection: { mode: 'scratch', scratchStart: 'hide' },
      phase: 'leveling',
      strictness: 'soft',
    }).rules;
    for (const entry of TEMPLATES) {
      expect(templateIsCovered(entry, scratch), entry.id).toBe(false);
    }
  });
});