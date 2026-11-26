import { describe, expect, it } from 'vitest';
import { medalFor } from './ratings.ts';

describe('build medal', () => {
  it('reserves S+ for near-perfect across every axis', () => {
    expect(medalFor({ tankiness: 10, singleTarget: 10, clear: 10, cost: 9 })).toBe('S+');
    expect(medalFor({ tankiness: 9, singleTarget: 9, clear: 9, cost: 9 })).toBe('S');
    expect(medalFor({ tankiness: 10, singleTarget: 10, clear: 10, cost: 4 })).toBe('B');
  });

  it('uses the weakest axis, not only the average', () => {
    expect(medalFor({ tankiness: 10, singleTarget: 10, clear: 10, cost: 1 })).toBe('B');
    expect(medalFor({ tankiness: 4, singleTarget: 5, clear: 6, cost: 7 })).toBe('C');
  });
});
