import classMap from './class-map.json';
import known from './known-classes.json';

export interface KnownClassesMeta {
  source: string;
  ref: string;
  generatedAt: string;
  count: number;
}

/** Every `Class` value the reviewed registry accepts. */
export const knownClasses: readonly string[] = known.names;
export const knownClassMeta: KnownClassesMeta = known.meta;
export const KNOWN_CLASSES: ReadonlySet<string> = new Set(known.names);

/** RePoE `item_class` -> the plural `Class` value used by item filters. */
export const FILTER_CLASSES: Readonly<Record<string, string>> = classMap;

export function toFilterClass(itemClass: string): string {
  return FILTER_CLASSES[itemClass] ?? itemClass;
}

export function isKnownClass(name: string): boolean {
  return KNOWN_CLASSES.has(name);
}
