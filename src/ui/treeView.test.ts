import { describe, expect, it } from 'vitest';
import { MIN_FRACTION, boundsOf, clampView, fitView, focalPoint, panView, zoomView } from './treeView.ts';
import type { View } from './treeView.ts';

const full: View = { x: -100, y: -100, w: 200, h: 200 };

function inside(view: View, bounds: View): boolean {
  const eps = 1e-9;
  return (
    view.x >= bounds.x - eps &&
    view.y >= bounds.y - eps &&
    view.x + view.w <= bounds.x + bounds.w + eps &&
    view.y + view.h <= bounds.y + bounds.h + eps
  );
}

describe('boundsOf', () => {
  it('pads the node bounds', () => {
    const b = boundsOf([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]);
    expect(b.w).toBeGreaterThan(100);
    expect(b.h).toBeGreaterThan(100);
    expect(b.x).toBeLessThan(0);
    expect(b.y).toBeLessThan(0);
  });

  it('falls back to a small box for an empty tree', () => {
    expect(boundsOf([])).toEqual({ x: -1, y: -1, w: 2, h: 2 });
  });
});

describe('clampView', () => {
  it('pulls a view that ran past the edge back inside', () => {
    expect(clampView({ x: -500, y: -500, w: 20, h: 20 }, full)).toEqual({
      x: -100,
      y: -100,
      w: 20,
      h: 20,
    });
    expect(clampView({ x: 500, y: 500, w: 20, h: 20 }, full)).toEqual({
      x: 80,
      y: 80,
      w: 20,
      h: 20,
    });
  });

  it('centres a view as large as the constellation', () => {
    expect(clampView({ x: 40, y: -40, w: 200, h: 200 }, full)).toEqual(full);
  });

  it('never lets a panning drag lose the tree', () => {
    let view: View = { x: -20, y: -20, w: 40, h: 40 };
    for (let i = 0; i < 40; i += 1) {
      view = panView(view, 250, 250, 1, full);
      expect(inside(view, full)).toBe(true);
    }
  });
});

describe('panView', () => {
  it('moves opposite the drag, so the tree follows the pointer', () => {
    const view = panView({ x: -20, y: -20, w: 40, h: 40 }, 10, 0, 1, full);
    expect(view.x).toBe(-30);
    expect(view.y).toBe(-20);
  });

  it('ignores a drag before the SVG is measured', () => {
    expect(panView(full, 120, 120, 0, full)).toEqual(full);
  });

  it('does nothing at the whole-tree view', () => {
    expect(panView(full, 300, 300, 1, full)).toEqual(full);
  });
});

describe('zoomView', () => {
  it('keeps the point under the cursor fixed', () => {
    const before: View = { x: -50, y: -50, w: 100, h: 100 };
    const after = zoomView(before, 50, 0.25, 0.75, full);
    expect(after.x + after.w * 0.25).toBeCloseTo(before.x + before.w * 0.25);
    expect(after.y + after.h * 0.75).toBeCloseTo(before.y + before.h * 0.75);
  });

  it('never zooms past the whole tree', () => {
    expect(zoomView(full, 400, 0.5, 0.5, full)).toEqual(full);
  });

  it('never zooms below the floor', () => {
    const after = zoomView(full, 0.0001, 0.5, 0.5, full);
    expect(after.w).toBeCloseTo(full.w * MIN_FRACTION);
  });

  it('stays inside the tree when zooming out from a corner', () => {
    const after = zoomView({ x: -100, y: -100, w: 20, h: 20 }, 200, 0.5, 0.5, full);
    expect(inside(after, full)).toBe(true);
  });
});

describe('fitView', () => {
  it('frames the taken points inside the tree', () => {
    const view = fitView(
      [
        { x: -10, y: -10 },
        { x: 10, y: 10 },
      ],
      full,
    );
    expect(inside(view, full)).toBe(true);
    expect(view.w).toBeLessThan(full.w);
  });

  it('survives an empty tree', () => {
    expect(inside(fitView([], full), full)).toBe(true);
  });
});

describe('focalPoint', () => {
  it('accounts for the letterboxing of a wide element', () => {
    // A square view in a 400x200 element draws 200x200, centred 100px in.
    const view: View = { x: 0, y: 0, w: 100, h: 100 };
    const rect = { left: 0, top: 0, width: 400, height: 200 };
    expect(focalPoint(view, rect, 100, 100)).toEqual({ fx: 0, fy: 0.5 });
    expect(focalPoint(view, rect, 300, 100)).toEqual({ fx: 1, fy: 0.5 });
  });

  it('clamps points outside the drawn tree', () => {
    const view: View = { x: 0, y: 0, w: 100, h: 100 };
    const rect = { left: 0, top: 0, width: 200, height: 200 };
    expect(focalPoint(view, rect, -50, 250)).toEqual({ fx: 0, fy: 1 });
  });

  it('falls back to the centre when the element has no size', () => {
    const view: View = { x: 0, y: 0, w: 100, h: 100 };
    const rect = { left: 0, top: 0, width: 0, height: 0 };
    expect(focalPoint(view, rect, 10, 10)).toEqual({ fx: 0.5, fy: 0.5 });
  });
});
