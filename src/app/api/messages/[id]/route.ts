import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSessionUser, requireSessionUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const { id } = await params;
  const existing = await prisma.buyerMessage.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as { reply?: string; status?: string };
  const message = await prisma.buyerMessage.update({
    where: { id },
    data: {
      ...(body.reply !== undefined ? { reply: body.reply } : {}),
      ...(body.status !== undefined ? { status: body.status } : { status: body.reply ? "replied" : existing.status }),
    },
  });

  return NextResponse.json({ message });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireSessionUser();
  if (!isSessionUser(session)) return session;

  const { id } = await params;
  const existing = await prisma.buyerMessage.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.buyerMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
