import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/** Loaded once, on demand: the full tree is ~450 KB the builder never needs. */
function loadGeometry(): Promise<Geometry> {
  geometryPromise ??= import('../generated/tree-geometry.json').then(
    (module) => (module.default ?? module) as unknown as Geometry,
  );
  return geometryPromise;
}

/** Tightest view width; below this a single node fills the panel. */
const MIN_WIDTH = 320;
/** Smallest view width when fitting a short tree, so 4 nodes don't fill the screen. */
const FIT_MIN_WIDTH = 1100;

function boundsOf(nodes: { x: number; y: number }[]): View {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.x > maxX) maxX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.y > maxY) maxY = node.y;
  }
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const pad = span * 0.12;
  return {
    x: minX - pad,
    y: minY - pad,
    w: span + pad * 2,
    h: span + pad * 2,
  };
}

function fitBounds(nodes: { x: number; y: number }[]): View {
  const view = boundsOf(nodes);
  if (view.w >= FIT_MIN_WIDTH) return view;
  const grow = (FIT_MIN_WIDTH - view.w) / 2;
  return { x: view.x - grow, y: view.y - grow, w: view.w + grow * 2, h: view.h + grow * 2 };
}

/**
 * The allocated tree drawn over the full constellation, the way the game does.
 *
 * Two things matter more than the drawing:
 *  - it opens fitted to the nodes you actually took, because the whole tree at
 *    once renders ten allocated dots at two pixels each;
 *  - hit targets are capped below the node spacing, so clicking opens the node
 *    under the cursor instead of its neighbour.
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
  const drag = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadGeometry().then((loaded) => {
      if (cancelled) return;
      setGeometry(loaded);
      setView(fitBounds(tree.nodes));
    });
    return () => {
      cancelled = true;
    };
    // The tree changes per step; refit when it does.
  }, [tree]);

  const full = useMemo(() => (geometry ? boundsOf(geometry.nodes) : null), [geometry]);
  const fit = useMemo(() => fitBounds(tree.nodes), [tree]);

  const taken = useMemo(() => new Set(tree.nodes.map((node) => node.id)), [tree]);
  const takenNotable = useMemo(
    () => new Set(tree.nodes.filter((node) => node.notable).map((node) => node.id)),
    [tree],
  );

  const points = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (const node of geometry?.nodes ?? []) map.set(node.id, { x: node.x, y: node.y });
    return map;
  }, [geometry]);

  const openNode = useCallback((node: GeometryNode, event: ReactMouseEvent) => {
    if (moved.current) {
      moved.current = false;
      return;
    }
    event.stopPropagation();
    setTooltip({ node, x: event.clientX, y: event.clientY });
  }, []);

  // Wheel zooms toward the cursor. Native listener so preventDefault works.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const factor = Math.exp(event.deltaY * 0.0015);
      const fx = (event.clientX - rect.left) / rect.width;
      const fy = (event.clientY - rect.top) / rect.height;
      setView((current) => {
        if (!current) return current;
        const w = Math.min(Math.max(current.w * factor, MIN_WIDTH), full?.w ?? current.w);
        const scale = w / current.w;
        return {
          x: current.x + (current.w - w) * fx,
          y: current.y + (current.h - current.h * scale) * fy,
          w,
          h: current.h * scale,
        };
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [full]);

  if (!geometry || !view) {
    return (
      <p className="text-xs text-zinc-500">
        {tree.nodes.length === 0 ? 'No tree was planned for this step.' : 'Loading the tree…'}
      </p>
    );
  }

  const span = Math.max(full!.w, full!.h);
  const radius = span * 0.0032;
  const notableRadius = span * 0.0052;
  // Median node spacing is ~162 units. A hit radius of 80 never overlaps a
  // neighbour, so a click lands on the node under the cursor.
  const hitRadius = Math.min(span * 0.011, 80);

  const zoomBy = (factor: number) => {
    setView((current) => {
      if (!current) return current;
      const w = Math.min(Math.max(current.w * factor, MIN_WIDTH), full!.w);
      const scale = w / current.w;
      return {
        x: current.x + (current.w - w) / 2,
        y: current.y + (current.h - current.h * scale) / 2,
        w,
        h: current.h * scale,
      };
    });
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
    drag.current = { x: event.clientX, y: event.clientY };
    const rect = event.currentTarget.getBoundingClientRect();
    setView((current) => {
      if (!current) return current;
      const unit = current.w / rect.width;
      return { ...current, x: current.x - dx * unit, y: current.y - dy * unit };
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const tooltipLeft = Math.min(tooltip ? tooltip.x + 14 : 0, window.innerWidth - 300);
  const tooltipTop = Math.min(tooltip ? tooltip.y + 14 : 0, window.innerHeight - 240);

  // Static layers are memoised: panning changes the viewBox only, so React must
  // not rebuild 2,500 nodes and 2,900 edges on every pointer move.
  const staticLayer = useMemo(() => {
    if (!geometry) return null;
    return (
      <>
        <g stroke="currentColor" strokeWidth={0.7} vectorEffect="non-scaling-stroke" className="text-ink-700">
          {geometry.edges.map(([from, to]) => {
            const a = points.get(from);
            const b = points.get(to);
            if (!a || !b) return null;
            return <line key={`e${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
        </g>
        <g className="fill-ink-600">
          {geometry.nodes.map((node) => (
            <circle
              key={`g${node.id}`}
              cx={node.x}
              cy={node.y}
              r={node.notable ? radius * 1.15 : radius * 0.7}
              className={node.keystone ? 'fill-zinc-500' : undefined}
            />
          ))}
        </g>
      </>
    );
  }, [geometry, points, radius]);

  const takenLayer = useMemo(() => {
    if (!geometry) return null;
    return (
      <>
        <g stroke="#b98a2e" strokeWidth={1.4} vectorEffect="non-scaling-stroke">
          {tree.edges.map(([from, to]) => {
            const a = points.get(from);
            const b = points.get(to);
            if (!a || !b) return null;
            return <line key={`t${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
        </g>
        {geometry.nodes.map((node) => {
          if (!taken.has(node.id)) return null;
          const isNotable = takenNotable.has(node.id);
          return (
            <circle
              key={`a${node.id}`}
              cx={node.x}
              cy={node.y}
              r={isNotable ? notableRadius : radius}
              className={isNotable ? 'fill-gold-300' : 'fill-zinc-100'}
              stroke={node.socket ? '#7aa2f7' : undefined}
              strokeWidth={node.socket ? 1.6 : undefined}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </>
    );
  }, [geometry, points, tree, taken, takenNotable, radius, notableRadius]);

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
            className="cursor-pointer"
            onClick={(event) => openNode(node, event)}
          >
            <title>
              {node.name || `node ${node.id}`}
              {node.stats?.length ? ` — ${node.stats[0]}` : ''}
            </title>
          </circle>
        ))}
      </g>
    );
  }, [geometry, hitRadius, openNode]);

  return (
    <figure>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          role="img"
          aria-label={`Passive tree at ${label}: ${tree.nodes.length} points, ${tree.notables.length} notables`}
          className="h-[34rem] w-full cursor-grab touch-none rounded-lg border border-ink-700 bg-[#0b0d12] active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={() => setTooltip(null)}
        >
          {staticLayer}
          {takenLayer}
          {hitLayer}
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
            onClick={() => setView(fit)}
            className="rounded border border-ink-700 bg-ink-900/90 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
            title="Fit the nodes you took"
          >
            fit
          </button>
          <button
            type="button"
            onClick={() => setView(full)}
            className="rounded border border-ink-700 bg-ink-900/90 px-2 py-1 text-xs text-zinc-300 hover:text-gold-300"
            title="Show the whole tree"
          >
            all
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
        {tree.nodes.length} points, {tree.notables.length} notables at {label}. Wheel zooms,
        drag pans, click any node for its stats. Gold are notables, blue rings are jewel
        sockets; bright nodes are allocated. <span className="text-zinc-400">fit</span> shows
        only what you took, <span className="text-zinc-400">all</span> shows the whole tree.
      </figcaption>
    </figure>
  );
}
