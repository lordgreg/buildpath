import index from '../generated/builds/index.json';
import type { BuildIndexEntry } from '../core/builds/types.ts';

/**
 * Accessors over the compiled build seeds. Seeds are YAML under `src/builds/`,
 * compiled by `npm run builds:build`; the browser only ever sees this JSON.
 */
export const BUILDS = index.builds as BuildIndexEntry[];

export const BUILD_VERSION = index.version;

export function getBuildEntry(id: string): BuildIndexEntry | undefined {
  return BUILDS.find((build) => build.id === id);
}

export function isBuildId(id: string | undefined): boolean {
  return typeof id === 'string' && BUILDS.some((build) => build.id === id);
}
