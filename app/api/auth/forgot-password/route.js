import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../lib/db";
import { sendEmail } from "../../../../lib/email";

export async function POST(req) {
  const body = await req.json();
  const email = (body.email || "").trim().toLowerCase();
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  // Always return success either way - this avoids revealing which emails
  // have accounts, which is standard practice for "forgot password" flows.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt },
    });

    const resetUrl = (process.env.APP_URL || "http://localhost:3000") + "/reset-password?token=" + rawToken;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your ResellAI password",
        text: "Reset your password: " + resetUrl + " (this link expires in 1 hour)",
        html: "<p>Click the link below to reset your ResellAI password. This link expires in 1 hour.</p><p><a href=\"" + resetUrl + "\">" + resetUrl + "</a></p><p>If you didn't request this, you can ignore this email.</p>",
      });
    } catch (e) {
      console.error("Password reset email failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
