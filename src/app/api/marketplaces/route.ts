import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MARKETPLACES } from "@/lib/marketplaces";
import { isSessionUser, requireSessionUser } from "@/lib/auth";

export async function GET() {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const rows = await prisma.marketplaceConnection.findMany({ where: { userId: session.id } });
  const byName = new Map(rows.map((r) => [r.name, r]));
  const result = MARKETPLACES.map((m) => ({
    ...m,
    connected: byName.get(m.key)?.connected ?? false,
  }));
  return NextResponse.json({ marketplaces: result });
}

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const { key, connected } = (await request.json()) as { key: string; connected: boolean };
  if (!MARKETPLACES.some((m) => m.key === key)) {
    return NextResponse.json({ error: "Unknown marketplace" }, { status: 400 });
  }
  const feePercent = MARKETPLACES.find((m) => m.key === key)!.feePercent;
  await prisma.marketplaceConnection.upsert({
    where: { userId_name: { userId: session.id, name: key } },
    update: { connected },
    create: { userId: session.id, name: key, connected, feePercent },
  });
  return NextResponse.json({ ok: true });
}
