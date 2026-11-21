import type { Color } from './types.ts';

export function hexToColor(hex: string): Color {
  const clean = hex.replace('#', '');
  const expanded =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return [r, g, b, 255];
}

export function colorToHex(color: Color | undefined): string {
  if (!color) return '#ffffff';
  const hex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${hex(color[0])}${hex(color[1])}${hex(color[2])}`;
}

export function colorToCss(color: Color | undefined): string | undefined {
  if (!color) return undefined;
  const alpha = color.length === 4 ? color[3]! / 255 : 1;
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}