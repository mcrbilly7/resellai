import { NextResponse } from "next/server";
import { identifyProduct } from "@/lib/ai";
import { computePricingTiers } from "@/lib/pricing";

export async function POST(request: Request) {
  const body = (await request.json()) as { images?: string[]; barcode?: string; note?: string };
  const images = body.images ?? [];
  if (images.length === 0) {
    return NextResponse.json({ error: "At least one photo is required" }, { status: 400 });
  }

  try {
    const analysis = await identifyProduct(images, { barcode: body.barcode, note: body.note });
    const tiers = computePricingTiers({
      msrp: analysis.msrp,
      currentRetail: analysis.currentRetail,
      avgSoldPrice: analysis.avgSoldPrice,
      lowestActive: analysis.lowestActive,
      highestSoldPrice: analysis.highestSoldPrice,
      conditionScore: analysis.conditionScore,
      rarity: analysis.rarity,
    });

    return NextResponse.json({ analysis, tiers });
  } catch (err) {
    console.error("analyze failed", err);
    return NextResponse.json({ error: "AI analysis failed. Please try again." }, { status: 500 });
  }
}
