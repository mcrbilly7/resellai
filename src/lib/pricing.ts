export interface PricingInput {
  msrp: number;
  currentRetail?: number;
  avgSoldPrice?: number;
  lowestActive?: number;
  highestSoldPrice?: number;
  conditionScore: number; // 0-100
  rarity?: string | null;
}

export interface PricingTiers {
  fastPrice: number;
  normalPrice: number;
  maxPrice: number;
}

const RARITY_MULTIPLIER: Record<string, number> = {
  common: 1,
  uncommon: 1.08,
  rare: 1.2,
  "limited edition": 1.35,
  vintage: 1.15,
};

/**
 * Blends comps (avg sold / lowest active / highest sold) with condition and
 * rarity to produce the three seller-facing pricing strategies described in
 * the spec: Fast Sale, Normal Sale, Max Profit.
 */
export function computePricingTiers(input: PricingInput): PricingTiers {
  const conditionFactor = 0.55 + (input.conditionScore / 100) * 0.45;
  const base =
    input.avgSoldPrice ??
    input.currentRetail ??
    input.msrp * 0.65;

  const rarityKey = input.rarity?.toLowerCase() ?? "common";
  const rarityMultiplier = RARITY_MULTIPLIER[rarityKey] ?? 1;

  const floor = input.lowestActive ?? base * 0.85;
  const ceiling = input.highestSoldPrice ?? base * 1.25;

  const fastPrice = round2(Math.max(floor * 0.97, base * 0.85) * conditionFactor);
  const normalPrice = round2(base * conditionFactor * rarityMultiplier);
  const maxPrice = round2(
    Math.max(ceiling * 1.03, base * 1.15) * conditionFactor * rarityMultiplier
  );

  return {
    fastPrice: Math.min(fastPrice, normalPrice),
    normalPrice,
    maxPrice: Math.max(maxPrice, normalPrice + 1),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
