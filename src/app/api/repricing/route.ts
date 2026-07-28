import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionUser, requireSessionUser } from "@/lib/auth";
import { computeRepricingSuggestions } from "@/lib/repricing";

export async function GET() {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const items = await prisma.inventoryItem.findMany({
    where: { userId: session.id, status: "listed" },
    select: {
      id: true, name: true, status: true, listingPrice: true, fastPrice: true, normalPrice: true,
      maxPrice: true, pricingStrategy: true, createdAt: true,
    },
  });

  return NextResponse.json({ suggestions: computeRepricingSuggestions(items) });
}
