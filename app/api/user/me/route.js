import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUserId } from "../../../../lib/auth";

export async function GET() {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    id: user.id, name: user.name, email: user.email,
    promoOptIn: user.promoOptIn, isAdmin: user.isAdmin, mustChangePassword: user.mustChangePassword,
  });
}

export async function PATCH(req) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const data = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.promoOptIn === "boolean") data.promoOptIn = body.promoOptIn;

  const user = await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, promoOptIn: user.promoOptIn });
}
