import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUserId } from "../../../../lib/auth";
import { sendEmail } from "../../../../lib/email";
import { ROLE_PRESETS } from "../../../../lib/roles";

export async function GET() {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const members = await prisma.membership.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { worker: { select: { name: true } } },
  });

  return NextResponse.json({ members });
}

export async function POST(req) {
  const userId = getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const email = (body.email || "").trim().toLowerCase();
  const role = ROLE_PRESETS[body.role] ? body.role : "VIEWER";
  const preset = ROLE_PRESETS[role];

  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (email === (await prisma.user.findUnique({ where: { id: userId } }))?.email) {
    return NextResponse.json({ error: "You can't add yourself as a worker." }, { status: 400 });
  }

  const existing = await prisma.membership.findUnique({ where: { ownerId_workerEmail: { ownerId: userId, workerEmail: email } } });
  if (existing) return NextResponse.json({ error: "That person is already on your team." }, { status: 400 });

  const workerAccount = await prisma.user.findUnique({ where: { email } });

  const member = await prisma.membership.create({
    data: {
      ownerId: userId,
      workerEmail: email,
      workerId: workerAccount ? workerAccount.id : null,
      role,
      canViewInventory: preset.canViewInventory,
      canEditInventory: preset.canEditInventory,
      canBuy: preset.canBuy,
      canSell: preset.canSell,
      canViewEarnings: false,
      status: workerAccount ? "ACTIVE" : "INVITED",
    },
  });

  const owner = await prisma.user.findUnique({ where: { id: userId } });
  try {
    await sendEmail({
      to: email,
      subject: (owner.name || owner.email) + " added you as a worker on ResellAI",
      text: workerAccount
        ? "You've been given " + preset.label + " access to " + (owner.name || owner.email) + "'s ResellAI account."
        : "You've been invited to work on " + (owner.name || owner.email) + "'s ResellAI account. Sign up with this email address to get access: " + (process.env.APP_URL || "") + "/signup",
      html: workerAccount
        ? "<p>You've been given <strong>" + preset.label + "</strong> access to " + (owner.name || owner.email) + "'s ResellAI account.</p>"
        : "<p>You've been invited to work on " + (owner.name || owner.email) + "'s ResellAI account.</p><p>Sign up with this email address to get access: <a href=\"" + (process.env.APP_URL || "") + "/signup\">" + (process.env.APP_URL || "") + "/signup</a></p>",
    });
  } catch (e) {
    console.error("Worker invite email failed:", e);
  }

  return NextResponse.json({ member });
}
