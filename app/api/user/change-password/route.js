import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUserId, hashPassword, verifyPassword } from "../../../../lib/auth";

export async function POST(req) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json();
  const newPassword = body.newPassword || "";
  const currentPassword = body.currentPassword || "";

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  // A forced first-time change (mustChangePassword) skips the current-password
  // check, since the temporary password was handed to them out of band.
  if (!user.mustChangePassword) {
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });

  return NextResponse.json({ ok: true });
}
