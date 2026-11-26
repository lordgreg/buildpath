import { describe, expect, it } from 'vitest';
import {
  formatGuideValue,
  resolveProse,
  validateFacts,
  validateProseDigits,
} from './guide.ts';

const build = {
  mainSkill: 'Cyclone',
  gates: { 'maps-red': { metrics: { dps: 1_500_000 } } },
};

describe('guide prose rules', () => {
  it('renders the closed format set', () => {
    expect(formatGuideValue(2_310_000, 'dps')).toBe('2.31M');
    expect(formatGuideValue(12_400, 'k')).toBe('12.4k');
    expect(formatGuideValue(1234, 'int')).toBe('1234');
    expect(formatGuideValue(34, 'pct')).toBe('34%');
    expect(formatGuideValue(6, 'link')).toBe('6-link');
    expect(formatGuideValue(16, 'tier')).toBe('T16');
    expect(formatGuideValue(5, 'act')).toBe('Act 5');
    expect(formatGuideValue('3.29.0', 'patch')).toBe('3.29.0');
  });

  it('resolves declared paths and reports misses', () => {
    expect(resolveProse('{{gates.maps-red.metrics.dps|dps}}', build)).toEqual({
      text: '1.50M',
      errors: [],
    });
    expect(resolveProse('{{gates.nope.dps|dps}}', build).errors).toHaveLength(1);
  });

  it('allows only the closed digit token set', () => {
    expect(validateProseDigits('T16 and 6-link and 20/20 and Act 5 and +2')).toEqual([]);
    expect(validateProseDigits('it does 120000 damage')).toHaveLength(1);
    expect(validateProseDigits('{{gates.maps-red.metrics.dps|dps}} is fine')).toEqual([]);
  });

  it('checks declared facts resolve', () => {
    expect(validateFacts(build, ['mainSkill', 'gates.maps-red.metrics.dps'])).toEqual([]);
    expect(validateFacts(build, ['gates.nope'])).toHaveLength(1);
  });
});
