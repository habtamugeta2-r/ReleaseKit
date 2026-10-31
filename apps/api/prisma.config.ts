import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "prisma/config";
import { resolveDatabaseUrl } from "./src/database-url";

loadDotenv({ path: resolve(import.meta.dirname, "../../.env") });

const isMigrationCommand = process.argv.some(
  (argument) => argument === "migrate",
);
const databaseUrl = resolveDatabaseUrl(process.env);

if (isMigrationCommand && !databaseUrl) {
  throw new Error(
    "DATABASE_URL must be configured before running Prisma migrations.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url:
      databaseUrl ??
      "postgresql://releasekit:build-only@localhost:5432/releasekit",
  },
});
