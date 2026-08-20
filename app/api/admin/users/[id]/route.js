import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { getSessionUser } from "../../../../../lib/auth";

export async function PATCH(req, { params }) {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json();
  const data = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.email === "string") data.email = body.email.trim().toLowerCase();
  if (typeof body.isAdmin === "boolean") data.isAdmin = body.isAdmin;
  if (typeof body.promoOptIn === "boolean") data.promoOptIn = body.promoOptIn;

  const user = await prisma.user.update({ where: { id: params.id }, data });
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, promoOptIn: user.promoOptIn },
  });
}

export async function DELETE(req, { params }) {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (params.id === me.id) {
    return NextResponse.json({ error: "You can't delete your own account from the admin panel." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
