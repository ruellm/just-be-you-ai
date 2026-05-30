import { PrismaClient } from "@prisma/client";

// Prisma client singleton. In dev, Next.js hot-reloading would otherwise
// create a new client on every reload and exhaust the database connections.
// We stash the instance on globalThis so it survives reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
