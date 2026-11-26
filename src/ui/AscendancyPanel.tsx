import type { CSSProperties } from 'react';
import type { AscendancyPoint } from '../core/builds/types.ts';
import { getFullAscendancy, type FullAscendancyNode } from '../meta/ascendancies-full.ts';
import { LAB_MILESTONES } from './labs.ts';

function shortLabel(node: FullAscendancyNode): string {
  if (node.notable) return node.name;
  if (node.name.includes(',')) return node.name.split(',').slice(1).join(',').trim();
  return node.name.replace(/^Minion Damage and /, 'Minion ');
}

function position(radius: number, angle: number): CSSProperties {
  const radians = (angle * Math.PI) / 180;
  return {
    left: `${50 + radius * Math.cos(radians)}%`,
    top: `${50 + radius * Math.sin(radians)}%`,
  };
}

/**
 * The whole ascendancy, not just the four points the build takes: notables on
 * the outer ring, the small path passives inside, the chosen notables lit gold
 * with their lab badge. The effects are in the node tooltips and the list below.
 */
export default function AscendancyPanel({
  ascendancyId,
  selected,
}: {
  ascendancyId: string;
  selected: AscendancyPoint[];
}) {
  const ascendancy = getFullAscendancy(ascendancyId);
  if (!ascendancy) {
    return <p className="text-sm text-zinc-500">No ascendancy data for {ascendancyId}.</p>;
  }
  const chosen = new Map(selected.map((point) => [point.node, point]));
  const notables = ascendancy.nodes.filter((node) => node.notable);
  const small = ascendancy.nodes.filter((node) => !node.notable);

  return (
    <div>
      <div
        className="relative mx-auto aspect-square w-full max-w-[28rem] overflow-hidden rounded-full border border-[#4a3f27]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 45%, rgba(91, 74, 40, 0.28), transparent 58%), radial-gradient(circle at 50% 50%, #121720 0%, #090c12 72%)',
        }}
      >
        <div className="absolute inset-[7%] rounded-full border border-[#3a3529]" />
        <div className="absolute inset-[21%] rounded-full border border-[#2d2a22]" />
        <div className="absolute inset-[34%] rounded-full border border-[#2d2a22]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-[0.24em] text-[#8d7a4c]">
              {ascendancy.class}
            </p>
            <p className="mt-1 text-sm font-semibold text-gold-200">{ascendancy.name}</p>
            <p className="text-[10px] text-zinc-500">
              {notables.length} notables · {small.length} path nodes
            </p>
          </div>
        </div>

        {notables.map((node, index) => {
          const point = chosen.get(node.id);
          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={position(39, -90 + (index * 360) / notables.length)}
              title={`${node.name}${point ? ` · lab ${point.lab}` : ''}\n${node.effect.join('\n')}`}
            >
              <div
                className={`relative flex h-[5.6rem] w-[5.6rem] items-center justify-center rounded-full border-2 px-1 text-center text-[8px] leading-tight ${
                  point
                    ? 'border-gold-300 bg-gold-400/20 text-gold-100 shadow-[0_0_18px_rgba(224,192,112,0.35)]'
                    : 'border-[#45402f] bg-[#0b0e14]/90 text-zinc-500'
                }`}
              >
                <span className="max-h-[3.8rem] overflow-hidden break-words">{shortLabel(node)}</span>
                {point && (
                  <span className="absolute -bottom-1 rounded-full border border-ink-600 bg-ink-950 px-1 py-0.5 text-[7px] uppercase tracking-wide text-gold-300">
                    L{point.lab}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {small.map((node, index) => (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={position(22, -90 + (index * 360) / small.length + 36)}
            title={`${node.name}\n${node.effect.join('\n')}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#3f3a2d] bg-[#0b0e14]/90 px-0.5 text-center text-[6px] leading-tight text-zinc-600">
              <span className="max-h-[2.4rem] overflow-hidden break-words">{shortLabel(node)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {LAB_MILESTONES.map((milestone) => {
          const points = selected.filter((point) => point.lab === milestone.lab);
          return (
            <div
              key={milestone.lab}
              className="flex flex-col rounded-lg border border-ink-700 bg-ink-900/40 px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-300">{milestone.name}</span>
                <span className="text-[10px] text-zinc-600">level ~{milestone.level}</span>
              </div>
              <span className="mt-0.5 text-[10px] text-zinc-500">
                {points.length > 0
                  ? points.map((point) => point.node.replaceAll('-', ' ')).join(' · ')
                  : 'No notable taken yet'}
              </span>
            </div>
          );
        })}
      </div>

      <details className="mt-3 rounded-lg border border-ink-700 bg-ink-900/30 px-3 py-2">
        <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
          All nodes and effects
        </summary>
        <ul className="mt-2 grid gap-1.5 text-[11px] sm:grid-cols-2">
          {ascendancy.nodes.map((node) => {
            const point = chosen.get(node.id);
            return (
              <li key={node.id} className={point ? 'text-gold-200' : 'text-zinc-500'}>
                <span className="font-medium">{node.name}</span>
                <span className="ml-1 text-[9px] uppercase tracking-wide text-zinc-600">
                  {node.notable ? 'notable' : 'path'}
                  {point ? ` · lab ${point.lab}` : ''}
                </span>
                <span className="mt-0.5 block leading-snug text-zinc-600">
                  {node.effect.join(' · ')}
                </span>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
