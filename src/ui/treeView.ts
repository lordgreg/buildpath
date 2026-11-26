/**
 * View maths for the passive-tree thumbnail.
 *
 * Pure functions so the pan/zoom rules can be tested without a DOM. The
 * component only renders what these return; keeping the arithmetic here is
 * what stops "the tree vanished when I dragged it" from coming back.
 */

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Never zoom past this fraction of the whole tree; below it you see a few nodes. */
export const MIN_FRACTION = 0.02;

export function boundsOf(nodes: { x: number; y: number }[]): View {
  if (nodes.length === 0) return { x: -1, y: -1, w: 2, h: 2 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x > maxX) maxX = node.x;
    if (node.y > maxY) maxY = node.y;
  }
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const pad = Math.max(w, h) * 0.03;
  return { x: minX - pad, y: minY - pad, w: w + pad * 2, h: h + pad * 2 };
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * Pins one axis of the view inside the constellation. A view at least as wide
 * as the tree is centred instead, so "all" always lands on the whole tree
 * rather than drifting off one edge.
 */
function clampAxis(start: number, size: number, fullStart: number, fullSize: number): number {
  if (size >= fullSize) return fullStart + (fullSize - size) / 2;
  return Math.min(Math.max(start, fullStart), fullStart + fullSize - size);
}

/**
 * Keeps the viewBox inside the tree. Panning at the whole-tree view therefore
 * does nothing, and no drag or zoom-out can ever move the constellation out of
 * frame.
 */
export function clampView(next: View, full: View): View {
  const x = clampAxis(next.x, next.w, full.x, full.w);
  const y = clampAxis(next.y, next.h, full.y, full.h);
  return x === next.x && y === next.y ? next : { ...next, x, y };
}

/** Zooms to `width` tree units, keeping the point under (fx, fy) fixed. */
export function zoomView(current: View, width: number, fx: number, fy: number, full: View): View {
  const clamped = Math.min(Math.max(width, full.w * MIN_FRACTION), full.w);
  const next = clamped / current.w;
  return clampView(
    {
      x: current.x + (current.w - clamped) * fx,
      y: current.y + (current.h - current.h * next) * fy,
      w: clamped,
      h: current.h * next,
    },
    full,
  );
}

/**
 * Drags the view by a pixel delta. A zero scale means the SVG has not been
 * measured yet; the drag is ignored rather than divided by a placeholder, which
 * used to fling the tree thousands of units off-screen.
 */
export function panView(view: View, dx: number, dy: number, scale: number, full: View): View {
  if (!(scale > 0)) return view;
  return clampView({ ...view, x: view.x - dx / scale, y: view.y - dy / scale }, full);
}

/** Frames the taken points, padded and never smaller than the zoom floor. */
export function fitView(nodes: { x: number; y: number }[], full: View): View {
  const b = boundsOf(nodes);
  const width = Math.min(Math.max(b.w, full.w * MIN_FRACTION), full.w);
  const next = width / b.w;
  return clampView(
    {
      x: b.x + (b.w - width) / 2,
      y: b.y + (b.h - b.h * next) / 2,
      w: width,
      h: b.h * next,
    },
    full,
  );
}

/** Centres a zoomed view on one node, clamped inside the whole tree. */
export function focusPoint(
  point: { x: number; y: number },
  full: View,
  fraction = 0.22,
): View {
  const width = Math.min(Math.max(full.w * fraction, full.w * MIN_FRACTION), full.w);
  const height = full.h * (width / full.w);
  return clampView(
    {
      x: point.x - width / 2,
      y: point.y - height / 2,
      w: width,
      h: height,
    },
    full,
  );
}

/**
 * Converts a client point to a fraction of the drawn tree.
 *
 * The SVG preserves aspect ratio and centres the content, so a pointer at the
 * left edge of a wide element is not at the left edge of the tree. Ignoring
 * that offset made wheel zoom drift away from the cursor.
 */
export function focalPoint(
  view: View,
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { fx: number; fy: number } {
  if (!(rect.width > 0) || !(rect.height > 0)) return { fx: 0.5, fy: 0.5 };
  const scale = Math.min(rect.width / view.w, rect.height / view.h);
  const drawnW = view.w * scale;
  const drawnH = view.h * scale;
  const offsetX = (rect.width - drawnW) / 2;
  const offsetY = (rect.height - drawnH) / 2;
  return {
    fx: clamp01((clientX - rect.left - offsetX) / drawnW),
    fy: clamp01((clientY - rect.top - offsetY) / drawnH),
  };
}
