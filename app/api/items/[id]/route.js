import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUserId } from "../../../../lib/auth";
import { getAccessContext, scrubItem } from "../../../../lib/permissions";

async function loadItemAndAccess(itemId, userId) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return { item: null, access: null };
  const access = await getAccessContext(userId, item.ownerId);
  return { item, access };
}

export async function PATCH(req, { params }) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { item, access } = await loadItemAndAccess(params.id, userId);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!access || !access.canEditInventory) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json();
  const data = {};
  for (const key of ["title", "description", "category", "status", "location"]) {
    if (typeof body[key] === "string") data[key] = body[key];
  }
  for (const key of ["quantity", "quantitySold"]) {
    if (body[key] != null) data[key] = Number(body[key]);
  }
  if (access.canViewEarnings) {
    for (const key of ["purchasePrice", "salePrice", "estValue"]) {
      if (body[key] != null) data[key] = Number(body[key]);
    }
  } else if (body.estValue != null) {
    data.estValue = Number(body.estValue);
  }

  const updated = await prisma.item.update({ where: { id: params.id }, data });
  return NextResponse.json({ item: scrubItem(updated, access) });
}

export async function DELETE(req, { params }) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { item, access } = await loadItemAndAccess(params.id, userId);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!access || !access.canEditInventory) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  await prisma.item.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
