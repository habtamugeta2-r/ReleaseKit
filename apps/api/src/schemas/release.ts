import { ReleaseStatus } from "@prisma/client";
import { z } from "zod";

export const createReleaseSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    version: z.string().trim().min(1).max(64),
    status: z.enum(ReleaseStatus).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const updateReleaseSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    version: z.string().trim().min(1).max(64).optional(),
    status: z.enum(ReleaseStatus).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided",
  );

export const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(ReleaseStatus).optional(),
    search: z.string().trim().min(1).max(120).optional(),
    createdAfter: z.iso.datetime({ offset: true }).optional(),
    createdBefore: z.iso.datetime({ offset: true }).optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "name", "version", "status"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine(
    (value) =>
      !value.createdAfter ||
      !value.createdBefore ||
      new Date(value.createdAfter) <= new Date(value.createdBefore),
    {
      path: ["createdBefore"],
      message: "Must be on or after createdAfter",
    },
  )
  .strict();

export const idSchema = z.string().trim().min(1).max(64);
