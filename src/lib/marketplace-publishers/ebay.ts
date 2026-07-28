import type { MarketplacePublisher, PublishListingInput, PublishResult } from "./types";

/**
 * eBay Sell API adapter (Inventory API: inventory_item -> offer -> publish).
 *
 * IMPORTANT: this is implemented against eBay's documented REST API shape
 * from training knowledge, but this sandbox has no network access to
 * api.ebay.com (confirmed blocked by egress policy), so it has never
 * actually been run against eBay. Treat it as a structurally-complete
 * starting point that needs real-credential testing before production use,
 * not a verified integration.
 *
 * Required env vars: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_REFRESH_TOKEN
 * (user token w/ sell.inventory scope), EBAY_MERCHANT_LOCATION_KEY. Falls
 * back to EBAY_DEFAULT_CATEGORY_ID when no real category mapping is available.
 */

const EBAY_ENV = process.env.EBAY_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
const API_BASE = EBAY_ENV === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
const MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID || "EBAY_US";

export function isEbayConfigured(): boolean {
  return Boolean(
    process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET && process.env.EBAY_REFRESH_TOKEN
  );
}

async function getUserAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID!;
  const clientSecret = process.env.EBAY_CLIENT_SECRET!;
  const refreshToken = process.env.EBAY_REFRESH_TOKEN!;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${API_BASE}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "https://api.ebay.com/oauth/api_scope/sell.inventory",
    }),
  });

  if (!res.ok) {
    throw new Error(`eBay token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export function createEbayPublisher(): MarketplacePublisher {
  return {
    key: "ebay",
    isLive: true,
    async publish(input: PublishListingInput): Promise<PublishResult> {
      try {
        const token = await getUserAccessToken();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Language": "en-US",
        };

        // 1. Create/replace the inventory item.
        const inventoryRes = await fetch(`${API_BASE}/sell/inventory/v1/inventory_item/${encodeURIComponent(input.sku)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            condition: mapCondition(input.condition),
            product: {
              title: input.title.slice(0, 80),
              description: input.description,
              aspects: Object.fromEntries(
                Object.entries(input.itemSpecifics)
                  .filter(([, v]) => v)
                  .map(([k, v]) => [k, [v]])
              ),
              imageUrls: input.photos.filter((p) => p.startsWith("http")),
            },
            availability: {
              shipToLocationAvailability: { quantity: input.quantity },
            },
          }),
        });
        if (!inventoryRes.ok) {
          return { ok: false, error: `Inventory item create failed: ${inventoryRes.status} ${await inventoryRes.text()}` };
        }

        // 2. Create an offer.
        const offerRes = await fetch(`${API_BASE}/sell/inventory/v1/offer`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            sku: input.sku,
            marketplaceId: MARKETPLACE_ID,
            format: "FIXED_PRICE",
            availableQuantity: input.quantity,
            categoryId: process.env.EBAY_DEFAULT_CATEGORY_ID || "",
            listingDescription: input.description,
            pricingSummary: { price: { value: input.price.toFixed(2), currency: "USD" } },
            merchantLocationKey: process.env.EBAY_MERCHANT_LOCATION_KEY || "",
          }),
        });
        if (!offerRes.ok) {
          return { ok: false, error: `Offer create failed: ${offerRes.status} ${await offerRes.text()}` };
        }
        const offer = (await offerRes.json()) as { offerId: string };

        // 3. Publish the offer.
        const publishRes = await fetch(`${API_BASE}/sell/inventory/v1/offer/${offer.offerId}/publish`, {
          method: "POST",
          headers,
        });
        if (!publishRes.ok) {
          return { ok: false, error: `Publish failed: ${publishRes.status} ${await publishRes.text()}` };
        }
        const published = (await publishRes.json()) as { listingId: string };

        return {
          ok: true,
          listingId: published.listingId,
          url: `https://www.ebay.com/itm/${published.listingId}`,
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Unknown eBay publish error" };
      }
    },
    async unpublish(listingId: string): Promise<void> {
      const token = await getUserAccessToken();
      await fetch(`${API_BASE}/sell/inventory/v1/offer/${listingId}/withdraw`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  };
}

function mapCondition(condition: string): string {
  const map: Record<string, string> = {
    New: "NEW",
    "Like New": "LIKE_NEW",
    Excellent: "USED_EXCELLENT",
    Good: "USED_GOOD",
    Fair: "USED_ACCEPTABLE",
    "Parts/Repair": "FOR_PARTS_OR_NOT_WORKING",
  };
  return map[condition] || "USED_GOOD";
}
