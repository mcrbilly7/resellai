import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionUser, requireSessionUser } from "@/lib/auth";
import { generateTaxSummary } from "@/lib/ai";

export async function GET(request: Request) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year")) || new Date().getFullYear();

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const sold = await prisma.inventoryItem.findMany({
    where: { userId: session.id, status: "sold", soldDate: { gte: start, lt: end } },
    select: {
      salePrice: true,
      purchasePrice: true,
      platformFees: true,
      shippingCostEstimate: true,
      packagingCost: true,
      profit: true,
    },
  });

  const grossSales = sold.reduce((s, i) => s + (i.salePrice ?? 0), 0);
  const costOfGoods = sold.reduce((s, i) => s + (i.purchasePrice ?? 0), 0);
  const fees = sold.reduce((s, i) => s + (i.platformFees ?? 0), 0);
  const shippingPackaging = sold.reduce((s, i) => s + (i.shippingCostEstimate ?? 0) + (i.packagingCost ?? 0), 0);
  const netProfit = sold.reduce((s, i) => s + (i.profit ?? 0), 0);

  const params = { year, grossSales, costOfGoods, fees, shippingPackaging, netProfit, itemCount: sold.length };
  const summary = await generateTaxSummary(params);

  return NextResponse.json({ ...params, summary });
}
