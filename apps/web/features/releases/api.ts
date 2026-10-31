import { request, requestWithoutResponse } from "../../lib/api/client";
import {
  releaseResponseSchema,
  releasesResponseSchema,
  type Release,
  type ReleaseInput,
  type ReleaseQuery,
} from "./types";

export type {
  Release,
  ReleaseInput,
  ReleaseQuery,
  ReleaseStatus,
} from "./types";

export async function fetchReleases(
  query: ReleaseQuery = {},
  signal?: AbortSignal,
): Promise<{ items: Release[]; total: number }> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 20),
    sortBy: query.sortBy ?? "createdAt",
    sortOrder: query.sortOrder ?? "desc",
  });
  if (query.status) params.set("status", query.status);
  if (query.search) params.set("search", query.search);

  const result = await request(
    `/releases?${params.toString()}`,
    releasesResponseSchema,
    { signal },
  );
  return { items: result.data, total: result.meta.total };
}

export async function createRelease(input: ReleaseInput): Promise<Release> {
  const result = await request("/releases", releaseResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.data;
}

export async function updateRelease(
  id: string,
  input: ReleaseInput,
): Promise<Release> {
  const result = await request(
    `/releases/${encodeURIComponent(id)}`,
    releaseResponseSchema,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return result.data;
}

export async function deleteRelease(id: string): Promise<void> {
  await requestWithoutResponse(`/releases/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
