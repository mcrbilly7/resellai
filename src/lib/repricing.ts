export interface RepricingCandidate {
  id: string;
  name: string;
  listingPrice: number;
  fastPrice: number | null;
  normalPrice: number | null;
  pricingStrategy: string;
  daysActive: number;
  suggestedPrice: number;
  reason: string;
}

interface RepricingInput {
  id: string;
  name: string;
  status: string;
  listingPrice: number | null;
  fastPrice: number | null;
  normalPrice: number | null;
  maxPrice: number | null;
  pricingStrategy: string;
  createdAt: Date;
}

// Days a listing can sit before we suggest a price drop, per strategy.
const STALE_THRESHOLD_DAYS: Record<string, number> = {
  fast: 7,
  normal: 21,
  max: 45,
};

const DROP_PERCENT: Record<string, number> = {
  fast: 5,
  normal: 8,
  max: 10,
};

export function computeRepricingSuggestions(items: RepricingInput[]): RepricingCandidate[] {
  const now = Date.now();
  const suggestions: RepricingCandidate[] = [];

  for (const item of items) {
    if (item.status !== "listed" || item.listingPrice == null) continue;
    const daysActive = Math.floor((now - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const threshold = STALE_THRESHOLD_DAYS[item.pricingStrategy] ?? STALE_THRESHOLD_DAYS.normal;
    if (daysActive < threshold) continue;

    const dropPercent = DROP_PERCENT[item.pricingStrategy] ?? DROP_PERCENT.normal;
    let suggestedPrice = Math.round(item.listingPrice * (1 - dropPercent / 100) * 100) / 100;
    const floor = item.fastPrice ?? item.listingPrice * 0.8;
    suggestedPrice = Math.max(suggestedPrice, Math.round(floor * 100) / 100);
    if (suggestedPrice >= item.listingPrice) continue;

    suggestions.push({
      id: item.id,
      name: item.name,
      listingPrice: item.listingPrice,
      fastPrice: item.fastPrice,
      normalPrice: item.normalPrice,
      pricingStrategy: item.pricingStrategy,
      daysActive,
      suggestedPrice,
      reason: `Listed ${daysActive} days (>${threshold}d threshold for ${item.pricingStrategy} sale) — suggest ${dropPercent}% price drop to re-attract buyers.`,
    });
  }

  return suggestions.sort((a, b) => b.daysActive - a.daysActive);
}
