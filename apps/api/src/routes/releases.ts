import { Router } from "express";
import multer from "multer";
import { createReleaseController } from "../controllers/releases";
import { AppError } from "../errors";
import { requireAssetToken } from "../middleware/require-asset-token";
import { validateBody } from "../middleware/validate-body";
import type { AssetService } from "../services/asset-service";
import { isAllowedAssetType } from "../services/asset-service";
import { createReleaseSchema, updateReleaseSchema } from "../schemas/release";
import type { ReleaseService } from "../services/release-service";

export function createReleaseRouter(
  service: ReleaseService,
  assetService?: AssetService,
  assetAccessToken?: string,
  maxUploadBytes = 5 * 1024 * 1024,
): Router {
  const router = Router();
  const controller = createReleaseController(service, assetService);
  const fileUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadBytes, files: 1, fields: 0, parts: 1 },
    fileFilter(_request, file, callback) {
      if (!isAllowedAssetType(file.mimetype)) {
        callback(
          new AppError(
            415,
            "UNSUPPORTED_FILE_TYPE",
            "This file type is not allowed",
          ),
        );
        return;
      }
      callback(null, true);
    },
  });
  const assetAuth = requireAssetToken(assetAccessToken);

  router.get("/", controller.list);
  router.post("/", validateBody(createReleaseSchema, controller.create));
  router.get("/:id", controller.get);
  router.patch("/:id", validateBody(updateReleaseSchema, controller.update));
  router.get("/:id/assets", assetAuth, controller.listAssets);
  router.post(
    "/:id/assets",
    assetAuth,
    fileUpload.single("file"),
    controller.upload,
  );
  router.get(
    "/:id/assets/:assetId/download",
    assetAuth,
    controller.getDownloadUrl,
  );
  router.delete("/:id/assets/:assetId", assetAuth, controller.deleteAsset);
  router.delete("/:id", controller.deleteRelease);

  return router;
}
