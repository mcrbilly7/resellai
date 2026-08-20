import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getSessionUserId } from "../../../lib/auth";
import { getAccessContext, scrubItem } from "../../../lib/permissions";

export async function GET(req) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const ownerId = new URL(req.url).searchParams.get("ownerId") || userId;
  const access = await getAccessContext(userId, ownerId);
  if (!access || !access.canViewInventory) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const items = await prisma.item.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items: items.map((i) => scrubItem(i, access)), access });
}

export async function POST(req) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const ownerId = body.ownerId || userId;
  const access = await getAccessContext(userId, ownerId);
  if (!access || !(access.canEditInventory || access.canBuy)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const me = await prisma.user.findUnique({ where: { id: userId } });
  const item = await prisma.item.create({
    data: {
      ownerId,
      title: body.title || "Untitled item",
      description: body.description || "",
      category: body.category || "",
      status: body.status || "Draft",
      location: body.location || "",
      quantity: Number(body.quantity) || 1,
      purchasePrice: body.purchasePrice != null ? Number(body.purchasePrice) : null,
      estValue: body.estValue != null ? Number(body.estValue) : null,
      createdByEmail: me?.email || null,
    },
  });

  return NextResponse.json({ item: scrubItem(item, access) });
}
