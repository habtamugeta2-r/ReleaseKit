import { Prisma, ReleaseStatus, type Release } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { AppConfig } from "../src/config";
import type { AssetRepository } from "../src/repositories/asset-repository";
import type {
  ReleaseListOptions,
  ReleaseRepository,
} from "../src/repositories/release-repository";
import { AssetService } from "../src/services/asset-service";
import { ReleaseService } from "../src/services/release-service";
import { S3ObjectStorage } from "../src/services/s3-object-storage";

const now = new Date("2026-10-30T12:00:00.000Z");
const exampleRelease: Release = {
  id: "release-1",
  name: "API production",
  version: "v1.2.0",
  status: ReleaseStatus.DRAFT,
  description: "First production release",
  createdAt: now,
  updatedAt: now,
};

function createTestApp() {
  const repository: ReleaseRepository = {
    list: vi
      .fn<
        (
          options: ReleaseListOptions,
        ) => Promise<{ items: Release[]; total: number }>
      >()
      .mockResolvedValue({ items: [exampleRelease], total: 1 }),
    findById: vi
      .fn()
      .mockImplementation(async (id: string) =>
        id === exampleRelease.id ? exampleRelease : null,
      ),
    hasAssets: vi.fn().mockResolvedValue(false),
    create: vi.fn().mockImplementation(async (data) => ({
      ...exampleRelease,
      ...data,
      id: "release-created",
      status: data.status ?? ReleaseStatus.DRAFT,
    })),
    update: vi.fn().mockImplementation(async (id: string, data) => ({
      ...exampleRelease,
      ...data,
      id,
      updatedAt: new Date(),
    })),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const config: AppConfig = {
    NODE_ENV: "test",
    API_PORT: 4000,
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    DB_PORT: 5432,
    APP_VERSION: "test-sha",
    CORS_ORIGIN: "http://localhost:3000",
    LOG_LEVEL: "silent",
    AWS_REGION: "us-east-1",
    MAX_UPLOAD_BYTES: 5 * 1024 * 1024,
  };
  const checkDatabase = vi.fn().mockResolvedValue(undefined);
  const app = createApp({
    config,
    releaseService: new ReleaseService(repository),
    checkDatabase,
  });
  return { app, config, repository, checkDatabase };
}

describe("ReleaseKit API", () => {
  let context: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    context = createTestApp();
  });

  it("reports liveness without requiring database access", async () => {
    const response = await request(context.app)
      .get("/api/v1/health")
      .expect(200);
    expect(response.body).toEqual({ data: { status: "ok" } });
    expect(context.checkDatabase).not.toHaveBeenCalled();
  });

  it("reports readiness when PostgreSQL is available", async () => {
    const response = await request(context.app)
      .get("/api/v1/ready")
      .expect(200);
    expect(response.body).toEqual({ data: { status: "ready" } });
    expect(context.checkDatabase).toHaveBeenCalledOnce();
  });

  it("returns an unavailable response when readiness fails", async () => {
    context.checkDatabase.mockRejectedValueOnce(
      new Error("database credentials must not be returned"),
    );
    const response = await request(context.app)
      .get("/api/v1/ready")
      .expect(503);
    expect(response.body.error.code).toBe("NOT_READY");
    expect(JSON.stringify(response.body)).not.toContain("credentials");
  });

  it("returns the application version", async () => {
    const response = await request(context.app)
      .get("/api/v1/version")
      .expect(200);
    expect(response.body.data.version).toBe("test-sha");
  });

  it("lists releases with bounded pagination metadata", async () => {
    const response = await request(context.app)
      .get("/api/v1/releases?page=2&pageSize=10")
      .expect(200);
    expect(response.body.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
    });
    expect(context.repository.list).toHaveBeenCalledWith({
      page: undefined,
      pageSize: undefined,
      status: undefined,
      search: undefined,
      createdAfter: undefined,
      createdBefore: undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
      skip: 10,
      take: 10,
    });
  });

  it("supports validated release filters, search, and deterministic sorting", async () => {
    await request(context.app)
      .get(
        "/api/v1/releases?status=DRAFT&search=API&createdAfter=2026-01-01T00:00:00Z&createdBefore=2026-12-31T23:59:59Z&sortBy=name&sortOrder=asc",
      )
      .expect(200);

    expect(context.repository.list).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "DRAFT",
        search: "API",
        createdAfter: new Date("2026-01-01T00:00:00Z"),
        createdBefore: new Date("2026-12-31T23:59:59Z"),
        sortBy: "name",
        sortOrder: "asc",
      }),
    );
  });

  it("rejects invalid release filters and inverted date ranges", async () => {
    const invalidSort = await request(context.app)
      .get("/api/v1/releases?sortBy=description")
      .expect(400);
    expect(invalidSort.body.error.code).toBe("VALIDATION_ERROR");

    const invertedRange = await request(context.app)
      .get(
        "/api/v1/releases?createdAfter=2026-12-31T00:00:00Z&createdBefore=2026-01-01T00:00:00Z",
      )
      .expect(400);
    expect(invertedRange.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("creates a release after validating the request body", async () => {
    const response = await request(context.app)
      .post("/api/v1/releases")
      .send({
        name: "API production",
        version: "v1.2.0",
        description: "Ready to ship",
      })
      .expect(201);
    expect(response.body.data.id).toBe("release-created");
    expect(context.repository.create).toHaveBeenCalledWith({
      name: "API production",
      version: "v1.2.0",
      description: "Ready to ship",
    });
  });

  it("rejects malformed or unknown release fields", async () => {
    const response = await request(context.app)
      .post("/api/v1/releases")
      .send({ name: "", version: "v1", password: "must-not-echo" })
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(response.body)).not.toContain("must-not-echo");
    expect(context.repository.create).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with a client error", async () => {
    const response = await request(context.app)
      .post("/api/v1/releases")
      .set("Content-Type", "application/json")
      .send('{"name":')
      .expect(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });

  it("returns a stable 404 response for a missing release", async () => {
    const response = await request(context.app)
      .get("/api/v1/releases/missing")
      .expect(404);
    expect(response.body.error.code).toBe("RELEASE_NOT_FOUND");
  });

  it("updates and deletes an existing release", async () => {
    const updated = await request(context.app)
      .patch("/api/v1/releases/release-1")
      .send({ status: "SUCCEEDED" })
      .expect(200);
    expect(updated.body.data.status).toBe("SUCCEEDED");

    await request(context.app).delete("/api/v1/releases/release-1").expect(204);
    expect(context.repository.delete).toHaveBeenCalledWith("release-1");
  });

  it("prevents deleting a release while private assets are still attached", async () => {
    vi.mocked(context.repository.hasAssets).mockResolvedValueOnce(true);
    const response = await request(context.app)
      .delete("/api/v1/releases/release-1")
      .expect(409);
    expect(response.body.error.code).toBe("RELEASE_HAS_ASSETS");
    expect(context.repository.delete).not.toHaveBeenCalled();
  });

  it("returns a conflict if related data prevents deleting a release", async () => {
    vi.mocked(context.repository.delete).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        {
          code: "P2003",
          clientVersion: "7.10.1",
        },
      ),
    );
    const response = await request(context.app)
      .delete("/api/v1/releases/release-1")
      .expect(409);
    expect(response.body.error.code).toBe("RESOURCE_CONFLICT");
  });

  it("rejects cross-origin browser requests", async () => {
    const response = await request(context.app)
      .get("/api/v1/health")
      .set("Origin", "https://untrusted.example")
      .expect(403);
    expect(response.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("keeps asset routes unavailable without server-side credentials", async () => {
    const response = await request(context.app)
      .post("/api/v1/releases/release-1/assets")
      .expect(503);
    expect(response.body.error.code).toBe("ASSET_STORAGE_UNAVAILABLE");

    const assetList = await request(context.app)
      .get("/api/v1/releases/release-1/assets")
      .expect(503);
    expect(assetList.body.error.code).toBe("ASSET_STORAGE_UNAVAILABLE");
  });

  it("requires the server-side bearer token before allowing private asset access", async () => {
    const app = createApp({
      config: context.config,
      releaseService: new ReleaseService(context.repository),
      assetAccessToken: "a".repeat(32),
      checkDatabase: context.checkDatabase,
    });
    const assetUrl = "/api/v1/releases/release-1/assets/asset-1/download";

    const unauthorized = await request(app).get(assetUrl).expect(401);
    expect(unauthorized.body.error.code).toBe("UNAUTHORIZED");

    const authorized = await request(app)
      .get(assetUrl)
      .set("Authorization", `Bearer ${"a".repeat(32)}`)
      .expect(503);
    expect(authorized.body.error.code).toBe("ASSET_STORAGE_UNAVAILABLE");
  });

  it("lists protected asset metadata without exposing storage keys", async () => {
    const assetRepository: AssetRepository = {
      releaseExists: vi.fn().mockResolvedValue(true),
      create: vi.fn(),
      listForRelease: vi.fn().mockResolvedValue([
        {
          id: "asset-1",
          fileName: "release.pdf",
          contentType: "application/pdf",
          sizeBytes: 128,
          createdAt: now,
        },
      ]),
      findForRelease: vi.fn(),
      delete: vi.fn(),
    };
    const app = createApp({
      config: context.config,
      releaseService: new ReleaseService(context.repository),
      assetService: new AssetService(
        assetRepository,
        new S3ObjectStorage("us-east-1", "releasekit-private"),
        1024,
      ),
      assetAccessToken: "a".repeat(32),
      checkDatabase: context.checkDatabase,
    });

    const response = await request(app)
      .get("/api/v1/releases/release-1/assets")
      .set("Authorization", `Bearer ${"a".repeat(32)}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).not.toHaveProperty("objectKey");
    expect(assetRepository.listForRelease).toHaveBeenCalledWith("release-1");
  });

  it("requires explicit production-only configuration", async () => {
    const { loadConfig } = await import("../src/config");
    let message = "";
    try {
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://test:test@db:5432/releasekit",
      });
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }
    expect(message).toContain("Invalid application configuration");
    expect(message).toContain("AWS_REGION");
    expect(message).toContain("CORS_ORIGIN");
    expect(message).toContain("S3_BUCKET");
  });

  it("builds a TLS-required PostgreSQL URL from managed secret fields", async () => {
    const { loadConfig } = await import("../src/config");
    const config = loadConfig({
      NODE_ENV: "production",
      DB_HOST: "database.example.internal",
      DB_PORT: "5432",
      DB_NAME: "releasekit",
      DB_USER: "releasekit",
      DB_PASSWORD: "use-this-only-in-test",
      APP_VERSION: "sha-123",
      CORS_ORIGIN: "https://releases.example.com",
      AWS_REGION: "us-east-1",
      S3_BUCKET: "releasekit-private",
      ASSET_ACCESS_TOKEN: "a".repeat(32),
    });
    const parsedUrl = new URL(config.DATABASE_URL);
    expect(parsedUrl.hostname).toBe("database.example.internal");
    expect(parsedUrl.username).toBe("releasekit");
    expect(parsedUrl.searchParams.get("connection_limit")).toBe("5");
    expect(parsedUrl.searchParams.get("sslmode")).toBe("require");
  });

  it("rejects production database URLs that do not require TLS", async () => {
    const { loadConfig } = await import("../src/config");
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        DATABASE_URL:
          "postgresql://releasekit:password@database.example.internal:5432/releasekit",
        APP_VERSION: "sha-123",
        CORS_ORIGIN: "https://releases.example.com",
        AWS_REGION: "us-east-1",
        S3_BUCKET: "releasekit-private",
        ASSET_ACCESS_TOKEN: "a".repeat(32),
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("returns no stack trace for unexpected production errors", async () => {
    const productionContext = createTestApp();
    productionContext.repository.list = vi
      .fn()
      .mockRejectedValue(new Error("private diagnostic"));
    const app = createApp({
      config: { ...productionContext.config, NODE_ENV: "production" },
      releaseService: new ReleaseService(productionContext.repository),
      checkDatabase: productionContext.checkDatabase,
    });
    const response = await request(app).get("/api/v1/releases").expect(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(response.body)).not.toContain("private diagnostic");
  });
});
