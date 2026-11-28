import { useState } from 'react';
import type { Build } from '../../core/builds/types.ts';
import { getPobLink } from '../../meta/pob-links.ts';
import { copyText } from '../download.ts';

/**
 * One published code carries every measured step as its own tree, item set and
 * skill set. PoB opens on the red-map step; the notes explain the rest.
 */
export default function PobCode({
  buildId,
  pob,
}: {
  buildId: string;
  pob: NonNullable<Build['pob']>;
}) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const code = pob.code;
  const link = getPobLink(buildId);
  return (
    <section aria-labelledby="pob">
      <h3 id="pob" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Path of Building
      </h3>
      <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-zinc-600">
        One code, every step: each measured step is its own passive tree, item set and
        skill set, and the notes carry the introduction and what changes at each step.
        PoB opens on the red-map step; switch tree, item set or skill set to read another
        step. The gate report above is the source of the per-step numbers.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={async () => setCopied((await copyText(code)) ? 'ok' : 'fail')}
          className="rounded border border-ink-600 bg-ink-800/60 px-3 py-1.5 text-xs text-zinc-200 hover:border-gold-400 hover:text-gold-200"
        >
          {copied === 'ok' ? 'Copied' : copied === 'fail' ? 'Copy failed' : 'Copy full PoB code'}
        </button>
        {link ? (
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded border border-ink-700 px-3 py-1.5 text-xs text-zinc-400 underline-offset-2 hover:border-ink-500 hover:underline"
          >
            Open build on pobb.in
          </a>
        ) : (
          <span className="text-[10px] text-zinc-600">
            PoB paste not published yet; copy the code instead.
          </span>
        )}
        <span className="text-[10px] text-zinc-600">{(code.length / 1024).toFixed(1)} KB</span>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-300">
          show the code
        </summary>
        <textarea
          readOnly
          value={code}
          rows={4}
          spellCheck={false}
          className="mt-2 w-full resize-y rounded border border-ink-700 bg-ink-950/60 p-2 font-mono text-[10px] leading-snug text-zinc-400"
          aria-label="Path of Building code"
        />
      </details>
    </section>
  );
}
