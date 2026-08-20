import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUserId, clearSessionCookie } from "../../../../lib/auth";

export async function POST() {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await prisma.user.delete({ where: { id: userId } });
  clearSessionCookie();

  return NextResponse.json({ ok: true });
}
