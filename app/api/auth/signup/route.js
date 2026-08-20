import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { hashPassword, createSessionToken, setSessionCookie } from "../../../../lib/auth";
import { sendEmail } from "../../../../lib/email";

export async function POST(req) {
  const body = await req.json();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const name = (body.name || "").trim();
  const promoOptIn = !!body.promoOptIn;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, promoOptIn },
  });

  const token = createSessionToken(user.id);
  setSessionCookie(token);

  // If any account owner invited this email as a worker before they signed
  // up, link those pending memberships to the new account now.
  try {
    await prisma.membership.updateMany({
      where: { workerEmail: email, workerId: null },
      data: { workerId: user.id, status: "ACTIVE" },
    });
  } catch (e) {
    console.error("Linking pending memberships failed:", e);
  }

  // Best effort - a failed welcome email shouldn't block account creation.
  try {
    await sendEmail({
      to: user.email,
      subject: "Welcome to ResellAI",
      text: "Thanks for signing up for ResellAI!",
      html: "<p>Thanks for signing up for ResellAI" + (user.name ? ", " + user.name : "") + "!</p>",
    });
  } catch (e) {
    console.error("Welcome email failed:", e);
  }

  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
