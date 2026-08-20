import { PrismaClient } from "@prisma/client";

// Prevents creating a new PrismaClient on every hot-reload / serverless
// invocation, which would otherwise exhaust database connections.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
