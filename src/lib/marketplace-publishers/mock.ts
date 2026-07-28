import type { MarketplacePublisher, PublishListingInput, PublishResult } from "./types";

/**
 * Default publisher for every marketplace. Simulates a successful listing
 * publish without any network calls, so the approve → publish → track flow
 * works end-to-end without real marketplace credentials.
 */
export function createMockPublisher(marketplaceKey: string): MarketplacePublisher {
  return {
    key: marketplaceKey,
    isLive: false,
    async publish(input: PublishListingInput): Promise<PublishResult> {
      const listingId = `MOCK-${marketplaceKey.toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      return {
        ok: true,
        listingId,
        url: `https://example.com/${marketplaceKey}/listing/${listingId}?sku=${encodeURIComponent(input.sku)}`,
      };
    },
    async unpublish(): Promise<void> {
      // no-op: nothing was actually published anywhere
    },
  };
}
