import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // Prisma validates the schema's `datasource db { url }` against the
  // provider's own protocol (sqlite -> must start with "file:") at client
  // *runtime*, regardless of whether an adapter is supplied — so
  // DATABASE_URL must stay a "file:" value always (see prisma/schema.prisma
  // and .env.example). The real Turso connection, when deploying somewhere
  // with no persistent disk (e.g. Vercel), goes through these two separate
  // env vars instead, consumed only here — never by the Prisma schema/CLI.
  if (process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
