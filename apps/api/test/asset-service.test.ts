import type { ReleaseAsset } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssetRepository } from "../src/repositories/asset-repository";
import { AssetService } from "../src/services/asset-service";
import { S3ObjectStorage } from "../src/services/s3-object-storage";

const exampleAsset: ReleaseAsset = {
  id: "asset-1",
  releaseId: "release-1",
  objectKey: "release-assets/asset-key",
  fileName: "release.pdf",
  contentType: "application/pdf",
  sizeBytes: 12,
  createdAt: new Date("2026-10-30T12:00:00.000Z"),
};

function createService() {
  const repository: AssetRepository = {
    releaseExists: vi.fn().mockResolvedValue(true),
    create: vi
      .fn()
      .mockImplementation(async (data) => ({ ...exampleAsset, ...data })),
    listForRelease: vi.fn().mockResolvedValue([
      {
        id: exampleAsset.id,
        fileName: exampleAsset.fileName,
        contentType: exampleAsset.contentType,
        sizeBytes: exampleAsset.sizeBytes,
        createdAt: exampleAsset.createdAt,
      },
    ]),
    findForRelease: vi.fn().mockResolvedValue(exampleAsset),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const storage = new S3ObjectStorage("us-east-1", "releasekit-private");
  vi.spyOn(storage, "upload").mockResolvedValue(undefined);
  vi.spyOn(storage, "createDownloadUrl").mockResolvedValue(
    "https://signed.example/asset",
  );
  vi.spyOn(storage, "delete").mockResolvedValue(undefined);
  return {
    service: new AssetService(repository, storage, 1024),
    repository,
    storage,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("private release assets", () => {
  it("lists only safe metadata for existing releases", async () => {
    const { service, repository } = createService();
    const assets = await service.list("release-1");

    expect(assets).toEqual([
      {
        id: "asset-1",
        fileName: "release.pdf",
        contentType: "application/pdf",
        sizeBytes: 12,
        createdAt: exampleAsset.createdAt,
      },
    ]);
    expect(assets[0]).not.toHaveProperty("objectKey");
    expect(repository.listForRelease).toHaveBeenCalledWith("release-1");
  });

  it("stores validated files under server-generated keys with sanitized names", async () => {
    const { service, repository, storage } = createService();
    const asset = await service.upload("release-1", {
      originalName: "../../release notes.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7 data"),
    });

    expect(asset.fileName).toBe("release notes.pdf");
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        releaseId: "release-1",
        fileName: "release notes.pdf",
        contentType: "application/pdf",
      }),
    );
    const uploadedKey = vi.mocked(storage.upload).mock.calls[0]?.[0].key;
    expect(uploadedKey).toMatch(/^release-assets\/[0-9a-f-]{36}$/);
    expect(uploadedKey).not.toContain("release-1");
    expect(vi.mocked(storage.upload).mock.calls[0]?.[0].contentType).toBe(
      "application/pdf",
    );
  });

  it("rejects a MIME type that does not match the file signature", async () => {
    const { service, storage } = createService();

    await expect(
      service.upload("release-1", {
        originalName: "payload.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("<html>not a PDF</html>"),
      }),
    ).rejects.toMatchObject({ statusCode: 415, code: "FILE_CONTENT_MISMATCH" });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects a missing release before writing an object", async () => {
    const { service, repository, storage } = createService();
    vi.mocked(repository.releaseExists).mockResolvedValueOnce(false);

    await expect(
      service.upload("missing", {
        originalName: "release.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.7 data"),
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: "RELEASE_NOT_FOUND" });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("cleans up an uploaded object if database metadata cannot be saved", async () => {
    const { service, repository, storage } = createService();
    vi.mocked(repository.create).mockRejectedValueOnce(
      new Error("database failure"),
    );

    await expect(
      service.upload("release-1", {
        originalName: "release.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.7 data"),
      }),
    ).rejects.toThrow("database failure");
    const uploadedKey = vi.mocked(storage.upload).mock.calls[0]?.[0].key;
    expect(storage.delete).toHaveBeenCalledWith(uploadedKey);
  });

  it("creates a short-lived URL only for an asset belonging to the requested release", async () => {
    const { service, repository, storage } = createService();
    await expect(service.getDownloadUrl("release-1", "asset-1")).resolves.toBe(
      "https://signed.example/asset",
    );
    expect(storage.createDownloadUrl).toHaveBeenCalledWith(
      exampleAsset.objectKey,
      exampleAsset.fileName,
      exampleAsset.contentType,
    );

    vi.mocked(repository.findForRelease).mockResolvedValueOnce(null);
    await expect(
      service.getDownloadUrl("another-release", "asset-1"),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "ASSET_NOT_FOUND",
    });
  });

  it("deletes private objects and their metadata", async () => {
    const { service, repository, storage } = createService();
    await service.delete("release-1", "asset-1");
    expect(storage.delete).toHaveBeenCalledWith(exampleAsset.objectKey);
    expect(repository.delete).toHaveBeenCalledWith(exampleAsset.id);
  });
});
