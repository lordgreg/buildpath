import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
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

/** Loaded once, on demand: the full tree is ~300 KB the builder never needs. */
function loadGeometry(): Promise<Geometry> {
  geometryPromise ??= import('../generated/tree-geometry.json').then(
    (module) => (module.default ?? module) as unknown as Geometry,
  );
  return geometryPromise;
}

/** Smallest viewBox width in tree units; below this the tree is unreadable. */
const MIN_WIDTH = 900;

function boundsOf(nodes: GeometryNode[]): View {
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
  const pad = Math.max(maxX - minX, maxY - minY) * 0.04;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  return { x: minX - pad, y: minY - pad, w, h };
}

/**
 * The allocated tree drawn over the full constellation, the way the game shows
 * it. Wheel zooms toward the cursor, drag pans, and clicking a node opens its
 * stats — a thumbnail cannot answer "which node is that?" without both.
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
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

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

  const taken = useMemo(
    () => new Set(tree.nodes.map((node) => node.id)),
    [tree.nodes],
  );
  const takenNotable = useMemo(
    () => new Set(tree.nodes.filter((node) => node.notable).map((node) => node.id)),
    [tree.nodes],
  );

  const points = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (const node of geometry?.nodes ?? []) map.set(node.id, { x: node.x, y: node.y });
    return map;
  }, [geometry]);

  // Wheel must be a native listener to preventDefault without a passive warning.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !view) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const factor = Math.exp(event.deltaY * 0.0015);
      setView((current) => {
        if (!current) return current;
        const nextW = Math.min(Math.max(current.w * factor, MIN_WIDTH), full?.w ?? current.w);
        const nextH = (nextW / current.w) * current.h;
        const fx = (event.clientX - rect.left) / rect.width;
        const fy = (event.clientY - rect.top) / rect.height;
        return {
          x: current.x + current.w * fx - nextW * fx,
          y: current.y + current.h * fy - nextH * fy,
          w: nextW,
          h: nextH,
        };
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [view, full]);

  if (!geometry || !view || !full) {
    return (
      <p className="text-xs text-zinc-500">
        {tree.nodes.length === 0 ? `No tree was planned for ${label}.` : 'Loading the tree…'}
      </p>
    );
  }

  const span = Math.max(full.w, full.h);
  const radius = span * 0.0028;
  const notableRadius = span * 0.0042;
  const hitRadius = span * 0.011;

  const zoomBy = (factor: number) => {
    setView((current) => {
      if (!current) return current;
      const nextW = Math.min(Math.max(current.w * factor, MIN_WIDTH), full.w);
      const nextH = (nextW / current.w) * current.h;
      return {
        x: current.x + (current.w - nextW) / 2,
        y: current.y + (current.h - nextH) / 2,
        w: nextW,
        h: nextH,
      };
    });
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) start.moved = true;
    const rect = event.currentTarget.getBoundingClientRect();
    setView((current) =>
      current
        ? {
            ...current,
            x: current.x - (dx / rect.width) * current.w,
            y: current.y - (dy / rect.height) * current.h,
          }
        : current,
    );
    drag.current = { x: event.clientX, y: event.clientY, moved: start.moved };
  };

  const onPointerUp = () => {
    suppressClick.current = drag.current?.moved ?? false;
    drag.current = null;
  };

  const openNode = (node: GeometryNode, event: ReactMouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    event.stopPropagation();
    setTooltip({ node, x: event.clientX, y: event.clientY });
  };

  const tooltipLeft = tooltip ? Math.min(tooltip.x + 14, window.innerWidth - 300) : 0;
  const tooltipTop = tooltip ? Math.min(tooltip.y + 14, window.innerHeight - 220) : 0;

  return (
    <figure>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          role="img"
          aria-label={`${label} passive tree: ${tree.nodes.length} points, ${tree.notables.length} notables`}
          className="h-[32rem] w-full cursor-grab touch-none rounded-lg border border-ink-700 bg-[#0b0d12] active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={() => setTooltip(null)}
        >
          <g stroke="currentColor" className="text-ink-700" strokeWidth={0.7} vectorEffect="non-scaling-stroke">
            {geometry.edges.map(([from, to]) => {
              const a = points.get(from);
              const b = points.get(to);
              if (!a || !b) return null;
              return <line key={`e${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
          </g>

          <g className="fill-ink-600">
            {geometry.nodes.map((node) => {
              const point = points.get(node.id);
              if (!point) return null;
              return (
                <circle
                  key={`g${node.id}`}
                  cx={point.x}
                  cy={point.y}
                  r={node.notable ? radius * 1.2 : radius * 0.7}
                />
              );
            })}
          </g>

          <g stroke="#b98a2e" strokeWidth={1.2} vectorEffect="non-scaling-stroke">
            {tree.edges.map(([from, to]) => {
              const a = points.get(from);
              const b = points.get(to);
              if (!a || !b) return null;
              return <line key={`t${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
          </g>

          <g className="fill-ink-600">
            {geometry.nodes.map((node) => {
              if (taken.has(node.id)) return null;
              return (
                <circle
                  key={`n${node.id}`}
                  cx={node.x}
                  cy={node.y}
                  r={node.notable ? notableRadius : radius}
                  className={node.keystone ? 'fill-zinc-500' : undefined}
                />
              );
            })}
          </g>

          <g>
            {geometry.nodes.map((node) => {
              const takenNode = taken.has(node.id);
              const isNotable = takenNotable.has(node.id);
              const className = takenNode
                ? isNotable
                  ? 'fill-gold-300'
                  : 'fill-zinc-200'
                : 'fill-transparent';
              return (
                <g key={`a${node.id}`}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={takenNode ? (isNotable ? notableRadius : radius) : radius}
                    className={className}
                    stroke={node.socket && takenNode ? '#7aa2f7' : undefined}
                    strokeWidth={node.socket && takenNode ? 1.4 : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={hitRadius}
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={(event) => openNode(node, event)}
                  >
                    <title>
                      {node.name || `node ${node.id}`}
                      {node.stats?.length ? ` — ${node.stats[0]}` : ''}
                    </title>
                  </circle>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute right-2 top-2 flex gap-1">
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.6)}
            className="rounded border border-ink-700 bg-ink-900/90 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.6)}
            className="rounded border border-ink-700 bg-ink-900/90 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setView(full)}
            className="rounded border border-ink-700 bg-ink-900/90 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
            aria-label="Reset view"
          >
            reset
          </button>
        </div>

        {tooltip && (
          <div
            className="fixed z-50 w-72 rounded-lg border border-ink-600 bg-ink-900 p-3 text-xs shadow-xl"
            style={{ left: tooltipLeft, top: tooltipTop }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gold-300">
                {tooltip.node.name || `node ${tooltip.node.id}`}
              </p>
              <button
                type="button"
                onClick={() => setTooltip(null)}
                className="text-zinc-500 hover:text-zinc-200"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
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
            ) : (
              <p className="mt-2 text-zinc-500">No stats recorded for this node.</p>
            )}
          </div>
        )}
      </div>

      <figcaption className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        {tree.nodes.length} points, {tree.notables.length} notables. Wheel zooms, drag
        pans, click a node for its stats. Gold are notables, blue rings are jewel
        sockets; bright nodes are allocated at {label}.
      </figcaption>
    </figure>
  );
}
