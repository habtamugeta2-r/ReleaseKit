import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  destroy: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => {
  class MockCommand {
    constructor(readonly input: unknown) {}
  }
  class MockS3Client {
    send = mocks.send;
    destroy = mocks.destroy;

    constructor(readonly config: unknown) {}
  }

  return {
    DeleteObjectCommand: MockCommand,
    GetObjectCommand: MockCommand,
    HeadObjectCommand: MockCommand,
    PutObjectCommand: MockCommand,
    S3Client: MockS3Client,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mocks.getSignedUrl,
}));

import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { AppError } from "../src/errors";
import { S3ObjectStorage } from "../src/services/s3-object-storage";

afterEach(() => {
  vi.clearAllMocks();
});

describe("S3 private object access", () => {
  it("checks that the object exists before creating a download URL", async () => {
    mocks.send.mockResolvedValueOnce({});
    mocks.getSignedUrl.mockResolvedValueOnce("https://signed.example/asset");
    const storage = new S3ObjectStorage("us-east-1", "releasekit-private");

    await expect(
      storage.createDownloadUrl(
        "release-assets/key",
        "file.pdf",
        "application/pdf",
      ),
    ).resolves.toBe("https://signed.example/asset");

    expect(mocks.send).toHaveBeenCalledOnce();
    expect(mocks.send.mock.calls[0]?.[0]).toBeInstanceOf(HeadObjectCommand);
    expect(mocks.getSignedUrl).toHaveBeenCalledOnce();
    expect(mocks.getSignedUrl.mock.calls[0]?.[1]).toBeInstanceOf(
      GetObjectCommand,
    );
  });

  it.each([
    { name: "NoSuchKey" },
    { name: "NotFound" },
    { $metadata: { httpStatusCode: 404 } },
  ])("returns a not-found error for missing S3 objects: %o", async (error) => {
    mocks.send.mockRejectedValueOnce(error);
    const storage = new S3ObjectStorage("us-east-1", "releasekit-private");

    await expect(
      storage.createDownloadUrl(
        "release-assets/missing",
        "file.pdf",
        "application/pdf",
      ),
    ).rejects.toMatchObject<AppError>({
      statusCode: 404,
      code: "ASSET_OBJECT_NOT_FOUND",
    });
    expect(mocks.getSignedUrl).not.toHaveBeenCalled();
  });

  it("propagates unexpected S3 errors", async () => {
    const serviceError = new Error("S3 permission denied");
    mocks.send.mockRejectedValueOnce(serviceError);
    const storage = new S3ObjectStorage("us-east-1", "releasekit-private");

    await expect(
      storage.createDownloadUrl(
        "release-assets/key",
        "file.pdf",
        "application/pdf",
      ),
    ).rejects.toBe(serviceError);
    expect(mocks.getSignedUrl).not.toHaveBeenCalled();
  });
});
