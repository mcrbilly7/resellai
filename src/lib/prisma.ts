import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // Vercel (and most serverless hosts) have no persistent local filesystem,
  // so a plain SQLite file (DATABASE_URL="file:...") only works for local
  // development. When DATABASE_URL points at Turso instead
  // (libsql://...?authToken=...), route through the libSQL driver adapter —
  // same Prisma models, no other code changes required.
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("libsql://")) {
    const parsed = new URL(url);
    const authToken = parsed.searchParams.get("authToken") ?? undefined;
    parsed.searchParams.delete("authToken");
    const adapter = new PrismaLibSQL({ url: parsed.toString(), authToken });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
