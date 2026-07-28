import type { InventoryItem } from "@prisma/client";

export function serializeItem(item: InventoryItem) {
  return {
    ...item,
    photos: safeParse<string[]>(item.photos, []),
    keywords: safeParse<string[]>(item.keywords, []),
    itemSpecifics: safeParse<Record<string, string>>(item.itemSpecifics, {}),
    marketplaces: safeParse<string[]>(item.marketplaces, []),
    marketplaceStatus: safeParse<Record<string, string>>(item.marketplaceStatus, {}),
  };
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
