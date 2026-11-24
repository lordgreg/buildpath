import { knownClasses } from '../data/classes.ts';
import type { Rule } from '../filter/types.ts';

export interface ClassMigration {
  rules: Rule[];
  notices: string[];
}

function label(rule: Rule): string {
  return rule.comment?.trim() || rule.id || 'custom rule';
}

function longerClasses(name: string): string[] {
  return knownClasses.filter(
    (candidate) => candidate !== name && candidate.includes(name),
  );
}

/**
 * Exact `Class ==` matching no longer accepts partial names. Legacy filters
 * used partials such as "Swords" to match every sword class, so expand a
 * partial to the registered classes that contain it. A registered name that is
 * itself a substring of another registered class is kept and flagged, unless
 * the longer class is already listed in the same rule.
 *
 * An unknown name cannot be emitted: the game rejects the whole filter. Drop it
 * and say so. A rule left with no class names is disabled rather than widened.
 */
export function migrateRuleClasses(rules: readonly Rule[]): ClassMigration {
  const notices: string[] = [];
  const migrated: Rule[] = [];

  for (const rule of rules) {
    const classNames = rule.classNames;
    if (!classNames?.length) {
      migrated.push(rule);
      continue;
    }

    const kept: string[] = [];
    const seen = new Set<string>();
    const add = (name: string) => {
      if (seen.has(name)) return;
      seen.add(name);
      kept.push(name);
    };

    for (const name of classNames) {
      if (knownClasses.includes(name)) {
        add(name);
        continue;
      }

      const matches = knownClasses.filter((candidate) => candidate.includes(name));
      if (matches.length > 0) {
        for (const match of matches) add(match);
        notices.push(
          `Rule "${label(rule)}": class "${name}" was expanded to ${matches
            .map((match) => `"${match}"`)
            .join(', ')}.`,
        );
        continue;
      }

      notices.push(
        `Rule "${label(rule)}": class "${name}" is not a known class and was removed.`,
      );
    }

    for (const name of kept) {
      const missing = longerClasses(name).filter((longer) => !kept.includes(longer));
      if (missing.length === 0) continue;
      notices.push(
        `Rule "${label(rule)}": class "${name}" now matches only "${name}", not ${missing
          .map((longer) => `"${longer}"`)
          .join(', ')}.`,
      );
    }

    if (kept.length === 0) {
      notices.push(
        `Rule "${label(rule)}" has no known class names left and was disabled.`,
      );
      migrated.push({ ...rule, classNames: classNames, disabled: true });
      continue;
    }

    migrated.push({ ...rule, classNames: kept });
  }

  return { rules: migrated, notices };
}
