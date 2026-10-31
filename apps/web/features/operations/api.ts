import { z } from "zod";
import { request } from "../../lib/api/client";

const statusResponseSchema = z.object({
  data: z.object({ status: z.string() }),
});

const versionResponseSchema = z.object({
  data: z.object({ version: z.string() }),
});

export async function fetchHealth(
  signal?: AbortSignal,
): Promise<{ status: string }> {
  const result = await request("/health", statusResponseSchema, { signal });
  return result.data;
}

export async function fetchVersion(
  signal?: AbortSignal,
): Promise<{ version: string }> {
  const result = await request("/version", versionResponseSchema, { signal });
  return result.data;
}
