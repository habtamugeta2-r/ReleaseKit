import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { DATABASE_POOL_MAX } from "./database-url";

export function createPrismaClient(
  databaseUrl: string,
  environment: string,
): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: DATABASE_POOL_MAX,
  });
  return new PrismaClient({
    adapter,
    log: environment === "development" ? ["warn", "error"] : ["error"],
  });
}
