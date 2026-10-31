import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { AppError } from "../errors";

export function requireAssetToken(expectedToken?: string): RequestHandler {
  return (request, _response, next) => {
    if (!expectedToken) {
      return next(
        new AppError(
          503,
          "ASSET_STORAGE_UNAVAILABLE",
          "Asset storage is not configured",
        ),
      );
    }

    const authorization = request.get("authorization");
    const suppliedToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    const expectedHash = createHash("sha256").update(expectedToken).digest();
    const suppliedHash = createHash("sha256").update(suppliedToken).digest();
    if (!timingSafeEqual(expectedHash, suppliedHash)) {
      return next(
        new AppError(
          401,
          "UNAUTHORIZED",
          "Valid asset access credentials are required",
        ),
      );
    }
    return next();
  };
}
