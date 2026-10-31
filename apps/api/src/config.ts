import { z } from "zod";
import { resolveDatabaseUrl } from "./database-url";

const configSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().url().optional(),
    DB_HOST: z.string().trim().min(1).optional(),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
    DB_NAME: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_]+$/)
      .optional(),
    DB_USER: z.string().trim().min(1).optional(),
    DB_PASSWORD: z.string().min(1).optional(),
    APP_VERSION: z.string().trim().min(1).default("local"),
    CORS_ORIGIN: z.string().trim().optional(),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    AWS_REGION: z.string().trim().min(1).optional(),
    S3_BUCKET: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().trim().min(1).optional(),
    ),
    ASSET_ACCESS_TOKEN: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(32).optional(),
    ),
    MAX_UPLOAD_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(25 * 1024 * 1024)
      .default(5 * 1024 * 1024),
  })
  .superRefine((config, context) => {
    const databaseUrl = resolveDatabaseUrl({
      DATABASE_URL: config.DATABASE_URL,
      DB_HOST: config.DB_HOST,
      DB_PORT: config.DB_PORT.toString(),
      DB_NAME: config.DB_NAME,
      DB_USER: config.DB_USER,
      DB_PASSWORD: config.DB_PASSWORD,
    });
    if (!databaseUrl) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message:
          "or complete DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD values are required",
      });
    } else {
      try {
        const parsedDatabaseUrl = new URL(databaseUrl);
        if (
          !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)
        ) {
          throw new Error("invalid database protocol");
        }
        if (
          config.NODE_ENV === "production" &&
          !["require", "verify-ca", "verify-full"].includes(
            parsedDatabaseUrl.searchParams.get("sslmode") ?? "",
          )
        ) {
          context.addIssue({
            code: "custom",
            path: ["DATABASE_URL"],
            message:
              "must require TLS in production using sslmode=require, verify-ca, or verify-full",
          });
        }
      } catch {
        context.addIssue({
          code: "custom",
          path: ["DATABASE_URL"],
          message: "must be a valid PostgreSQL connection URL",
        });
      }
    }

    if (config.NODE_ENV === "production" && !config.S3_BUCKET) {
      context.addIssue({
        code: "custom",
        path: ["S3_BUCKET"],
        message: "is required in production",
      });
    }

    if (config.S3_BUCKET && !config.ASSET_ACCESS_TOKEN) {
      context.addIssue({
        code: "custom",
        path: ["ASSET_ACCESS_TOKEN"],
        message: "is required when S3_BUCKET is configured",
      });
    }

    if (config.NODE_ENV === "production" && config.APP_VERSION === "local") {
      context.addIssue({
        code: "custom",
        path: ["APP_VERSION"],
        message: "must identify the deployed application version in production",
      });
    }

    if (config.S3_BUCKET && !config.AWS_REGION) {
      context.addIssue({
        code: "custom",
        path: ["AWS_REGION"],
        message: "is required when S3_BUCKET is configured",
      });
    }

    if (config.NODE_ENV === "production" && !config.AWS_REGION) {
      context.addIssue({
        code: "custom",
        path: ["AWS_REGION"],
        message: "is required in production",
      });
    }

    const corsOrigin =
      config.CORS_ORIGIN ??
      (config.NODE_ENV === "production" ? undefined : "http://localhost:3000");
    if (!corsOrigin) {
      context.addIssue({
        code: "custom",
        path: ["CORS_ORIGIN"],
        message: "is required in production",
      });
    }

    for (const origin of corsOrigin?.split(",") ?? []) {
      try {
        const parsed = new URL(origin.trim());
        if (
          !["http:", "https:"].includes(parsed.protocol) ||
          parsed.origin !== origin.trim()
        ) {
          throw new Error("invalid origin");
        }
      } catch {
        context.addIssue({
          code: "custom",
          path: ["CORS_ORIGIN"],
          message: "must be a comma-separated list of HTTP(S) origins",
        });
        break;
      }
    }
  })
  .transform((config) => ({
    ...config,
    DATABASE_URL:
      resolveDatabaseUrl({
        DATABASE_URL: config.DATABASE_URL,
        DB_HOST: config.DB_HOST,
        DB_PORT: config.DB_PORT.toString(),
        DB_NAME: config.DB_NAME,
        DB_USER: config.DB_USER,
        DB_PASSWORD: config.DB_PASSWORD,
      }) ?? "",
    AWS_REGION: config.AWS_REGION ?? "us-east-1",
    CORS_ORIGIN: config.CORS_ORIGIN ?? "http://localhost:3000",
  }));

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const parsed = configSchema.safeParse(environment);
  if (!parsed.success) {
    const invalidKeys = [
      ...new Set(parsed.error.issues.map((issue) => issue.path.join("."))),
    ];
    throw new Error(
      `Invalid application configuration: ${invalidKeys.join(", ")}`,
    );
  }
  if (!parsed.data.DATABASE_URL) {
    throw new Error("Invalid application configuration: DATABASE_URL");
  }
  return parsed.data;
}
