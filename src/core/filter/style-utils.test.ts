import { describe, expect, it } from 'vitest';
import { colorToCss, colorToHex, hexToColor } from './style-utils.ts';

describe('style colour helpers', () => {
  it('converts hex to rgba tuples', () => {
    expect(hexToColor('#d9b26a')).toEqual([217, 178, 106, 255]);
    expect(hexToColor('#fff')).toEqual([255, 255, 255, 255]);
  });

  it('converts tuples back to hex', () => {
    expect(colorToHex([217, 178, 106, 255])).toBe('#d9b26a');
    expect(colorToHex(undefined)).toBe('#ffffff');
  });

  it('produces CSS with alpha', () => {
    expect(colorToCss([1, 2, 3])).toBe('rgba(1, 2, 3, 1)');
    expect(colorToCss([1, 2, 3, 128])).toBe('rgba(1, 2, 3, 0.5019607843137255)');
  });
});