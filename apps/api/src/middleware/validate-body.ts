import type { Request, RequestHandler, Response } from "express";
import type { z, ZodType } from "zod";
import { validationError } from "../errors";

export type ValidatedBodyHandler<T extends ZodType> = (
  body: z.output<T>,
  request: Request,
  response: Response,
) => Promise<void>;

export function validateBody<T extends ZodType>(
  schema: T,
  handler: ValidatedBodyHandler<T>,
): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return next(validationError(result.error.issues));
    }
    void handler(result.data, request, response).catch(next);
  };
}
