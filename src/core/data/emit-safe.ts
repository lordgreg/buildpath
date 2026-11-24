import knownBases from './known-base-types.json';
import knownClasses from './known-classes.json';

/**
 * A name a filter can hold without changing it. Quotes and non-ASCII text are
 * unsafe: the emitter strips quotes, which would turn an exact match into a
 * different name. Names that fail this check are never emitted.
 */
function isEmitSafe(name: string): boolean {
  return /^[\x20-\x7E]+$/.test(name) && !name.includes('"');
}

export const EMIT_SAFE_BASE_TYPES: ReadonlySet<string> = new Set(
  knownBases.names.filter(isEmitSafe),
);

export const EMIT_SAFE_CLASSES: ReadonlySet<string> = new Set(
  knownClasses.names.filter(isEmitSafe),
);

export function isEmitSafeBaseType(name: string): boolean {
  return EMIT_SAFE_BASE_TYPES.has(name);
}

export function isEmitSafeClass(name: string): boolean {
  return EMIT_SAFE_CLASSES.has(name);
}
