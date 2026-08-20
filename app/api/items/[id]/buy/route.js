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
  if (!access || !access.canBuy) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json();
  const qty = Math.max(1, Number(body.quantity) || 1);

  const data = { quantity: item.quantity + qty };
  if (access.canViewEarnings && body.purchasePrice != null) {
    data.purchasePrice = (item.purchasePrice || 0) + Number(body.purchasePrice);
  }

  const updated = await prisma.item.update({ where: { id: params.id }, data });
  return NextResponse.json({ item: scrubItem(updated, access) });
}
