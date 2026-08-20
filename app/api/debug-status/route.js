import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

// Temporary diagnostic route for tracking down the "every signup says
// already registered" bug. Reports facts, not guesses - no emails or
// secrets, safe to leave public short-term. Delete once the bug is fixed.
export async function GET() {
  const url = process.env.DATABASE_URL || "";
  const info = {
    databaseUrlSet: !!url,
    databaseUrlLooksPooled: url.includes("-pooler") || url.includes("pgbouncer"),
    databaseUrlHasPgbouncerFlag: /[?&]pgbouncer=true/.test(url),
  };

  try {
    const userCount = await prisma.user.count();
    const probeEmail = `debug-probe-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
    const shouldBeNull = await prisma.user.findUnique({ where: { email: probeEmail } });
    const dbInfo = await prisma.$queryRawUnsafe("select current_database() as db, inet_server_addr()::text as host");

    return NextResponse.json({
      ok: true,
      ...info,
      userCount,
      probeEmail,
      probeFoundSomethingItShouldnt: shouldBeNull !== null,
      probeResult: shouldBeNull,
      dbInfo,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, ...info, error: String(e && e.message || e) }, { status: 500 });
  }
}
