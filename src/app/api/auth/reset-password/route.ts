import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken, hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const { token, password } = (await request.json()) as { token?: string; password?: string };
  if (!token || !password) {
    return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true });
}
