import type { MarketplacePublisher } from "./types";
import { createMockPublisher } from "./mock";
import { createEbayPublisher, isEbayConfigured } from "./ebay";

export type { MarketplacePublisher, PublishListingInput, PublishResult } from "./types";

/**
 * Every marketplace defaults to the mock publisher (always succeeds, no
 * network calls) so the approve → publish flow works out of the box. A
 * marketplace only gets a "live" adapter once its credentials are actually
 * configured — today that's just eBay, and even that adapter is unverified
 * in this environment (see ebay.ts). Adding a new marketplace means adding
 * its adapter here.
 */
export function getPublisher(marketplaceKey: string): MarketplacePublisher {
  if (marketplaceKey === "ebay" && isEbayConfigured()) {
    return createEbayPublisher();
  }
  return createMockPublisher(marketplaceKey);
}
