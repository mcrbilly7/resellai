import { NextResponse } from "next/server";
import { extractReceiptItems } from "@/lib/ai";
import { isSessionUser, requireSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const { images } = (await request.json()) as { images?: string[] };
  if (!images || images.length === 0) {
    return NextResponse.json({ error: "At least one receipt photo is required" }, { status: 400 });
  }

  try {
    const receipt = await extractReceiptItems(images);
    return NextResponse.json({ receipt });
  } catch (err) {
    console.error("receipt scan failed", err);
    return NextResponse.json({ error: "Receipt scan failed. Please try again." }, { status: 500 });
  }
}
