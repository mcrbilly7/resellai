import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionUser, requireSessionUser } from "@/lib/auth";
import { draftBuyerReply } from "@/lib/ai";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const { id } = await params;
  const existing = await prisma.buyerMessage.findUnique({ where: { id }, include: { item: true } });
  if (!existing || existing.userId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const reply = await draftBuyerReply({
    itemName: existing.item.title || existing.item.name,
    listingPrice: existing.item.listingPrice ?? 0,
    buyerName: existing.buyerName,
    buyerMessage: existing.body,
    kind: existing.kind,
    offerAmount: existing.offerAmount,
  });

  return NextResponse.json({ reply });
}
