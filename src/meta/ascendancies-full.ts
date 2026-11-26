import data from '../generated/ascendancies-full.json';

export interface FullAscendancyNode {
  id: string;
  name: string;
  notable: boolean;
  effect: string[];
}

export interface FullAscendancy {
  name: string;
  class: string;
  nodes: FullAscendancyNode[];
}

const table = data as {
  ascendancies: Record<string, FullAscendancy>;
};

export function getFullAscendancy(id: string): FullAscendancy | undefined {
  return table.ascendancies[id];
}

export const FULL_ASCENDANCIES = table.ascendancies;
