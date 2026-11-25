import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * React error #310 ("Rendered more hooks than during the previous render") is a
 * production crash, not a warning, and it only appears once the tree geometry
 * resolves: the first render returns early, the second render reaches the
 * memoised layers. The test environment has no DOM, so this pins the invariant
 * in the source instead of rendering twice.
 */
const source = readFileSync(new URL('./TreeThumbnail.tsx', import.meta.url), 'utf8');

const TOP_LEVEL_HOOK =
  /^ {2}(?:const .*?=\s*)?use(?:State|Effect|Memo|Callback|Ref|Reducer|LayoutEffect)(?:<[^>]*>)?\s*\(/gm;

describe('TreeThumbnail hook order', () => {
  it('runs every hook before the geometry early return', () => {
    const earlyReturn = source.indexOf('if (!geometry || !view)');
    expect(earlyReturn).toBeGreaterThan(-1);

    let lastHook = -1;
    for (const match of source.matchAll(TOP_LEVEL_HOOK)) {
      lastHook = match.index ?? -1;
    }

    expect(lastHook).toBeGreaterThan(-1);
    expect(lastHook).toBeLessThan(earlyReturn);
  });
});
