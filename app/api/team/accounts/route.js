import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUserId } from "../../../../lib/auth";

export async function GET() {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const memberships = await prisma.membership.findMany({
    where: { workerId: userId, status: "ACTIVE" },
    include: { owner: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const accounts = memberships.map((m) => ({
    ownerId: m.ownerId,
    ownerName: m.owner.name,
    ownerEmail: m.owner.email,
    role: m.role,
    canViewInventory: m.canViewInventory,
    canEditInventory: m.canEditInventory,
    canBuy: m.canBuy,
    canSell: m.canSell,
    canViewEarnings: m.canViewEarnings,
  }));

  return NextResponse.json({ accounts });
}
