/**
 * Publication gates that do not depend on PoB: the league's first 72 hours
 * (R4) and a patch fact set that moved under a build (R10).
 */

export const LEAGUE_WINDOW_HOURS = 72;

export function leagueWindowOpen(
  now: Date | number | string,
  startsAt: Date | string,
  hours = LEAGUE_WINDOW_HOURS,
): boolean {
  const current =
    now instanceof Date ? now.getTime() : typeof now === 'string' ? Date.parse(now) : now;
  const start = startsAt instanceof Date ? startsAt.getTime() : Date.parse(startsAt);
  if (!Number.isFinite(current) || !Number.isFinite(start)) return false;
  return current - start >= hours * 60 * 60 * 1000;
}

export interface PatchFactsIdentity {
  /** Hash of the tree and gem data the build was verified against. */
  patchHash?: string;
  /** The PoB tag that supplied the oracle. */
  pobRef?: string;
}

export interface PatchFacts extends PatchFactsIdentity {
  pobRef: string;
  patch: string;
  treeVersion: string;
  patchHash: string;
}

export type Staleness =
  | { status: 'current'; reason: null }
  | { status: 'waiting-for-pob'; reason: string }
  | { status: 'stale'; reason: string };

/**
 * A build is current only when its recorded patch hash matches the current
 * fact set. A missing fact set is "waiting for PoB"; a hash that moved is stale.
 */
export interface StalenessBuild {
  status: string;
  pipeline?: { patchHash?: string };
  stale?: Staleness;
}

/**
 * Applies the patch fact set to a catalogue. A moved hash (or a missing PoB
 * fact set) delists the build; the old evidence is preserved on its own page.
 */
export function applyBuildStaleness<T extends StalenessBuild>(
  builds: T[],
  current: PatchFacts | undefined,
): T[] {
  for (const build of builds) {
    const stale = evaluateStaleness(build.pipeline, current);
    if (stale.status === 'current') {
      delete build.stale;
    } else {
      build.stale = stale;
      build.status = 'stale';
    }
  }
  return builds;
}

export function evaluateStaleness(
  build: { patchHash?: string } | undefined,
  current: PatchFacts | undefined,
): Staleness {
  if (!current) {
    return {
      status: 'waiting-for-pob',
      reason: 'No PoB tag for the live patch; nothing is verified.',
    };
  }
  if (!build?.patchHash) {
    return {
      status: 'waiting-for-pob',
      reason: 'This build has not been verified against a patch fact set.',
    };
  }
  if (build.patchHash !== current.patchHash) {
    return {
      status: 'stale',
      reason: `Verified against ${build.patchHash}, current facts are ${current.patchHash}.`,
    };
  }
  return { status: 'current', reason: null };
}
