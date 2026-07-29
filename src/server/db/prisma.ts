import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

export class DatabaseConfigurationError extends Error {
  constructor() {
    super(
      "DATABASE_URL is not configured. Set it to a PostgreSQL connection string before using persistent API routes.",
    );
    this.name = "DatabaseConfigurationError";
  }
}

const globalForPrisma = globalThis as unknown as {
  farmToMarketPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.farmToMarketPrisma) {
    return globalForPrisma.farmToMarketPrisma;
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new DatabaseConfigurationError();
  }

  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.farmToMarketPrisma = client;
  }

  return client;
}

export async function checkDatabaseConnection(): Promise<void> {
  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1`;
}
