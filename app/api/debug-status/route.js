import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

// Temporary diagnostic route for tracking down the "every signup says
// already registered" bug. Reports facts, not guesses - no emails or
// secrets, safe to leave public short-term. Delete once the bug is fixed.
export async function GET(req) {
  const url = process.env.DATABASE_URL || "";
  const info = {
    databaseUrlSet: !!url,
    databaseUrlLooksPooled: url.includes("-pooler") || url.includes("pgbouncer"),
    databaseUrlHasPgbouncerFlag: /[?&]pgbouncer=true/.test(url),
  };

  const requestedEmail = new URL(req.url).searchParams.get("email");

  try {
    const userCount = await prisma.user.count();
    const probeEmail = `debug-probe-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
    const shouldBeNull = await prisma.user.findUnique({ where: { email: probeEmail } });
    const dbInfo = await prisma.$queryRawUnsafe("select current_database() as db, inet_server_addr()::text as host");

    let lookup = null;
    if (requestedEmail) {
      const normalized = requestedEmail.trim().toLowerCase();
      // Exact query the signup route runs, so we see what it actually sees.
      const found = await prisma.user.findUnique({ where: { email: normalized } });
      // Also check for near-duplicates a naive email match wouldn't catch.
      const allEmails = await prisma.user.findMany({ select: { id: true, email: true, createdAt: true } });
      lookup = {
        normalized,
        exactMatch: found ? { id: found.id, createdAt: found.createdAt } : null,
        allEmailsInDb: allEmails,
      };
    }

    return NextResponse.json({
      ok: true,
      ...info,
      userCount,
      probeEmail,
      probeFoundSomethingItShouldnt: shouldBeNull !== null,
      probeResult: shouldBeNull,
      dbInfo,
      lookup,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, ...info, error: String(e && e.message || e) }, { status: 500 });
  }
}
