import type {
  BuildWickerman,
  WickermanPick,
  WickermanSlot,
  WickermanStepId,
} from '../core/builds/types.ts';

const SLOT_LABEL: Record<WickermanSlot, string> = {
  head: 'Head',
  torso: 'Torso',
  upperLimb: 'Upper limb',
  lowerLimb: 'Lower limb',
};

const SLOT_HINT: Record<WickermanSlot, string> = {
  head: 'Top',
  torso: 'Centre',
  upperLimb: 'Left',
  lowerLimb: 'Right',
};

const TIER_LABEL: Record<WickermanPick['tier'], string> = {
  low: 'Lesser',
  med: 'Normal',
  high: 'Greater',
  queen: 'Queen',
  fixed: 'Fixed',
  uber: 'Uber',
};

/** The guide phase the selected checkpoint belongs to. */
export function wickermanPhase(checkpoint: string): WickermanStepId {
  if (checkpoint === 'until-12' || checkpoint === 'until-28' || checkpoint === 'until-68') {
    return 'leveling';
  }
  if (checkpoint === 'pinnacle') return 'bossing';
  return 'maps';
}

function SlotCard({ slot, pick }: { slot: WickermanSlot; pick: WickermanPick }) {
  return (
    <article className="rounded-lg border border-violet-400/25 bg-violet-500/[0.04] p-3">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className="text-[9px] uppercase tracking-[0.18em] text-violet-300">
          {SLOT_LABEL[slot]}
        </p>
        <span className="text-[9px] uppercase tracking-wide text-zinc-600">
          {SLOT_HINT[slot]}
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold leading-tight text-zinc-100">{pick.name}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-violet-400/40 bg-violet-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-violet-200">
          {TIER_LABEL[pick.tier]}
        </span>
        <span className="text-[10px] text-zinc-500">
          {pick.source} · {pick.area}
        </span>
      </div>
      <p className="mt-2 text-xs leading-snug text-zinc-300">{pick.effect}</p>
      {pick.note && (
        <p className="mt-1.5 text-[10px] leading-snug text-zinc-500">{pick.note}</p>
      )}
    </article>
  );
}

export default function WickermanPanel({
  wickerman,
  phase,
}: {
  wickerman: BuildWickerman;
  phase: WickermanStepId;
}) {
  const picks = wickerman.steps[phase];
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded border border-violet-400/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-violet-200">
          {phase}
        </span>
        <span className="text-[10px] text-zinc-600">
          profile {wickerman.profile} · follows the step picker
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div aria-hidden className="hidden sm:block" />
        <SlotCard slot="head" pick={picks.head} />
        <div aria-hidden className="hidden sm:block" />
        <SlotCard slot="upperLimb" pick={picks.upperLimb} />
        <SlotCard slot="torso" pick={picks.torso} />
        <SlotCard slot="lowerLimb" pick={picks.lowerLimb} />
      </div>
    </div>
  );
}
