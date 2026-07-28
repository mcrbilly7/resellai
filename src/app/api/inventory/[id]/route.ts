import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeItem } from "@/lib/serialize";
import { computeProfit } from "@/lib/profit";
import { feeForMarketplace } from "@/lib/marketplaces";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: serializeItem(item) });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  const scalarFields = [
    "barcode", "name", "brand", "model", "category", "color", "size", "material", "year", "rarity",
    "condition", "conditionScore", "conditionReason", "aiConfidence", "purchasePrice",
    "shippingCostEstimate", "packagingCost", "location", "status", "msrp", "currentRetail",
    "avgSoldPrice", "lowestActive", "highestSoldPrice", "fastPrice", "normalPrice", "maxPrice",
    "listingPrice", "pricingStrategy", "title", "description", "salePrice", "platformFees",
    "daysListed", "profit", "roi", "profitMargin",
  ];
  for (const field of scalarFields) {
    if (field in body) data[field] = body[field];
  }
  const jsonFields = ["photos", "keywords", "itemSpecifics", "marketplaces", "marketplaceStatus"];
  for (const field of jsonFields) {
    if (field in body) data[field] = JSON.stringify(body[field]);
  }
  if ("purchaseDate" in body) data.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
  if ("soldDate" in body) data.soldDate = body.soldDate ? new Date(body.soldDate) : null;

  // Marking an item sold: compute final profit/ROI/margin from sale price if provided.
  if (body.status === "sold" && typeof body.salePrice === "number") {
    let existingMarketplace: string | undefined;
    try {
      existingMarketplace = JSON.parse(existing.marketplaces)[0];
    } catch {
      existingMarketplace = undefined;
    }
    const marketplace = (body.marketplaces?.[0] as string | undefined) ?? existingMarketplace ?? "ebay";
    const feePercent = feeForMarketplace(marketplace);
    const result = computeProfit({
      salePrice: body.salePrice,
      purchasePrice: existing.purchasePrice ?? 0,
      shippingCost: existing.shippingCostEstimate ?? 0,
      packagingCost: existing.packagingCost ?? 0,
      marketplaceFeePercent: feePercent,
    });
    data.platformFees = result.platformFees;
    data.profit = result.profit;
    data.roi = result.roi;
    data.profitMargin = result.profitMargin;
    data.soldDate = data.soldDate ?? new Date();
    if (existing.createdAt) {
      const days = Math.max(
        0,
        Math.round((Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      );
      data.daysListed = days;
    }
  }

  const item = await prisma.inventoryItem.update({ where: { id }, data });

  if (body.status && body.status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        message: `"${item.name}" moved to ${body.status.replace("_", " ")}`,
        type: "status",
        itemId: item.id,
      },
    });
  }

  return NextResponse.json({ item: serializeItem(item) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.inventoryItem.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { message: `Deleted "${existing.name}" (${existing.sku})`, type: "inventory" },
  });
  return NextResponse.json({ ok: true });
}
