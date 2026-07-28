import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeItem } from "@/lib/serialize";
import { isSessionUser, requireSessionUser } from "@/lib/auth";
import { getPublisher } from "@/lib/marketplace-publishers";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const { id } = await params;
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as { marketplaces?: string[] };
  const marketplaces = body.marketplaces?.length ? body.marketplaces : JSON.parse(existing.marketplaces || "[]");
  if (!marketplaces || marketplaces.length === 0) {
    return NextResponse.json({ error: "Select at least one marketplace" }, { status: 400 });
  }
  if (!existing.title || !existing.listingPrice) {
    return NextResponse.json({ error: "Item needs a title and listing price before publishing" }, { status: 400 });
  }

  const marketplaceStatus: Record<string, string> = {};
  const marketplaceListings: Record<string, { listingId?: string; url?: string; error?: string }> = {};

  for (const marketplace of marketplaces as string[]) {
    const publisher = getPublisher(marketplace);
    const result = await publisher.publish({
      marketplace,
      sku: existing.sku,
      title: existing.title,
      description: existing.description ?? "",
      price: existing.listingPrice,
      quantity: 1,
      condition: existing.condition ?? "Good",
      category: existing.category,
      itemSpecifics: JSON.parse(existing.itemSpecifics || "{}"),
      photos: JSON.parse(existing.photos || "[]"),
    });

    if (result.ok) {
      marketplaceStatus[marketplace] = publisher.isLive ? "published" : "published (demo)";
      marketplaceListings[marketplace] = { listingId: result.listingId, url: result.url };
    } else {
      marketplaceStatus[marketplace] = "error";
      marketplaceListings[marketplace] = { error: result.error };
    }
  }

  const anySucceeded = Object.values(marketplaceStatus).some((s) => s.startsWith("published"));

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      status: anySucceeded ? "listed" : existing.status,
      marketplaces: JSON.stringify(marketplaces),
      marketplaceStatus: JSON.stringify(marketplaceStatus),
      marketplaceListings: JSON.stringify(marketplaceListings),
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.id,
      itemId: item.id,
      type: anySucceeded ? "listing" : "error",
      message: anySucceeded
        ? `Published "${item.name}" to ${marketplaces.join(", ")}`
        : `Failed to publish "${item.name}" — ${Object.values(marketplaceListings)[0]?.error ?? "unknown error"}`,
    },
  });

  return NextResponse.json({ item: serializeItem(item), marketplaceStatus, marketplaceListings });
}
