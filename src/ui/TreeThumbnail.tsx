import type { TreeView } from '../core/builds/types.ts';

/**
 * A thumbnail of an allocated passive tree.
 *
 * Positions come from the tree data (one point per group), not from a sprite
 * sheet, so it renders offline and stays small: a few hundred circles instead
 * of a megabyte of art. Notables are drawn larger and named in the caption.
 */
export default function TreeThumbnail({
  tree,
  label,
}: {
  tree: TreeView;
  label: string;
}) {
  if (tree.nodes.length === 0) {
    return (
      <p className="text-xs text-zinc-500">No tree was planned for {label}.</p>
    );
  }

  const xs = tree.nodes.map((node) => node.x);
  const ys = tree.nodes.map((node) => node.y);
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
    tree.nodes.map((node) => [node.id, project(node.x, node.y)]),
  );

  return (
    <figure>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${label} passive tree: ${tree.nodes.length} points, ${tree.notables.length} notables`}
        className="h-72 w-full rounded-lg border border-ink-700 bg-ink-800/40"
      >
        {tree.edges.map(([from, to]) => {
          const a = points.get(from);
          const b = points.get(to);
          if (!a || !b) return null;
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="currentColor"
              className="text-ink-500"
              strokeWidth="0.7"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {tree.nodes.map((node) => {
          const point = points.get(node.id);
          if (!point) return null;
          return (
            <circle
              key={node.id}
              cx={point.x}
              cy={point.y}
              r={node.notable ? 1.6 : 0.9}
              className={node.notable ? 'fill-gold-300' : 'fill-zinc-400'}
            >
              <title>{node.name || `node ${node.id}`}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        {tree.nodes.length} points, {tree.notables.length} notables —{' '}
        {tree.notables.slice(0, 8).join(', ')}
        {tree.notables.length > 8 ? `, +${tree.notables.length - 8} more` : ''}
      </figcaption>
    </figure>
  );
}
