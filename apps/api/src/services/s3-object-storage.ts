import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "../errors";

export const DOWNLOAD_URL_TTL_SECONDS = 120;
const S3_CONNECTION_TIMEOUT_MS = 3_000;
const S3_REQUEST_TIMEOUT_MS = 30_000;

function isMissingS3Object(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const missingName =
    "name" in error &&
    (error.name === "NoSuchKey" || error.name === "NotFound");
  const missingStatus =
    "$metadata" in error &&
    typeof error.$metadata === "object" &&
    error.$metadata !== null &&
    "httpStatusCode" in error.$metadata &&
    error.$metadata.httpStatusCode === 404;
  return missingName || missingStatus;
}

export class S3ObjectStorage {
  private readonly client: S3Client;

  constructor(
    private readonly region: string,
    private readonly bucket: string,
  ) {
    this.client = new S3Client({
      region,
      requestHandler: {
        connectionTimeout: S3_CONNECTION_TIMEOUT_MS,
        requestTimeout: S3_REQUEST_TIMEOUT_MS,
      },
    });
  }

  async upload(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentLength: input.body.length,
        ContentType: input.contentType,
        ServerSideEncryption: "AES256",
      }),
    );
  }

  async createDownloadUrl(
    key: string,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      if (isMissingS3Object(error)) {
        throw new AppError(
          404,
          "ASSET_OBJECT_NOT_FOUND",
          "Asset object not found",
        );
      }
      throw error;
    }

    const asciiFileName = fileName
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\;]/g, "_");
    const disposition = `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: disposition,
        ResponseContentType: contentType,
      }),
      { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  destroy(): void {
    this.client.destroy();
  }
}
