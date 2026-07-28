export interface PublishListingInput {
  marketplace: string;
  sku: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  category: string | null;
  itemSpecifics: Record<string, string>;
  photos: string[];
}

export interface PublishResult {
  ok: boolean;
  listingId?: string;
  url?: string;
  error?: string;
}

export interface MarketplacePublisher {
  key: string;
  /** True for adapters backed by a real marketplace API (vs. the mock). */
  isLive: boolean;
  publish(input: PublishListingInput): Promise<PublishResult>;
  unpublish(listingId: string): Promise<void>;
}
