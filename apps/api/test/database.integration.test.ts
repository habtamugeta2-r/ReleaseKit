import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaReleaseRepository } from "../src/repositories/release-repository";
import { createPrismaClient } from "../src/prisma";
import { ReleaseService } from "../src/services/release-service";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

function assertIsTestDatabase(databaseUrl: string): void {
  const parsedUrl = new URL(databaseUrl);
  if (
    !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
    parsedUrl.pathname !== "/releasekit_test"
  ) {
    throw new Error(
      "TEST_DATABASE_URL must point to the dedicated releasekit_test database.",
    );
  }
}

if (testDatabaseUrl) {
  assertIsTestDatabase(testDatabaseUrl);
}

const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase("PostgreSQL integration", () => {
  const prisma = createPrismaClient(testDatabaseUrl ?? "", "test");
  const repository = new PrismaReleaseRepository(prisma);
  const service = new ReleaseService(repository);
  const testRun = randomUUID();
  const createdReleaseIds: string[] = [];

  async function createRelease() {
    const release = await repository.create({
      name: `integration-${testRun}`,
      version: "v1.0.0",
    });
    createdReleaseIds.push(release.id);
    return release;
  }

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(async () => {
    if (createdReleaseIds.length === 0) {
      return;
    }

    try {
      await prisma.releaseAsset.deleteMany({
        where: { releaseId: { in: createdReleaseIds } },
      });
      await prisma.release.deleteMany({
        where: { id: { in: createdReleaseIds } },
      });
    } finally {
      createdReleaseIds.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("connects and exercises release create, read, update, list, and delete", async () => {
    const release = await createRelease();

    await expect(service.get(release.id)).resolves.toMatchObject({
      id: release.id,
      version: "v1.0.0",
    });

    await expect(
      service.update(release.id, { status: "SUCCEEDED" }),
    ).resolves.toMatchObject({ id: release.id, status: "SUCCEEDED" });

    const listed = await service.list(1, 100);
    expect(listed.items.some((item) => item.id === release.id)).toBe(true);
    expect(listed.total).toBeGreaterThanOrEqual(1);

    await service.delete(release.id);
    createdReleaseIds.splice(createdReleaseIds.indexOf(release.id), 1);
    await expect(service.get(release.id)).rejects.toMatchObject({
      statusCode: 404,
      code: "RELEASE_NOT_FOUND",
    });
  });

  it("enforces asset uniqueness and prevents deleting a referenced release", async () => {
    const release = await createRelease();
    const assetData = {
      release: { connect: { id: release.id } },
      objectKey: `integration/${testRun}/asset`,
      fileName: "asset.pdf",
      contentType: "application/pdf",
      sizeBytes: 12,
    };

    await prisma.releaseAsset.create({ data: assetData });
    await expect(
      prisma.releaseAsset.create({ data: assetData }),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(service.delete(release.id)).rejects.toMatchObject({
      statusCode: 409,
      code: "RELEASE_HAS_ASSETS",
    });

    await expect(
      prisma.release.delete({ where: { id: release.id } }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
});

if (!testDatabaseUrl) {
  describe("PostgreSQL integration", () => {
    it.skip("requires TEST_DATABASE_URL for the isolated releasekit_test database", () => {});
  });
}
