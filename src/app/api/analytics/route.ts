import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MARKETPLACES } from "@/lib/marketplaces";

export async function GET() {
  const sold = await prisma.inventoryItem.findMany({
    where: { status: "sold" },
    select: {
      salePrice: true,
      profit: true,
      daysListed: true,
      brand: true,
      category: true,
      marketplaces: true,
      soldDate: true,
    },
  });

  const active = await prisma.inventoryItem.findMany({
    where: { status: { notIn: ["sold", "archived"] } },
    select: { listingPrice: true, purchasePrice: true },
  });

  const revenue = sold.reduce((s, i) => s + (i.salePrice ?? 0), 0);
  const profit = sold.reduce((s, i) => s + (i.profit ?? 0), 0);
  const itemsSold = sold.length;
  const avgSalePrice = itemsSold > 0 ? revenue / itemsSold : 0;
  const avgDaysListed =
    itemsSold > 0 ? sold.reduce((s, i) => s + (i.daysListed ?? 0), 0) / itemsSold : 0;
  const inventoryValue = active.reduce((s, i) => s + (i.listingPrice ?? i.purchasePrice ?? 0), 0);

  const byBrand = aggregate(sold, (i) => i.brand, (i) => i.profit ?? 0);
  const byCategory = aggregate(sold, (i) => i.category, (i) => i.profit ?? 0);

  const marketplaceCounts = new Map<string, number>();
  for (const i of sold) {
    let list: string[] = [];
    try {
      list = JSON.parse(i.marketplaces);
    } catch {
      list = [];
    }
    const primary = list[0];
    if (primary) marketplaceCounts.set(primary, (marketplaceCounts.get(primary) ?? 0) + 1);
  }
  const bestMarketplace = [...marketplaceCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const monthly = new Map<string, { revenue: number; profit: number }>();
  for (const i of sold) {
    if (!i.soldDate) continue;
    const key = i.soldDate.toISOString().slice(0, 7);
    const entry = monthly.get(key) ?? { revenue: 0, profit: 0 };
    entry.revenue += i.salePrice ?? 0;
    entry.profit += i.profit ?? 0;
    monthly.set(key, entry);
  }
  const monthlySeries = [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  return NextResponse.json({
    revenue,
    profit,
    itemsSold,
    avgSalePrice,
    avgDaysListed,
    inventoryValue,
    byBrand: topN(byBrand, 5),
    byCategory: topN(byCategory, 6),
    bestMarketplace: bestMarketplace
      ? { name: MARKETPLACES.find((m) => m.key === bestMarketplace[0])?.name ?? bestMarketplace[0], count: bestMarketplace[1] }
      : null,
    monthlySeries,
  });
}

function aggregate<T>(rows: T[], key: (row: T) => string | null, value: (row: T) => number) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + value(row));
  }
  return map;
}

function topN(map: Map<string, number>, n: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
}
