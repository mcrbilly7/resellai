import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askAssistant } from "@/lib/ai";

export async function POST(request: Request) {
  const { question } = (await request.json()) as { question?: string };
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });

  const [items, sold] = await Promise.all([
    prisma.inventoryItem.findMany({
      select: { category: true, brand: true, status: true, profit: true, listingPrice: true, marketplaces: true },
    }),
    prisma.inventoryItem.findMany({
      where: { status: "sold" },
      select: { profit: true, category: true, brand: true },
    }),
  ]);

  const totalValue = items.reduce((sum, i) => sum + (i.listingPrice ?? 0), 0);
  const totalProfit = sold.reduce((sum, i) => sum + (i.profit ?? 0), 0);
  const byCategory = new Map<string, number>();
  for (const i of sold) {
    if (!i.category) continue;
    byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + (i.profit ?? 0));
  }
  const bestCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  const context = [
    `Total items in inventory: ${items.length}`,
    `Estimated inventory value: $${totalValue.toFixed(2)}`,
    `Items sold: ${sold.length}, total profit: $${totalProfit.toFixed(2)}`,
    bestCategory ? `Most profitable category: ${bestCategory[0]} ($${bestCategory[1].toFixed(2)} profit)` : "No sales yet.",
  ].join("\n");

  const answer = await askAssistant(question, context);
  return NextResponse.json({ answer });
}
