import { describe, expect, it } from 'vitest';
import known from '../data/known-base-types.json';
import { TEMPLATES } from './templates.ts';

const knownNames = new Set(known.names);

describe('advanced templates', () => {
  it('ships templates with rules', () => {
    expect(TEMPLATES.length).toBeGreaterThan(5);
    for (const template of TEMPLATES) {
      expect(template.rules.length, template.id).toBeGreaterThan(0);
      for (const rule of template.rules) {
        expect(['Show', 'Hide']).toContain(rule.action);
        for (const base of rule.baseTypes ?? []) {
          expect(knownNames.has(base), `${template.id}: ${base}`).toBe(true);
        }
      }
    }
  });

  it('includes uniques, six-links and T15 maps', () => {
    const ids = new Set(TEMPLATES.map((template) => template.id));
    expect(ids.has('show-uniques')).toBe(true);
    expect(ids.has('show-six-links')).toBe(true);
    expect(ids.has('show-t15-maps')).toBe(true);
  });
});
