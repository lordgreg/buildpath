import { useEffect, useState } from 'react';
import type { TreeView } from '../core/builds/types.ts';

interface Geometry {
  version: string;
  nodes: { id: number; x: number; y: number; notable: boolean; keystone: boolean; socket: boolean; name: string }[];
  edges: [number, number][];
}

let geometryPromise: Promise<Geometry> | null = null;

/** Loaded once, on demand: ~300 KB of coordinates that only this page needs. */
function loadGeometry(): Promise<Geometry> {
  geometryPromise ??= import('../generated/tree-geometry.json').then(
    (module) => (module.default ?? module) as unknown as Geometry,
  );
  return geometryPromise;
}

/**
 * The allocated tree on top of the whole tree, the way the game shows it: the
 * constellation faint in the background, taken nodes lit, links between taken
 * nodes bright.
 */
export default function TreeThumbnail({
  tree,
  label,
}: {
  tree: TreeView;
  label: string;
}) {
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadGeometry().then((loaded) => {
      if (!cancelled) setGeometry(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!geometry || tree.nodes.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        {tree.nodes.length === 0 ? `No tree was planned for ${label}.` : 'Loading the tree…'}
      </p>
    );
  }

  const xs = geometry.nodes.map((node) => node.x);
  const ys = geometry.nodes.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  const project = (x: number, y: number) => ({
    x: ((x - minX) / spanX) * 96 + 2,
    y: ((y - minY) / spanY) * 96 + 2,
  });
  const points = new Map(
    geometry.nodes.map((node) => [node.id, project(node.x, node.y)]),
  );

  const taken = new Set(tree.nodes.map((node) => node.id));
  const takenNotable = new Set(
    tree.nodes.filter((node) => node.notable).map((node) => node.id),
  );

  return (
    <figure>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${label} passive tree: ${tree.nodes.length} points, ${tree.notables.length} notables`}
        className="h-[26rem] w-full rounded-lg border border-ink-700 bg-[#0b0d12]"
      >
        <g stroke="currentColor" className="text-ink-700" strokeWidth="0.3" vectorEffect="non-scaling-stroke">
          {geometry.edges.map(([from, to]) => {
            if (taken.has(from) && taken.has(to)) return null;
            const a = points.get(from);
            const b = points.get(to);
            if (!a || !b) return null;
            return <line key={`g${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
        </g>

        <g className="fill-ink-600">
          {geometry.nodes.map((node) => {
            if (taken.has(node.id)) return null;
            const point = points.get(node.id);
            if (!point) return null;
            return (
              <circle
                key={`n${node.id}`}
                cx={point.x}
                cy={point.y}
                r={node.notable ? 0.75 : node.keystone ? 0.8 : 0.45}
              />
            );
          })}
        </g>

        <g stroke="#e8c37a" strokeWidth="1.1" vectorEffect="non-scaling-stroke">
          {geometry.edges
            .filter(([from, to]) => taken.has(from) && taken.has(to))
            .map(([from, to]) => {
              const a = points.get(from);
              const b = points.get(to);
              if (!a || !b) return null;
              return <line key={`t${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
        </g>

        <g>
          {geometry.nodes.map((node) => {
            if (!taken.has(node.id)) return null;
            const point = points.get(node.id);
            if (!point) return null;
            const big = takenNotable.has(node.id);
            return (
              <circle
                key={`a${node.id}`}
                cx={point.x}
                cy={point.y}
                r={big ? 1.5 : node.socket ? 1.2 : 0.85}
                className={big ? 'fill-gold-300' : 'fill-zinc-200'}
                stroke={node.socket ? '#8fb6ff' : undefined}
                strokeWidth={node.socket ? 0.4 : undefined}
                vectorEffect="non-scaling-stroke"
              >
                <title>{node.name || `node ${node.id}`}</title>
              </circle>
            );
          })}
        </g>
      </svg>
      <figcaption className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        {tree.nodes.length} points, {tree.notables.length} notables —{' '}
        {tree.notables.slice(0, 8).join(', ')}
        {tree.notables.length > 8 ? `, +${tree.notables.length - 8} more` : ''}
      </figcaption>
    </figure>
  );
}
