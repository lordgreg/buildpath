import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';
import type { TreeView } from '../core/builds/types.ts';

interface GeometryNode {
  id: number;
  x: number;
  y: number;
  notable: boolean;
  keystone: boolean;
  socket: boolean;
  name: string;
  stats?: string[];
}

interface Geometry {
  version: string;
  nodes: GeometryNode[];
  edges: [number, number][];
}

interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Tooltip {
  node: GeometryNode;
  x: number;
  y: number;
}

let geometryPromise: Promise<Geometry> | null = null;

/** Loaded lazily; the full tree is ~450 kB the builder never needs. */
function loadGeometry(): Promise<Geometry> {
  geometryPromise ??= import('../generated/tree-geometry.json').then(
    (module) => module.default as unknown as Geometry,
  );
  return geometryPromise;
}

/** Never zoom past this fraction of the whole tree; below it you see a few nodes. */
const MIN_FRACTION = 0.02;
/** Node radius in CSS pixels, kept constant at every zoom level. */
const NODE_PX = 4.2;
/** Hit target radius in CSS pixels. */
const HIT_PX = 7;

function boundsOf(nodes: { x: number; y: number }[]): View {
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

/** Zooms to `width` tree units, keeping the point under (fx, fy) fixed. */
function zoomView(current: View, width: number, fx: number, fy: number, full: View): View {
  const clamped = Math.min(Math.max(width, full.w * MIN_FRACTION), full.w);
  const next = clamped / current.w;
  return {
    x: current.x + (current.w - clamped) * fx,
    y: current.y + (current.h - current.h * next) * fy,
    w: clamped,
    h: current.h * next,
  };
}

/** Measures the SVG so node radius can be a fixed number of CSS pixels. */
function useElementSize(ref: RefObject<SVGSVGElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setSize({ w: element.clientWidth, h: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/**
 * The allocated tree drawn over the full constellation, the way the game does.
 *
 * It opens on the whole tree so the constellation is recognisable, then zooms
 * to whatever you ask for. Node radius is a fixed number of CSS pixels, so
 * nodes stay readable at every zoom instead of turning into blobs when the
 * view fits six nodes.
 *
 * Hovering a node shows its name and stats; clicking pins the tooltip for
 * touch. Hit targets are delegated to the SVG so 2,500 nodes do not each need
 * their own listener.
 *
 * Every hook runs before the early return: React #310 is what happens when a
 * hook count changes between renders.
 */
export default function TreeThumbnail({
  tree,
  label,
}: {
  tree: TreeView;
  label: string;
}) {
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const size = useElementSize(svgRef);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const down = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadGeometry().then((loaded) => {
      if (cancelled) return;
      setGeometry(loaded);
      setView(boundsOf(loaded.nodes));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const full = useMemo(() => (geometry ? boundsOf(geometry.nodes) : null), [geometry]);
  const taken = useMemo(() => new Set(tree.nodes.map((node) => node.id)), [tree]);
  const takenNotable = useMemo(
    () => new Set(tree.nodes.filter((node) => node.notable).map((node) => node.id)),
    [tree],
  );
  const byId = useMemo(() => {
    const map = new Map<number, GeometryNode>();
    for (const node of geometry?.nodes ?? []) map.set(node.id, node);
    return map;
  }, [geometry]);
  const points = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (const node of geometry?.nodes ?? []) map.set(node.id, { x: node.x, y: node.y });
    return map;
  }, [geometry]);

  // Scale maps tree units to CSS pixels. Radius is then a constant pixel size.
  const scale =
    view && size.w > 0 && size.h > 0
      ? Math.min(size.w / view.w, size.h / view.h)
      : 0;
  const radius = scale > 0 ? NODE_PX / scale : 0;
  const notableRadius = radius * 1.55;
  const hitRadius = scale > 0 ? HIT_PX / scale : 0;
  const strokeWidth = scale > 0 ? 1 / scale : 1;

  const staticLayer = useMemo(() => {
    if (!geometry) return null;
    return (
      <>
        <g stroke="#2b3747" strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke">
          {geometry.edges.map(([from, to]) => {
            const a = points.get(from);
            const b = points.get(to);
            if (!a || !b) return null;
            return <line key={`e${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
        </g>
        <g>
          {geometry.nodes.map((node) => {
            const isTaken = taken.has(node.id);
            const isNotable = takenNotable.has(node.id);
            const r = isNotable ? notableRadius : node.notable ? notableRadius * 0.9 : radius;
            return (
              <circle
                key={`g${node.id}`}
                cx={node.x}
                cy={node.y}
                r={r}
                fill={isTaken ? (isNotable ? '#e0c070' : '#c9b27a') : node.keystone ? '#2a2118' : '#1b2432'}
                stroke={
                  isTaken
                    ? '#f0d898'
                    : node.socket
                      ? '#4a7fb5'
                      : node.keystone
                        ? '#8a6d3b'
                        : '#344254'
                }
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>
      </>
    );
  }, [geometry, points, taken, takenNotable, radius, notableRadius, strokeWidth]);

  const takenLayer = useMemo(() => {
    if (!geometry) return null;
    return (
      <g stroke="#b98a2e" strokeWidth={strokeWidth * 1.6} vectorEffect="non-scaling-stroke">
        {tree.edges.map(([from, to]) => {
          const a = points.get(from);
          const b = points.get(to);
          if (!a || !b) return null;
          return <line key={`t${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
    );
  }, [geometry, points, tree, strokeWidth]);

  const hoverLayer = tooltip ? (
    <circle
      cx={tooltip.node.x}
      cy={tooltip.node.y}
      r={notableRadius * 1.9}
      fill="none"
      stroke="#f3e6bd"
      strokeWidth={strokeWidth * 1.6}
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  ) : null;

  const hitLayer = useMemo(() => {
    if (!geometry) return null;
    return (
      <g>
        {geometry.nodes.map((node) => (
          <circle
            key={`h${node.id}`}
            cx={node.x}
            cy={node.y}
            r={hitRadius}
            fill="transparent"
            data-node={node.id}
          />
        ))}
      </g>
    );
  }, [geometry, hitRadius]);

  const pick = useCallback(
    (event: ReactMouseEvent | ReactPointerEvent) => {
      const target = event.target as SVGElement;
      const id = target.dataset?.node;
      if (!id) return null;
      const node = byId.get(Number(id));
      if (!node) return null;
      return { node, x: event.clientX, y: event.clientY };
    },
    [byId],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const last = drag.current;
      if (last) {
        const dx = event.clientX - last.x;
        const dy = event.clientY - last.y;
        drag.current = { x: event.clientX, y: event.clientY };
        setView((current) => {
          if (!current) return current;
          const unit = 1 / Math.max(scale, 0.0001);
          return { ...current, x: current.x - dx * unit, y: current.y - dy * unit };
        });
        return;
      }
      const hit = pick(event);
      if (hit) setTooltip(hit);
      else setTooltip(null);
    },
    [pick, scale],
  );

  const onPointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    down.current = { x: event.clientX, y: event.clientY };
    drag.current = down.current;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const onClick = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      const start = down.current;
      down.current = null;
      // A drag that moved more than a few pixels is a pan, not a click.
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) {
        return;
      }
      const hit = pick(event);
      setTooltip(hit);
    },
    [pick],
  );

  // Native listener so preventDefault works; React's wheel handler is passive.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !full) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(event.deltaY * 0.0015);
      const rect = svg.getBoundingClientRect();
      const fx = (event.clientX - rect.left) / rect.width;
      const fy = (event.clientY - rect.top) / rect.height;
      setView((current) =>
        current ? zoomView(current, current.w * factor, fx, fy, full) : current,
      );
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [full]);

  if (!geometry || !view) {
    return <p className="text-sm text-zinc-500">Loading the tree…</p>;
  }

  const tooltipLeft = Math.min(tooltip ? tooltip.x + 14 : 0, window.innerWidth - 320);
  const tooltipTop = Math.min(tooltip ? tooltip.y + 14 : 0, window.innerHeight - 220);

  return (
    <figure className="relative">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="img"
        aria-label={`Passive tree at ${label}: ${tree.nodes.length} points, ${tree.notables.length} notables`}
        className="h-[34rem] w-full cursor-grab rounded-lg border border-ink-700 bg-[#0b0d12]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={onClick}
      >
        {staticLayer}
        {takenLayer}
        {hoverLayer}
        {hitLayer}
      </svg>

      <div className="absolute right-3 top-3 flex gap-1">
        <button
          type="button"
          onClick={() =>
            setView((current) =>
              current ? zoomView(current, current.w * 1.35, 0.5, 0.5, full!) : current,
            )
          }
          className="rounded border border-ink-600 bg-ink-900/80 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() =>
            setView((current) =>
              current ? zoomView(current, current.w / 1.35, 0.5, 0.5, full!) : current,
            )
          }
          className="rounded border border-ink-600 bg-ink-900/80 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            const b = boundsOf(tree.nodes);
            const width = Math.min(Math.max(b.w, full!.w * MIN_FRACTION), full!.w);
            const next = width / b.w;
            setView({
              x: b.x + (b.w - width) / 2,
              y: b.y + (b.h - b.h * next) / 2,
              w: width,
              h: b.h * next,
            });
          }}
          className="rounded border border-ink-600 bg-ink-900/80 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
        >
          fit
        </button>
        <button
          type="button"
          onClick={() => setView(full)}
          className="rounded border border-ink-600 bg-ink-900/80 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
        >
          all
        </button>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 w-72 rounded-lg border border-ink-600 bg-ink-900/95 p-3 text-xs shadow-xl"
          style={{ left: tooltipLeft, top: tooltipTop }}
        >
          <p className="font-semibold text-gold-300">
            {tooltip.node.name || `Node ${tooltip.node.id}`}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {tooltip.node.keystone
              ? 'Keystone'
              : tooltip.node.notable
                ? 'Notable'
                : tooltip.node.socket
                  ? 'Jewel socket'
                  : 'Passive'}
            {taken.has(tooltip.node.id) ? ' · allocated' : ''}
          </p>
          {tooltip.node.stats?.length ? (
            <ul className="mt-2 space-y-1 text-zinc-300">
              {tooltip.node.stats.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : tooltip.node.name.endsWith('Mastery') ? (
            <p className="mt-2 text-zinc-500">
              Mastery — choose one effect when you allocate it.
            </p>
          ) : (
            <p className="mt-2 text-zinc-500">No stats recorded for this node.</p>
          )}
        </div>
      )}

      <figcaption className="mt-2 text-xs text-zinc-500">
        {tree.nodes.length} points and {tree.notables.length} notables at {label}. Hover a
        node to read it, click to pin. Scroll to zoom, drag to pan; <span className="text-zinc-300">fit</span>{' '}
        frames the points you took, <span className="text-zinc-300">all</span> shows the whole tree.
      </figcaption>
    </figure>
  );
}
