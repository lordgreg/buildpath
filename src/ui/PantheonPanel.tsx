import type { CSSProperties } from 'react';
import {
  PANTHEON_MAJOR,
  PANTHEON_MINOR,
  getMajorGod,
  getMinorGod,
} from '../meta/pantheon.ts';
import type { PantheonGod } from '../meta/pantheon.ts';

interface GodNode {
  id: string;
  god: PantheonGod;
}

function shortName(name: string): string {
  return name.replace(/^The /, '');
}

function GodCircle({
  entry,
  selected,
  major,
  style,
}: {
  entry: GodNode;
  selected: boolean;
  major: boolean;
  style: CSSProperties;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={style}
      title={`${entry.god.name}: ${entry.god.effect}`}
    >
      <div
        className={
          major
            ? `flex h-14 w-14 items-center justify-center rounded-full border-2 text-center text-[8px] leading-none ${
                selected
                  ? 'border-gold-300 bg-gold-400/20 text-gold-100 shadow-[0_0_18px_rgba(224,192,112,0.35)]'
                  : 'border-[#5b4a28] bg-ink-950/80 text-zinc-500'
              }`
            : `flex h-10 w-10 items-center justify-center rounded-full border text-center text-[7px] leading-none ${
                selected
                  ? 'border-gold-300 bg-gold-400/15 text-gold-200 shadow-[0_0_14px_rgba(224,192,112,0.3)]'
                  : 'border-[#3f3a2d] bg-ink-950/80 text-zinc-600'
              }`
        }
      >
        <span className="max-w-[3.2rem] break-words px-0.5">{shortName(entry.god.name)}</span>
      </div>
    </div>
  );
}

function position(radius: number, angle: number): CSSProperties {
  const radians = (angle * Math.PI) / 180;
  return {
    left: `${50 + radius * Math.cos(radians)}%`,
    top: `${50 + radius * Math.sin(radians)}%`,
  };
}

/**
 * The pantheon read as a wheel: four major gods on the outer ring, eight minor
 * gods inside, with the build's choices lit. The table below is the reference
 * the game's own panel hides behind the god tooltips.
 */
export default function PantheonPanel({
  major,
  minor,
  note,
}: {
  major: string;
  minor: string;
  note?: string;
}) {
  const majors = Object.entries(PANTHEON_MAJOR).map(([id, god]) => ({ id, god }));
  const minors = Object.entries(PANTHEON_MINOR).map(([id, god]) => ({ id, god }));
  const selectedMajor = getMajorGod(major);
  const selectedMinor = getMinorGod(minor);

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div
          className="relative mx-auto aspect-square w-full max-w-[20rem] overflow-hidden rounded-full border border-[#4a3f27]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 40%, rgba(91, 74, 40, 0.35), transparent 55%), radial-gradient(circle at 50% 50%, #151a22 0%, #0a0d12 70%)',
          }}
        >
          <div className="absolute inset-[8%] rounded-full border border-[#3a3529]" />
          <div className="absolute inset-[23%] rounded-full border border-[#2d2a22]" />
          <div className="absolute inset-[39%] rounded-full border border-[#2d2a22]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#8d7a4c]">Pantheon</p>
              <p className="mt-1 text-xs font-semibold text-gold-200">
                {selectedMajor?.name ?? major}
              </p>
              <p className="text-[11px] text-zinc-400">{selectedMinor?.name ?? minor}</p>
            </div>
          </div>
          {majors.map((entry, index) => (
            <GodCircle
              key={entry.id}
              entry={entry}
              selected={entry.id === major}
              major
              style={position(39, -135 + index * 90)}
            />
          ))}
          {minors.map((entry, index) => (
            <GodCircle
              key={entry.id}
              entry={entry}
              selected={entry.id === minor}
              major={false}
              style={position(23, -90 + index * 45)}
            />
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                <th className="py-1 pr-3 font-normal">God</th>
                <th className="py-1 pr-3 font-normal">Type</th>
                <th className="py-1 font-normal">What it gives</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...majors.map((entry) => ({ ...entry, type: 'Major' })),
                ...minors.map((entry) => ({ ...entry, type: 'Minor' })),
              ].map((entry) => {
                const selected = entry.id === major || entry.id === minor;
                return (
                  <tr
                    key={`${entry.type}-${entry.id}`}
                    className={`border-t border-ink-800/80 ${selected ? 'bg-gold-400/5' : ''}`}
                  >
                    <td className={`py-1.5 pr-3 ${selected ? 'text-gold-200' : 'text-zinc-300'}`}>
                      {selected && <span className="mr-1 text-gold-300">●</span>}
                      {entry.god.name}
                    </td>
                    <td className="py-1.5 pr-3 text-[10px] uppercase tracking-wide text-zinc-600">
                      {entry.type}
                    </td>
                    <td className="py-1.5 leading-snug text-zinc-500">{entry.god.effect}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {note && (
        <p className="mt-3 rounded-lg border border-ink-700 bg-ink-900/40 px-3 py-2 text-xs leading-relaxed text-zinc-400">
          {note}
        </p>
      )}
    </div>
  );
}
