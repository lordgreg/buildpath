import data from './base-types.json';

export interface BaseType {
  name: string;
  itemClass: string;
  tags: string[];
  dropLevel: number;
  width: number;
  height: number;
}

export interface BaseTypeMeta {
  source: string;
  ref: string;
  generatedAt: string;
  count: number;
  sha256: string;
}

export const baseTypes: readonly BaseType[] = data.items;
export const baseTypeMeta: BaseTypeMeta = data.meta;

export function basesWithTag(tag: string): BaseType[] {
  return data.items.filter((item) => item.tags.includes(tag));
}

export function basesWithClass(itemClass: string): BaseType[] {
  return data.items.filter((item) => item.itemClass === itemClass);
}