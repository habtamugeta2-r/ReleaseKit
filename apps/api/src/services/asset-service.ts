import { randomUUID } from "node:crypto";
import type { ReleaseAsset } from "@prisma/client";
import { AppError } from "../errors";
import type {
  AssetRepository,
  ReleaseAssetMetadata,
} from "../repositories/asset-repository";
import { S3ObjectStorage } from "./s3-object-storage";

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export interface UploadContent {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export function isAllowedAssetType(mimeType: string): boolean {
  return allowedTypes.has(mimeType);
}

function isMatchingFileSignature(mimeType: string, buffer: Buffer): boolean {
  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (mimeType === "image/png") {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 255 &&
      buffer[1] === 216 &&
      buffer[2] === 255
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

function safeFileName(originalName: string): string {
  const fileName = originalName
    .replace(/\\/g, "/")
    .split("/")
    .at(-1)
    ?.split("")
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127 || character === '"'
        ? "_"
        : character;
    })
    .join("")
    .trim();
  if (
    !fileName ||
    fileName === "." ||
    fileName === ".." ||
    fileName.length > 255
  ) {
    throw new AppError(
      400,
      "INVALID_FILE_NAME",
      "The uploaded file name is invalid",
    );
  }
  return fileName;
}

export class AssetService {
  constructor(
    private readonly repository: AssetRepository,
    private readonly storage: S3ObjectStorage,
    private readonly maxUploadBytes: number,
  ) {}

  async upload(releaseId: string, file: UploadContent): Promise<ReleaseAsset> {
    if (!(await this.repository.releaseExists(releaseId))) {
      throw new AppError(404, "RELEASE_NOT_FOUND", "Release not found");
    }
    if (file.buffer.length === 0 || file.buffer.length > this.maxUploadBytes) {
      throw new AppError(
        413,
        "PAYLOAD_TOO_LARGE",
        "Uploaded file is empty or exceeds the size limit",
      );
    }
    if (!isAllowedAssetType(file.mimeType)) {
      throw new AppError(
        415,
        "UNSUPPORTED_FILE_TYPE",
        "This file type is not allowed",
      );
    }
    if (!isMatchingFileSignature(file.mimeType, file.buffer)) {
      throw new AppError(
        415,
        "FILE_CONTENT_MISMATCH",
        "The uploaded content does not match its file type",
      );
    }

    const fileName = safeFileName(file.originalName);
    const objectKey = `release-assets/${randomUUID()}`;
    await this.storage.upload({
      key: objectKey,
      body: file.buffer,
      contentType: file.mimeType,
    });

    try {
      return await this.repository.create({
        releaseId,
        objectKey,
        fileName,
        contentType: file.mimeType,
        sizeBytes: file.buffer.length,
      });
    } catch (databaseError) {
      try {
        await this.storage.delete(objectKey);
      } catch (cleanupError) {
        throw new AggregateError(
          [databaseError, cleanupError],
          "Asset metadata persistence and object cleanup both failed",
        );
      }
      throw databaseError;
    }
  }

  async list(releaseId: string): Promise<ReleaseAssetMetadata[]> {
    if (!(await this.repository.releaseExists(releaseId))) {
      throw new AppError(404, "RELEASE_NOT_FOUND", "Release not found");
    }
    return this.repository.listForRelease(releaseId);
  }

  async getDownloadUrl(releaseId: string, assetId: string): Promise<string> {
    const asset = await this.getAsset(releaseId, assetId);
    return this.storage.createDownloadUrl(
      asset.objectKey,
      asset.fileName,
      asset.contentType,
    );
  }

  async delete(releaseId: string, assetId: string): Promise<void> {
    const asset = await this.getAsset(releaseId, assetId);
    await this.storage.delete(asset.objectKey);
    await this.repository.delete(asset.id);
  }

  private async getAsset(
    releaseId: string,
    assetId: string,
  ): Promise<ReleaseAsset> {
    const asset = await this.repository.findForRelease(releaseId, assetId);
    if (!asset) {
      throw new AppError(404, "ASSET_NOT_FOUND", "Asset not found");
    }
    return asset;
  }
}
