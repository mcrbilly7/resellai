import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "../../../../lib/auth";

export async function POST(req) {
  const body = await req.json();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (e) {
    console.error("Login DB error:", e);
    return NextResponse.json({ error: "Server error. Please try again shortly." }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = createSessionToken(user.id);
  setSessionCookie(token);

  return NextResponse.json({ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin, mustChangePassword: user.mustChangePassword });
}
