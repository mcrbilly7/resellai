import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeItem } from "@/lib/serialize";
import { generateSku } from "@/lib/sku";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const where: Prisma.InventoryItemWhereInput = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { brand: { contains: q } },
      { sku: { contains: q } },
      { barcode: { contains: q } },
    ];
  }

  const items = await prisma.inventoryItem.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items: items.map(serializeItem) });
}

export async function POST(request: Request) {
  const body = await request.json();

  const sku = body.sku || generateSku(body.category);

  const item = await prisma.inventoryItem.create({
    data: {
      sku,
      barcode: body.barcode || null,
      name: body.name,
      brand: body.brand || null,
      model: body.model || null,
      category: body.category || null,
      color: body.color || null,
      size: body.size || null,
      material: body.material || null,
      year: body.year || null,
      rarity: body.rarity || null,
      condition: body.condition || null,
      conditionScore: body.conditionScore ?? null,
      conditionReason: body.conditionReason || null,
      aiConfidence: body.aiConfidence ?? null,
      photos: JSON.stringify(body.photos ?? []),
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      purchasePrice: body.purchasePrice ?? null,
      shippingCostEstimate: body.shippingCostEstimate ?? null,
      packagingCost: body.packagingCost ?? null,
      location: body.location || null,
      status: body.status || "purchased",
      msrp: body.msrp ?? null,
      currentRetail: body.currentRetail ?? null,
      avgSoldPrice: body.avgSoldPrice ?? null,
      lowestActive: body.lowestActive ?? null,
      highestSoldPrice: body.highestSoldPrice ?? null,
      fastPrice: body.fastPrice ?? null,
      normalPrice: body.normalPrice ?? null,
      maxPrice: body.maxPrice ?? null,
      listingPrice: body.listingPrice ?? null,
      pricingStrategy: body.pricingStrategy || "normal",
      title: body.title || null,
      description: body.description || null,
      keywords: JSON.stringify(body.keywords ?? []),
      itemSpecifics: JSON.stringify(body.itemSpecifics ?? {}),
      marketplaces: JSON.stringify(body.marketplaces ?? []),
      marketplaceStatus: JSON.stringify(body.marketplaceStatus ?? {}),
    },
  });

  await prisma.activityLog.create({
    data: {
      message: `${item.status === "listed" ? "Listed" : "Saved"} "${item.name}" (${item.sku})`,
      type: item.status === "listed" ? "listing" : "inventory",
      itemId: item.id,
    },
  });

  return NextResponse.json({ item: serializeItem(item) }, { status: 201 });
}
