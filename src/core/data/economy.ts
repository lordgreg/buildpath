import presets from '../../generated/presets.json';

export interface EconomyTiers {
  currency: Record<string, number>;
  fragment: Record<string, number>;
  divination: Record<string, number>;
  uniqueBase: Record<string, number>;
}

export interface CompiledEconomy {
  league: { id: string; name: string };
  fetchedAt: string;
  source: string;
  divineChaos: number;
  tiers: EconomyTiers;
}

/**
 * The economy snapshot with the hand-written overrides already applied. The raw
 * fetch stays in `generated/economy.json`; `presets:build` merges the overrides
 * and validates that every override names a real tier entry.
 */
export const ECONOMY = presets.economy as unknown as CompiledEconomy;

export const ECONOMY_TIERS = ECONOMY.tiers;
