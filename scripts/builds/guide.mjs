/**
 * Resolves and checks guide prose for the build compiler (R1, §12.2).
 *
 * This is the Node half of `src/core/builds/guide.ts`: it adds the facts hash
 * and the publication status. The browser only reads the resolved text.
 */
import { createHash } from 'node:crypto';
import {
  GUIDE_SECTIONS,
  resolveProse,
  validateFacts,
  validateProseDigits,
} from '../../src/core/builds/guide.ts';

export function guideFactsHash(build, facts) {
  const declared = [...facts].sort().map((path) => {
    let cursor = build;
    for (const segment of path.split('.')) {
      cursor = cursor?.[segment];
    }
    return [path, cursor];
  });
  return createHash('sha256')
    .update(JSON.stringify(declared))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Turns the seed's guide into the resolved JSON the page renders. Any
 * unresolved placeholder, raw digit or missing declared fact is an error: a
 * build with broken prose does not compile.
 */
export function resolveGuide(build, seedGuide, { previous } = {}) {
  const errors = [];
  const guide = {};
  for (const sectionId of GUIDE_SECTIONS) {
    const section = seedGuide?.[sectionId];
    if (!section) {
      errors.push(`guide.${sectionId}: missing section`);
      continue;
    }
    const digitFailures = validateProseDigits(section.text);
    const factFailures = validateFacts(build, section.facts ?? []);
    const resolved = resolveProse(section.text, build);
    errors.push(
      ...digitFailures.map((error) => `guide.${sectionId}: ${error}`),
      ...factFailures.map((error) => `guide.${sectionId}: ${error}`),
      ...resolved.errors.map((error) => `guide.${sectionId}: ${error}`),
    );
    const factsHash = guideFactsHash(build, section.facts ?? []);
    const signed = section.signed
      ? { by: section.signed.by, at: section.signed.at }
      : null;
    const previousSection = previous?.[sectionId];
    // A signed section whose declared facts moved is stale until re-signed.
    const stale =
      Boolean(signed) &&
      Boolean(previousSection?.factsHash) &&
      previousSection.factsHash !== factsHash;
    guide[sectionId] = {
      text: resolved.text,
      status: stale
        ? 'stale'
        : signed
          ? 'signed'
          : sectionId === 'summary'
            ? 'auto-breadth'
            : 'auto-retry',
      signed,
      facts: section.facts ?? [],
      factsHash,
    };
  }
  return { guide, errors };
}
