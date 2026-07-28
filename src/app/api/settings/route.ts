import { NextResponse } from "next/server";
import { aiIsConfigured } from "@/lib/ai";
import { emailIsConfigured } from "@/lib/email";
import { isSessionUser, requireSessionUser } from "@/lib/auth";

export async function GET() {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  return NextResponse.json({ aiConfigured: aiIsConfigured(), emailConfigured: emailIsConfigured(), user: session });
}
