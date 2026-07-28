export interface MarketplaceDef {
  key: string;
  name: string;
  feePercent: number; // approximate final-value + payment fee, for the profit calculator
}

export const MARKETPLACES: MarketplaceDef[] = [
  { key: "ebay", name: "eBay", feePercent: 13.25 },
  { key: "amazon", name: "Amazon", feePercent: 15 },
  { key: "facebook", name: "Facebook Marketplace", feePercent: 5 },
  { key: "mercari", name: "Mercari", feePercent: 10 },
  { key: "poshmark", name: "Poshmark", feePercent: 20 },
  { key: "etsy", name: "Etsy", feePercent: 6.5 },
  { key: "depop", name: "Depop", feePercent: 10 },
  { key: "offerup", name: "OfferUp", feePercent: 12.9 },
  { key: "shopify", name: "Shopify", feePercent: 2.9 },
  { key: "woocommerce", name: "WooCommerce", feePercent: 2.9 },
];

export function feeForMarketplace(key: string): number {
  return MARKETPLACES.find((m) => m.key === key)?.feePercent ?? 10;
}

export const STATUS_PIPELINE = [
  "purchased",
  "needs_photos",
  "ai_processing",
  "draft",
  "listed",
  "sold",
  "shipped",
  "archived",
] as const;

export type ItemStatus = (typeof STATUS_PIPELINE)[number];

export const STATUS_LABELS: Record<string, string> = {
  purchased: "Purchased",
  needs_photos: "Needs Photos",
  ai_processing: "AI Processing",
  draft: "Draft",
  listed: "Listed",
  sold: "Sold",
  shipped: "Shipped",
  archived: "Archived",
};

export const CONDITIONS = [
  "New",
  "Like New",
  "Excellent",
  "Good",
  "Fair",
  "Parts/Repair",
] as const;
