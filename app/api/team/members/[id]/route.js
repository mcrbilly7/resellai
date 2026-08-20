import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { getSessionUserId } from "../../../../../lib/auth";

async function ownedMembershipOrNull(id, ownerId) {
  const m = await prisma.membership.findUnique({ where: { id } });
  return m && m.ownerId === ownerId ? m : null;
}

export async function PATCH(req, { params }) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const existing = await ownedMembershipOrNull(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json();
  const data = {};
  if (typeof body.role === "string") data.role = body.role;
  if (typeof body.canViewInventory === "boolean") data.canViewInventory = body.canViewInventory;
  if (typeof body.canEditInventory === "boolean") data.canEditInventory = body.canEditInventory;
  if (typeof body.canBuy === "boolean") data.canBuy = body.canBuy;
  if (typeof body.canSell === "boolean") data.canSell = body.canSell;
  if (typeof body.canViewEarnings === "boolean") data.canViewEarnings = body.canViewEarnings;
  if (body.status === "ACTIVE" || body.status === "BLOCKED") {
    // Can't reactivate someone who never actually signed up yet.
    if (body.status === "ACTIVE" && !existing.workerId && existing.status === "INVITED") {
      return NextResponse.json({ error: "This person hasn't signed up yet, so they can't be activated." }, { status: 400 });
    }
    data.status = body.status;
  }

  const member = await prisma.membership.update({ where: { id: params.id }, data });
  return NextResponse.json({ member });
}

export async function DELETE(req, { params }) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const existing = await ownedMembershipOrNull(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.membership.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
