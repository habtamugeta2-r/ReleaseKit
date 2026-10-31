import { z } from "zod";

const errorResponseSchema = z.object({
  error: z.object({ message: z.string(), requestId: z.string().optional() }),
});

const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").replace(
  /\/+$/,
  "",
);

async function send(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${baseUrl}/v1${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new Error("Unable to reach the ReleaseKit API.", { cause: error });
  }
}

async function throwRequestError(response: Response): Promise<never> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`The ReleaseKit API request failed (${response.status}).`, {
      cause: error,
    });
  }
  const parsedError = errorResponseSchema.safeParse(payload);
  throw new Error(
    parsedError.success
      ? parsedError.data.error.message
      : `The ReleaseKit API request failed (${response.status}).`,
  );
}

export async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  init?: RequestInit,
): Promise<z.output<T>> {
  const response = await send(path, init);
  if (!response.ok) {
    return throwRequestError(response);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("The ReleaseKit API returned an invalid response.", {
      cause: error,
    });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      "The ReleaseKit API returned data in an unexpected format.",
    );
  }
  return parsed.data;
}

export async function requestWithoutResponse(
  path: string,
  init?: RequestInit,
): Promise<void> {
  const response = await send(path, init);
  if (!response.ok) {
    await throwRequestError(response);
  }
}
