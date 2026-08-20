import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";
import { sendEmail } from "../../../../lib/email";

export async function POST(req) {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json();
  const audience = body.audience; // "all" | "promo" | "specific"
  const subject = body.subject || "";
  const message = body.message || "";

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  }

  let recipients = [];
  if (audience === "all") {
    const users = await prisma.user.findMany({ select: { email: true } });
    recipients = users.map((u) => u.email);
  } else if (audience === "promo") {
    const users = await prisma.user.findMany({ where: { promoOptIn: true }, select: { email: true } });
    recipients = users.map((u) => u.email);
  } else {
    recipients = (body.emails || "").split(",").map((e) => e.trim()).filter(Boolean);
  }

  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    try {
      await sendEmail({ to, subject, text: message, html: "<p>" + message.replace(/\n/g, "<br/>") + "</p>" });
      sent++;
    } catch (e) {
      console.error("Failed to send to", to, e);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: recipients.length });
}
