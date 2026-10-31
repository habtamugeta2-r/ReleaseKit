import type { Prisma } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError, validationError } from "../errors";
import type { AssetService } from "../services/asset-service";
import { DOWNLOAD_URL_TTL_SECONDS } from "../services/s3-object-storage";
import type { ReleaseService } from "../services/release-service";
import {
  createReleaseSchema,
  idSchema,
  listQuerySchema,
  updateReleaseSchema,
} from "../schemas/release";
import type { ValidatedBodyHandler } from "../middleware/validate-body";

export function createReleaseController(
  service: ReleaseService,
  assetService?: AssetService,
) {
  const list: RequestHandler = async (request, response, next) => {
    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) {
      return next(validationError(query.error.issues));
    }
    try {
      const {
        page,
        pageSize,
        status,
        search,
        createdAfter,
        createdBefore,
        sortBy,
        sortOrder,
      } = query.data;
      const result = await service.list(page, pageSize, {
        status,
        search,
        createdAfter: createdAfter ? new Date(createdAfter) : undefined,
        createdBefore: createdBefore ? new Date(createdBefore) : undefined,
        sortBy,
        sortOrder,
      });
      return response.json({
        data: result.items,
        meta: {
          page,
          pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSize),
          hasNextPage: page * pageSize < result.total,
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  const create: ValidatedBodyHandler<typeof createReleaseSchema> = async (
    body,
    _request,
    response,
  ) => {
    const release = await service.create(body);
    response.status(201).json({ data: release });
  };

  const get: RequestHandler = async (request, response, next) => {
    const parsedId = idSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      return next(validationError(parsedId.error.issues));
    }
    try {
      return response.json({ data: await service.get(parsedId.data) });
    } catch (error) {
      return next(error);
    }
  };

  const update: ValidatedBodyHandler<typeof updateReleaseSchema> = async (
    body,
    request,
    response,
  ) => {
    const parsedId = idSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      throw validationError(parsedId.error.issues);
    }
    const release = await service.update(
      parsedId.data,
      body satisfies Prisma.ReleaseUpdateInput,
    );
    response.json({ data: release });
  };

  const upload: RequestHandler = async (request, response, next) => {
    const parsedId = idSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      return next(validationError(parsedId.error.issues));
    }
    if (!assetService) {
      return next(
        new AppError(
          503,
          "ASSET_STORAGE_UNAVAILABLE",
          "Asset storage is not configured",
        ),
      );
    }
    if (!request.file) {
      return next(
        new AppError(
          400,
          "FILE_REQUIRED",
          "Upload a file using the 'file' field",
        ),
      );
    }
    try {
      const asset = await assetService.upload(parsedId.data, {
        originalName: request.file.originalname,
        mimeType: request.file.mimetype,
        buffer: request.file.buffer,
      });
      return response.status(201).json({
        data: {
          id: asset.id,
          fileName: asset.fileName,
          contentType: asset.contentType,
          sizeBytes: asset.sizeBytes,
          createdAt: asset.createdAt,
        },
      });
    } catch (error) {
      return next(error);
    }
  };

  const listAssets: RequestHandler = async (request, response, next) => {
    const parsedId = idSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      return next(validationError(parsedId.error.issues));
    }
    if (!assetService) {
      return next(
        new AppError(
          503,
          "ASSET_STORAGE_UNAVAILABLE",
          "Asset storage is not configured",
        ),
      );
    }
    try {
      const assets = await assetService.list(parsedId.data);
      return response.json({ data: assets });
    } catch (error) {
      return next(error);
    }
  };

  const getDownloadUrl: RequestHandler = async (request, response, next) => {
    const parsedReleaseId = idSchema.safeParse(request.params.id);
    const parsedAssetId = idSchema.safeParse(request.params.assetId);
    if (!parsedReleaseId.success || !parsedAssetId.success) {
      const issues = [
        ...(!parsedReleaseId.success ? parsedReleaseId.error.issues : []),
        ...(!parsedAssetId.success ? parsedAssetId.error.issues : []),
      ];
      return next(validationError(issues));
    }
    if (!assetService) {
      return next(
        new AppError(
          503,
          "ASSET_STORAGE_UNAVAILABLE",
          "Asset storage is not configured",
        ),
      );
    }
    try {
      const url = await assetService.getDownloadUrl(
        parsedReleaseId.data,
        parsedAssetId.data,
      );
      return response.json({
        data: { url, expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS },
      });
    } catch (error) {
      return next(error);
    }
  };

  const deleteAsset: RequestHandler = async (request, response, next) => {
    const parsedReleaseId = idSchema.safeParse(request.params.id);
    const parsedAssetId = idSchema.safeParse(request.params.assetId);
    if (!parsedReleaseId.success || !parsedAssetId.success) {
      const issues = [
        ...(!parsedReleaseId.success ? parsedReleaseId.error.issues : []),
        ...(!parsedAssetId.success ? parsedAssetId.error.issues : []),
      ];
      return next(validationError(issues));
    }
    if (!assetService) {
      return next(
        new AppError(
          503,
          "ASSET_STORAGE_UNAVAILABLE",
          "Asset storage is not configured",
        ),
      );
    }
    try {
      await assetService.delete(parsedReleaseId.data, parsedAssetId.data);
      return response.status(204).end();
    } catch (error) {
      return next(error);
    }
  };

  const deleteRelease: RequestHandler = async (request, response, next) => {
    const parsedId = idSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      return next(validationError(parsedId.error.issues));
    }
    try {
      await service.delete(parsedId.data);
      return response.status(204).end();
    } catch (error) {
      return next(error);
    }
  };

  return {
    list,
    create,
    get,
    update,
    listAssets,
    upload,
    getDownloadUrl,
    deleteAsset,
    deleteRelease,
  };
}

export type ReleaseController = ReturnType<typeof createReleaseController>;
