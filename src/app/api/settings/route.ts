import { NextResponse } from "next/server";
import { aiIsConfigured } from "@/lib/ai";

export async function GET() {
  return NextResponse.json({ aiConfigured: aiIsConfigured() });
}
