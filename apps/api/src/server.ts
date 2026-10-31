import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { config as loadDotenv } from "dotenv";
import pino from "pino";
import { createApp } from "./app";
import { loadConfig } from "./config";
import { PrismaAssetRepository } from "./repositories/asset-repository";
import { PrismaReleaseRepository } from "./repositories/release-repository";
import { createPrismaClient } from "./prisma";
import { S3ObjectStorage } from "./services/s3-object-storage";
import { AssetService } from "./services/asset-service";
import { ReleaseService } from "./services/release-service";

const envPath = resolve(__dirname, "../../../.env");
if (existsSync(envPath)) {
  const result = loadDotenv({ path: envPath });
  if (result.error) {
    throw result.error;
  }
}

const config = loadConfig();
const prisma = createPrismaClient(config.DATABASE_URL, config.NODE_ENV);
const storage = config.S3_BUCKET
  ? new S3ObjectStorage(config.AWS_REGION, config.S3_BUCKET)
  : undefined;
const assetService = storage
  ? new AssetService(
      new PrismaAssetRepository(prisma),
      storage,
      config.MAX_UPLOAD_BYTES,
    )
  : undefined;
const logger = pino({ level: config.LOG_LEVEL });
const app = createApp({
  config,
  releaseService: new ReleaseService(new PrismaReleaseRepository(prisma)),
  assetService,
  assetAccessToken: config.ASSET_ACCESS_TOKEN,
  maxUploadBytes: config.MAX_UPLOAD_BYTES,
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
});
const server = createServer(app);

server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.listen(config.API_PORT, () => {
  logger.info({ port: config.API_PORT }, "ReleaseKit API listening");
});

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, "Graceful shutdown started");
  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, "HTTP server failed to close cleanly");
      process.exitCode = 1;
    }
    try {
      await prisma.$disconnect();
      logger.info("Database connection closed");
    } catch (disconnectError) {
      logger.error(
        { err: disconnectError },
        "Database connection failed to close",
      );
      process.exitCode = 1;
    } finally {
      storage?.destroy();
    }
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
