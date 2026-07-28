import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionUser, requireSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const messages = await prisma.buyerMessage.findMany({
    where: { userId: session.id, ...(status ? { status } : {}) },
    include: { item: { select: { id: true, name: true, title: true, listingPrice: true, photos: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({ ...m, item: { ...m.item, photos: JSON.parse(m.item.photos || "[]") } })),
  });
}

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const body = (await request.json()) as {
    itemId: string;
    marketplace: string;
    buyerName: string;
    body: string;
    kind?: string;
    offerAmount?: number | null;
  };

  if (!body.itemId || !body.buyerName || !body.body) {
    return NextResponse.json({ error: "itemId, buyerName, and body are required" }, { status: 400 });
  }

  const item = await prisma.inventoryItem.findUnique({ where: { id: body.itemId } });
  if (!item || item.userId !== session.id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  let itemMarketplace: string | undefined;
  try {
    itemMarketplace = JSON.parse(item.marketplaces || "[]")[0];
  } catch {
    itemMarketplace = undefined;
  }

  const message = await prisma.buyerMessage.create({
    data: {
      userId: session.id,
      itemId: item.id,
      marketplace: body.marketplace || itemMarketplace || "ebay",
      buyerName: body.buyerName,
      body: body.body,
      kind: body.kind || "question",
      offerAmount: body.offerAmount ?? null,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
