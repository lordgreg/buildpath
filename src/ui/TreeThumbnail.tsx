import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { TreeView } from '../core/builds/types.ts';
import { boundsOf, fitView, focalPoint, focusPoint, panView, zoomView } from './treeView.ts';
import type { View } from './treeView.ts';

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

/** Node radius in CSS pixels at the whole-tree view. */
const NODE_PX = 2.4;
/** Largest a node gets when you zoom in. */
const NODE_MAX_PX = 7;
/** Hit target radius in CSS pixels. */
const HIT_PX = 7;
/** How much bigger an allocated node is drawn than an unallocated one. */
const TAKEN_SCALE = 1.35;

/**
 * Measures the SVG so node radius can be a fixed number of CSS pixels.
 *
 * Takes the element, not a ref: the SVG only exists after the geometry
 * loads, so a ref-based effect would run once against null and never see
 * the element. A state-backed ref makes the element a dependency, so the
 * observer attaches on the render that first draws it.
 */
function useElementSize(element: SVGSVGElement | null) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    if (!element) return;
    const update = () => setSize({ w: element.clientWidth, h: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
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
  const [pulseNode, setPulseNode] = useState<number | null>(null);
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const size = useElementSize(svg);
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
  const jewelByNode = useMemo(
    () => new Map((tree.jewels ?? []).map((jewel) => [jewel.node, jewel])),
    [tree],
  );
  const points = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (const node of geometry?.nodes ?? []) map.set(node.id, { x: node.x, y: node.y });
    return map;
  }, [geometry]);

  const focusJewel = useCallback(
    (nodeId: number) => {
      const point = points.get(nodeId);
      if (!point || !full) return;
      setTooltip(null);
      setView(focusPoint(point, full, 0.22));
      setPulseNode(nodeId);
    },
    [points, full],
  );

  useEffect(() => {
    if (pulseNode === null) return;
    const timer = setTimeout(() => setPulseNode(null), 2600);
    return () => clearTimeout(timer);
  }, [pulseNode]);

  // Scale maps tree units to CSS pixels. Nodes grow slowly with zoom so the
  // whole constellation stays legible and a zoomed-in cluster stays readable.
  const scale =
    view && size.w > 0 && size.h > 0
      ? Math.min(size.w / view.w, size.h / view.h)
      : 0;
  const fullScale = full && size.w > 0 && size.h > 0
    ? Math.min(size.w / full.w, size.h / full.h)
    : 0;
  const zoom = fullScale > 0 ? Math.max(scale / fullScale, 1) : 1;
  const radiusPx = Math.min(NODE_PX * Math.sqrt(zoom), NODE_MAX_PX);
  const radius = scale > 0 ? radiusPx / scale : 0;
  const notableRadius = radius * 1.5;
  const hitRadius = scale > 0 ? Math.min(HIT_PX, radiusPx * 2.2) / scale : 0;
  /** With non-scaling-stroke, stroke-width is CSS pixels, not tree units. */
  const strokeWidth = 1;

  const staticLayer = useMemo(() => {
    if (!geometry) return null;
    return (
      <>
        <g stroke="#25303d" strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke">
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
            const base = isNotable ? notableRadius : node.notable ? notableRadius * 0.9 : radius;
            const r = isTaken ? base * TAKEN_SCALE : base;
            return (
              <circle
                key={`g${node.id}`}
                cx={node.x}
                cy={node.y}
                r={r}
                fill={
                  isTaken
                    ? isNotable
                      ? '#e0c070'
                      : '#c9b27a'
                    : node.keystone
                      ? '#2a2118'
                      : 'none'
                }
                stroke={
                  isTaken
                    ? '#f0d898'
                    : node.socket
                      ? '#4a7fb5'
                      : node.keystone
                        ? '#8a6d3b'
                        : '#3a4a60'
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
      <g stroke="#b98a2e" strokeWidth={strokeWidth * 2} vectorEffect="non-scaling-stroke">
        {tree.edges.map(([from, to]) => {
          const a = points.get(from);
          const b = points.get(to);
          if (!a || !b) return null;
          return <line key={`t${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
    );
  }, [geometry, points, tree, strokeWidth]);

  const jewelLayer = useMemo(() => {
    if (!geometry) return null;
    return (
      <g>
        {[...jewelByNode.entries()].map(([nodeId, jewel]) => {
          const point = points.get(nodeId);
          if (!point) return null;
          const size = Math.max(radius * 2.1, 5);
          return (
            <g key={`jewel-${nodeId}`} pointerEvents="none">
              <rect
                x={point.x - size}
                y={point.y - size}
                width={size * 2}
                height={size * 2}
                transform={`rotate(45 ${point.x} ${point.y})`}
                fill="#5b9bd5"
                stroke="#d7ecff"
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
              <title>{`${jewel.label}: ${jewel.base}`}</title>
            </g>
          );
        })}
      </g>
    );
  }, [geometry, jewelByNode, points, radius, strokeWidth]);

  const pulseLayer = (() => {
    if (pulseNode === null) return null;
    const point = points.get(pulseNode);
    if (!point) return null;
    const base = Math.max(radius * 3.4, 10);
    return (
      <g pointerEvents="none">
        <circle
          cx={point.x}
          cy={point.y}
          r={base}
          fill="none"
          stroke="#f3e6bd"
          strokeWidth={strokeWidth * 1.8}
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="r"
            values={`${base};${base * 2.2};${base}`}
            dur="0.9s"
            repeatCount="3"
          />
          <animate
            attributeName="opacity"
            values="1;0.15;1"
            dur="0.9s"
            repeatCount="3"
          />
        </circle>
      </g>
    );
  })();

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
            pointerEvents="all"
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
        setTooltip(null);
        setView((current) =>
          current && full ? panView(current, dx, dy, scale, full) : current,
        );
        return;
      }
      const hit = pick(event);
      if (hit) setTooltip(hit);
      else setTooltip(null);
    },
    [pick, scale, full],
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
    if (!svg || !full) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(event.deltaY * 0.0015);
      const rect = svg.getBoundingClientRect();
      setTooltip(null);
      setView((current) => {
        if (!current) return current;
        const { fx, fy } = focalPoint(current, rect, event.clientX, event.clientY);
        return zoomView(current, current.w * factor, fx, fy, full);
      });
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [svg, full]);

  if (!geometry || !view) {
    return <p className="text-sm text-zinc-500">Loading the tree…</p>;
  }

  const tooltipLeft = Math.min(tooltip ? tooltip.x + 14 : 0, window.innerWidth - 320);
  const tooltipTop = Math.min(tooltip ? tooltip.y + 14 : 0, window.innerHeight - 220);
  const tooltipJewel = tooltip ? jewelByNode.get(tooltip.node.id) : undefined;

  return (
    <figure className="relative">
      <svg
        ref={setSvg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="img"
        aria-label={`Passive tree at ${label}: ${tree.nodes.length} points, ${tree.notables.length} notables, ${tree.jewels?.length ?? 0} jewels`}
        className="h-[34rem] w-full cursor-grab touch-none select-none rounded-lg border border-ink-700 bg-[#0b0d12]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={onClick}
      >
        {staticLayer}
        {takenLayer}
        {jewelLayer}
        {pulseLayer}
        {hoverLayer}
        {hitLayer}
      </svg>

      <div className="absolute right-3 top-3 flex gap-1">
        <button
          type="button"
          onClick={() => {
            setTooltip(null);
            setView((current) =>
              current ? zoomView(current, current.w * 1.35, 0.5, 0.5, full!) : current,
            );
          }}
          className="rounded border border-ink-600 bg-ink-900/80 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setTooltip(null);
            setView((current) =>
              current ? zoomView(current, current.w / 1.35, 0.5, 0.5, full!) : current,
            );
          }}
          className="rounded border border-ink-600 bg-ink-900/80 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            setTooltip(null);
            setView((current) => (full ? fitView(tree.nodes, full) : current));
          }}
          className="rounded border border-ink-600 bg-ink-900/80 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
        >
          fit
        </button>
        <button
          type="button"
          onClick={() => {
            setTooltip(null);
            setView(full);
          }}
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
          {tooltipJewel && (
            <p className="mt-1 rounded border border-[#3f4f8f] bg-[#1b2240]/60 px-2 py-1 text-[11px] text-[#b7d7ff]">
              {tooltipJewel.label} · {tooltipJewel.base}
            </p>
          )}
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
        node to read it, click to pin. Scroll to zoom; drag pans once you are zoomed in.{' '}
        <span className="text-zinc-300">fit</span> frames the points you took,{' '}
        <span className="text-zinc-300">all</span> shows the whole tree.
      </figcaption>

      {tree.jewels && tree.jewels.length > 0 && (
        <div className="mt-2 rounded-md border border-[#3f4f8f]/70 bg-[#11182a]/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#7ea9d8]">
            Jewels at this step · blue diamonds on the tree · click to focus
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400">
            {tree.jewels.map((jewel) => (
              <li key={`${jewel.node}-${jewel.label}`}>
                <button
                  type="button"
                  onClick={() => focusJewel(jewel.node)}
                  className="rounded border border-transparent px-1 py-0.5 text-left underline-offset-2 hover:border-[#3f4f8f] hover:text-[#b7d7ff] hover:underline focus:border-[#3f4f8f] focus:outline-none"
                >
                  <span className="text-[#b7d7ff]">{jewel.label}</span> {jewel.base}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
