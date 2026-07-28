import { NextResponse } from "next/server";
import { generateListing } from "@/lib/ai";
import { isSessionUser, requireSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const item = (await request.json()) as {
    name: string;
    brand?: string | null;
    model?: string | null;
    category?: string | null;
    color?: string | null;
    size?: string | null;
    material?: string | null;
    year?: string | null;
    condition: string;
    conditionReason?: string | null;
    price: number;
  };

  if (!item?.name || !item?.condition) {
    return NextResponse.json({ error: "name and condition are required" }, { status: 400 });
  }

  try {
    const listing = await generateListing(item);
    return NextResponse.json({ listing });
  } catch (err) {
    console.error("listing generation failed", err);
    return NextResponse.json({ error: "Listing generation failed. Please try again." }, { status: 500 });
  }
}
