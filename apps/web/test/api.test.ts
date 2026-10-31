import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth, fetchVersion } from "../features/operations/api";
import {
  createRelease,
  deleteRelease,
  fetchReleases,
  updateRelease,
} from "../features/releases/api";

const release = {
  id: "release-1",
  name: "API",
  version: "v1",
  status: "DRAFT",
  description: null,
  createdAt: "2026-10-30T12:00:00.000Z",
  updatedAt: "2026-10-30T12:00:00.000Z",
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("web API client", () => {
  it("parses and returns releases from the API envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: [release],
          meta: { page: 1, pageSize: 20, total: 1 },
        }),
      ),
    );

    await expect(fetchReleases()).resolves.toMatchObject({
      total: 1,
      items: [{ id: "release-1", status: "DRAFT" }],
    });
  });

  it("encodes release search, filters, sorting, and page options", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [release],
        meta: { page: 2, pageSize: 10, total: 25 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchReleases({
      page: 2,
      pageSize: 10,
      status: "DEPLOYING",
      search: "API release",
      sortBy: "name",
      sortOrder: "asc",
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/releases?page=2&pageSize=10&sortBy=name&sortOrder=asc&status=DEPLOYING&search=API+release",
    );
  });

  it("parses health and version responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ data: { status: "ok" } }))
        .mockResolvedValueOnce(jsonResponse({ data: { version: "1.4.0" } })),
    );

    await expect(fetchHealth()).resolves.toEqual({ status: "ok" });
    await expect(fetchVersion()).resolves.toEqual({ version: "1.4.0" });
  });

  it("creates and updates releases using encoded API requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: release }))
      .mockResolvedValueOnce(jsonResponse({ data: release }));
    vi.stubGlobal("fetch", fetchMock);
    const input = {
      name: "API",
      version: "v1",
      status: "DRAFT" as const,
      description: null,
    };

    await expect(createRelease(input)).resolves.toEqual(release);
    await expect(updateRelease("release/1", input)).resolves.toEqual(release);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/releases");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/releases/release%2F1");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH" });
  });

  it("deletes releases and surfaces deletion errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { message: "Delete failed", requestId: "req-2" } },
          500,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteRelease("release/1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/releases/release%2F1");
    await expect(deleteRelease("release-2")).rejects.toThrow("Delete failed");
  });

  it("rejects malformed API responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { status: 42 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(fetchHealth()).rejects.toThrow("unexpected format");
  });

  it("surfaces API errors without requiring the caller to inspect transport details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { message: "API unavailable", requestId: "req-1" },
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(fetchHealth()).rejects.toThrow("API unavailable");
  });

  it("reports transport and malformed response failures", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }))
      .mockResolvedValueOnce(new Response("not-json", { status: 502 }))
      .mockResolvedValueOnce(jsonResponse({ error: "invalid" }, 502));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchHealth()).rejects.toThrow("Unable to reach");
    await expect(fetchHealth()).rejects.toThrow("invalid response");
    await expect(fetchHealth()).rejects.toThrow("request failed (502)");
    await expect(fetchHealth()).rejects.toThrow("request failed (502)");
  });
});
