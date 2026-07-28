export interface ProfitInput {
  salePrice: number;
  purchasePrice: number;
  shippingCost: number;
  packagingCost: number;
  marketplaceFeePercent: number; // e.g. 13.25 for 13.25%
  otherFees?: number;
}

export interface ProfitResult {
  platformFees: number;
  totalCost: number;
  profit: number;
  roi: number; // percent, relative to purchase price
  profitMargin: number; // percent, relative to sale price
}

export function computeProfit(input: ProfitInput): ProfitResult {
  const platformFees = round2(
    (input.salePrice * input.marketplaceFeePercent) / 100 + (input.otherFees ?? 0)
  );
  const totalCost = round2(
    input.purchasePrice + input.shippingCost + input.packagingCost + platformFees
  );
  const profit = round2(input.salePrice - totalCost);
  const roi = input.purchasePrice > 0 ? round2((profit / input.purchasePrice) * 100) : 0;
  const profitMargin = input.salePrice > 0 ? round2((profit / input.salePrice) * 100) : 0;

  return { platformFees, totalCost, profit, roi, profitMargin };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
