import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MARKETPLACES } from "@/lib/marketplaces";

export async function GET() {
  const rows = await prisma.marketplaceConnection.findMany();
  const byName = new Map(rows.map((r) => [r.name, r]));
  const result = MARKETPLACES.map((m) => ({
    ...m,
    connected: byName.get(m.key)?.connected ?? false,
  }));
  return NextResponse.json({ marketplaces: result });
}

export async function POST(request: Request) {
  const { key, connected } = (await request.json()) as { key: string; connected: boolean };
  if (!MARKETPLACES.some((m) => m.key === key)) {
    return NextResponse.json({ error: "Unknown marketplace" }, { status: 400 });
  }
  const feePercent = MARKETPLACES.find((m) => m.key === key)!.feePercent;
  await prisma.marketplaceConnection.upsert({
    where: { name: key },
    update: { connected },
    create: { name: key, connected, feePercent },
  });
  return NextResponse.json({ ok: true });
}
