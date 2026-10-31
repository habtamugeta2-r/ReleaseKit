import { z } from "zod";

export const releaseStatusSchema = z.enum([
  "DRAFT",
  "DEPLOYING",
  "SUCCEEDED",
  "FAILED",
]);

export const releaseSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  version: z.string(),
  status: releaseStatusSchema,
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const releasesResponseSchema = z.object({
  data: z.array(releaseSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  }),
});

export const releaseResponseSchema = z.object({ data: releaseSchema });

export type ReleaseStatus = z.infer<typeof releaseStatusSchema>;
export type Release = z.infer<typeof releaseSchema>;
export type ReleaseInput = {
  name: string;
  version: string;
  status: ReleaseStatus;
  description: string | null;
};

export type ReleaseQuery = {
  page?: number;
  pageSize?: number;
  status?: ReleaseStatus;
  search?: string;
  sortBy?: "createdAt" | "updatedAt" | "name" | "version" | "status";
  sortOrder?: "asc" | "desc";
};
localhost