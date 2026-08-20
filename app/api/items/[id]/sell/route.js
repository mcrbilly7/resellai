import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { getSessionUserId } from "../../../../../lib/auth";
import { getAccessContext, scrubItem } from "../../../../../lib/permissions";

export async function POST(req, { params }) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const item = await prisma.item.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const access = await getAccessContext(userId, item.ownerId);
  if (!access || !access.canSell) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const remaining = Math.max(0, item.quantity - item.quantitySold);
  const body = await req.json();
  const qty = Math.min(remaining, Math.max(1, Number(body.quantity) || 1));
  if (qty <= 0) return NextResponse.json({ error: "Nothing left in stock to sell." }, { status: 400 });

  const newSold = item.quantitySold + qty;
  const data = {
    quantitySold: newSold,
    status: newSold >= item.quantity ? "Sold" : item.status,
  };
  if (access.canViewEarnings && body.salePrice != null) {
    data.salePrice = (item.salePrice || 0) + Number(body.salePrice);
  }

  const updated = await prisma.item.update({ where: { id: params.id }, data });
  return NextResponse.json({ item: scrubItem(updated, access) });
}
