import { Prisma } from "@prisma/client";
import cors from "cors";
import express, { type ErrorRequestHandler, type Express } from "express";
import helmet from "helmet";
import { MulterError } from "multer";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import type { AppConfig } from "./config";
import { AppError } from "./errors";
import type { AssetService } from "./services/asset-service";
import { createReleaseRouter } from "./routes/releases";
import type { ReleaseService } from "./services/release-service";

export interface AppDependencies {
  config: Pick<
    AppConfig,
    "NODE_ENV" | "CORS_ORIGIN" | "APP_VERSION" | "LOG_LEVEL"
  >;
  releaseService: ReleaseService;
  assetService?: AssetService;
  assetAccessToken?: string;
  maxUploadBytes?: number;
  checkDatabase: () => Promise<void>;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  const allowedOrigins = new Set(
    dependencies.config.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  );

  app.disable("x-powered-by");
  app.use(
    pinoHttp({
      level: dependencies.config.LOG_LEVEL,
      genReqId: (_request, response) => {
        const requestId = randomUUID();
        response.setHeader("x-request-id", requestId);
        return requestId;
      },
      serializers: {
        req: (request) => ({
          id: request.id,
          method: request.method,
          url: request.url?.split("?")[0],
        }),
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(
          new AppError(403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed"),
        );
      },
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "1mb", strict: true }));

  const api = express.Router();
  api.get("/health", (_request, response) => {
    response.json({ data: { status: "ok" } });
  });
  api.get("/ready", async (request, response, next) => {
    try {
      await dependencies.checkDatabase();
      response.json({ data: { status: "ready" } });
    } catch {
      request.log.warn({ dependency: "database" }, "Readiness check failed");
      next(
        new AppError(503, "NOT_READY", "Required dependencies are unavailable"),
      );
    }
  });
  api.get("/version", (_request, response) => {
    response.json({ data: { version: dependencies.config.APP_VERSION } });
  });
  api.use(
    "/releases",
    createReleaseRouter(
      dependencies.releaseService,
      dependencies.assetService,
      dependencies.assetAccessToken,
      dependencies.maxUploadBytes,
    ),
  );
  app.use("/api/v1", api);

  app.use((_request, _response, next) => {
    next(new AppError(404, "ROUTE_NOT_FOUND", "Route not found"));
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    request,
    response,
    _next,
  ) => {
    let appError = error instanceof AppError ? error : undefined;
    const parserErrorType =
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      typeof error.type === "string"
        ? error.type
        : undefined;
    if (error instanceof MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      appError = new AppError(
        tooLarge ? 413 : 400,
        tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_MULTIPART",
        tooLarge
          ? "Uploaded file exceeds the allowed size"
          : "Multipart upload is invalid",
      );
    }
    if (parserErrorType === "entity.parse.failed") {
      appError = new AppError(
        400,
        "INVALID_JSON",
        "Request body must contain valid JSON",
      );
    } else if (parserErrorType === "entity.too.large") {
      appError = new AppError(
        413,
        "PAYLOAD_TOO_LARGE",
        "Request body exceeds the allowed size",
      );
    } else if (parserErrorType?.startsWith("LIMIT_")) {
      appError = new AppError(
        413,
        "PAYLOAD_TOO_LARGE",
        "The uploaded file exceeds the allowed limits",
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        appError = new AppError(404, "RELEASE_NOT_FOUND", "Release not found");
      } else if (error.code === "P2002") {
        appError = new AppError(
          409,
          "RESOURCE_CONFLICT",
          "The requested resource conflicts with existing data",
        );
      } else if (error.code === "P2003") {
        appError = new AppError(
          409,
          "RESOURCE_CONFLICT",
          "The requested operation conflicts with related data",
        );
      }
    }
    if (!appError) {
      request.log.error(
        { errorType: error instanceof Error ? error.name : typeof error },
        "Unhandled request error",
      );
      appError = new AppError(
        500,
        "INTERNAL_ERROR",
        "An unexpected error occurred",
      );
    }

    response.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        requestId: request.id,
        ...(appError.statusCode === 400 && appError.details !== undefined
          ? { details: appError.details }
          : {}),
      },
    });
  };
  app.use(errorHandler);

  return app;
}
