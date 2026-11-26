import data from '../generated/pantheon.json';

export interface PantheonGod {
  name: string;
  effect: string;
}

export interface BanditChoice {
  name: string;
  effect: string;
}

const pantheon = data as {
  major: Record<string, PantheonGod>;
  minor: Record<string, PantheonGod>;
  bandits: Record<string, BanditChoice>;
};

export const PANTHEON_MAJOR = pantheon.major;
export const PANTHEON_MINOR = pantheon.minor;
export const BANDITS = pantheon.bandits;

export function getMajorGod(id: string): PantheonGod | undefined {
  return pantheon.major[id];
}

export function getMinorGod(id: string): PantheonGod | undefined {
  return pantheon.minor[id];
}

export function getBandit(id: string): BanditChoice | undefined {
  return pantheon.bandits[id];
}
