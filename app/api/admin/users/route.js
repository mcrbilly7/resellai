import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";

export async function GET() {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, isAdmin: true, promoOptIn: true, createdAt: true },
  });

  return NextResponse.json({ users });
}
