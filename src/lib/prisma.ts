import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // In production (Vercel serverless), use a minimal pool size to avoid
  // exhausting Supabase's session mode connection limit (15 max).
  // Use DIRECT_URL for direct connection (required by pg adapter).
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!;
  const isProduction = process.env.NODE_ENV === "production";

  const pool = new pg.Pool({
    connectionString,
    max: isProduction ? 2 : 5, // Keep pool small in serverless
    idleTimeoutMillis: isProduction ? 10000 : 30000,
    connectionTimeoutMillis: 10000,
  });

  // Release idle clients aggressively in production
  if (isProduction) {
    pool.on("error", (err) => {
      console.error("Unexpected pool error:", err);
    });
  }

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
