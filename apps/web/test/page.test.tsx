import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHealth, fetchVersion } from "../features/operations/api";
import {
  createRelease,
  deleteRelease,
  fetchReleases,
  updateRelease,
} from "../features/releases/api";
import HomePage from "../app/page";

vi.mock("../features/releases/api", () => ({
  createRelease: vi.fn(),
  deleteRelease: vi.fn(),
  fetchReleases: vi.fn(),
  updateRelease: vi.fn(),
}));

vi.mock("../features/operations/api", () => ({
  fetchHealth: vi.fn(),
  fetchVersion: vi.fn(),
}));
const release = {
  id: "release-1",
  name: "Production API",
  version: "v1.4.0",
  status: "DRAFT" as const,
  description: "Initial release",
  createdAt: "2026-10-30T12:00:00.000Z",
  updatedAt: "2026-10-30T12:00:00.000Z",
};

function configureDashboard(releases: (typeof release)[] = []) {
  vi.mocked(fetchHealth).mockResolvedValue({ status: "ok" });
  vi.mocked(fetchVersion).mockResolvedValue({ version: "1.4.0" });
  vi.mocked(fetchReleases).mockResolvedValue({
    items: releases,
    total: releases.length,
  });
}

afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  configureDashboard();
});

describe("release dashboard", () => {
  it("renders the project introduction and semantic deployment overview", async () => {
    configureDashboard([release]);
    render(<HomePage />);

    expect(
      await screen.findByRole("heading", { name: "Ship with confidence." }),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Pipeline at a glance" }),
    ).toBeTruthy();
    expect(screen.getByRole("list").querySelectorAll("li")).toHaveLength(4);
    expect(
      screen.getByRole("group", { name: "1 releases tracked" }),
    ).toBeTruthy();
    expect(await screen.findByText("Production API")).toBeTruthy();
    expect(screen.getByText("API online")).toBeTruthy();
    expect(screen.getByText("build 1.4.0")).toBeTruthy();
  });

  it("shows a loading state until the initial requests finish", () => {
    vi.mocked(fetchHealth).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchVersion).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchReleases).mockReturnValue(new Promise(() => {}));
    render(<HomePage />);

    expect(screen.getByText("Loading release data…")).toBeTruthy();
  });

  it("shows an API error and retries release loading", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchReleases)
      .mockRejectedValueOnce(new Error("API unavailable"))
      .mockResolvedValueOnce({ items: [release], total: 1 });
    render(<HomePage />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("API unavailable");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Production API")).toBeTruthy();
    expect(fetchReleases).toHaveBeenCalledTimes(2);
  });

  it("keeps the newest release results when an earlier request is aborted", async () => {
    const user = userEvent.setup();
    let resolveFirstRequest!: (result: {
      items: Array<typeof release>;
      total: number;
    }) => void;
    const firstRequest = new Promise<{
      items: Array<typeof release>;
      total: number;
    }>((resolve) => {
      resolveFirstRequest = resolve;
    });
    vi.mocked(fetchReleases)
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce({ items: [release], total: 1 });
    render(<HomePage />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter by status" }),
      "DRAFT",
    );
    expect(await screen.findByText("Production API")).toBeTruthy();

    await act(async () => {
      resolveFirstRequest({ items: [], total: 0 });
    });
    expect(screen.getByText("Production API")).toBeTruthy();
  });

  it("filters and sorts releases using the API query options", async () => {
    const user = userEvent.setup();
    configureDashboard([release]);
    render(<HomePage />);
    await screen.findByText("Production API");

    await user.type(
      screen.getByRole("searchbox", { name: "Search releases" }),
      "release",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter by status" }),
      "DRAFT",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort releases" }),
      "name:asc",
    );

    expect(fetchReleases).toHaveBeenLastCalledWith(
      {
        page: 1,
        pageSize: 20,
        status: "DRAFT",
        search: "release",
        sortBy: "name",
        sortOrder: "asc",
      },
      expect.any(AbortSignal),
    );
  });

  it("navigates through server-paginated release results", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchReleases).mockResolvedValue({
      items: [release],
      total: 25,
    });
    render(<HomePage />);
    expect(await screen.findByText("Showing 1–20 of 25")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Showing 21–25 of 25")).toBeTruthy();
    expect(fetchReleases).toHaveBeenLastCalledWith(
      {
        page: 2,
        pageSize: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
      expect.any(AbortSignal),
    );
  });

  it("creates a release and refreshes the register", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchReleases)
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [release], total: 1 });
    vi.mocked(createRelease).mockResolvedValue(release);
    render(<HomePage />);
    await user.click(
      await screen.findByRole("button", { name: "New release" }),
    );

    await user.type(screen.getByLabelText("Release name"), "Production API");
    await user.type(screen.getByLabelText("Version"), "v1.4.0");
    await user.type(screen.getByLabelText(/Notes/), "Initial release");
    await user.click(screen.getByRole("button", { name: "Create release" }));

    expect(createRelease).toHaveBeenCalledWith({
      name: "Production API",
      version: "v1.4.0",
      status: "DRAFT",
      description: "Initial release",
    });
    expect(await screen.findByText("Production API")).toBeTruthy();
  });

  it("returns to the first page after creating a release on a later page", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchReleases)
      .mockResolvedValueOnce({ items: [release], total: 25 })
      .mockResolvedValueOnce({ items: [release], total: 25 })
      .mockResolvedValueOnce({ items: [release], total: 26 });
    vi.mocked(createRelease).mockResolvedValue(release);
    render(<HomePage />);

    await user.click(await screen.findByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "New release" }));
    await user.type(screen.getByLabelText("Release name"), "New API");
    await user.type(screen.getByLabelText("Version"), "v2.0.0");
    await user.click(screen.getByRole("button", { name: "Create release" }));

    expect(await screen.findByText("Showing 1–20 of 26")).toBeTruthy();
    expect(fetchReleases).toHaveBeenLastCalledWith(
      {
        page: 1,
        pageSize: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
      expect.any(AbortSignal),
    );
  });

  it("updates a release from its edit form", async () => {
    const user = userEvent.setup();
    const updatedRelease = { ...release, status: "SUCCEEDED" as const };
    vi.mocked(fetchReleases)
      .mockResolvedValueOnce({ items: [release], total: 1 })
      .mockResolvedValueOnce({ items: [updatedRelease], total: 1 });
    vi.mocked(updateRelease).mockResolvedValue(updatedRelease);
    render(<HomePage />);
    await user.click(
      await screen.findByRole("button", { name: "Edit Production API" }),
    );
    await user.selectOptions(screen.getByLabelText("Status"), "SUCCEEDED");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateRelease).toHaveBeenCalledWith("release-1", {
      name: "Production API",
      version: "v1.4.0",
      status: "SUCCEEDED",
      description: "Initial release",
    });
    expect(
      await screen.findByText("Succeeded", { selector: ".status-badge" }),
    ).toBeTruthy();
  });

  it("resets form fields when switching from editing to creating a release", async () => {
    const user = userEvent.setup();
    configureDashboard([release]);
    render(<HomePage />);

    await user.click(
      await screen.findByRole("button", { name: "Edit Production API" }),
    );
    await user.clear(screen.getByLabelText("Release name"));
    await user.type(screen.getByLabelText("Release name"), "Edited name");
    await user.click(screen.getByRole("button", { name: "New release" }));

    expect(screen.getByLabelText("Release name")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Version")).toHaveProperty("value", "");
  });

  it("deletes a release and refreshes the empty state", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchReleases)
      .mockResolvedValueOnce({ items: [release], total: 1 })
      .mockResolvedValueOnce({ items: [], total: 0 });
    vi.mocked(deleteRelease).mockResolvedValue();
    render(<HomePage />);
    await user.click(
      await screen.findByRole("button", { name: "Delete Production API" }),
    );

    expect(deleteRelease).toHaveBeenCalledWith("release-1");
    expect(await screen.findByText("No releases yet")).toBeTruthy();
  });

  it("returns to the first page after deleting the last result on a later page", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchReleases).mockResolvedValue({
      items: [release],
      total: 25,
    });
    vi.mocked(deleteRelease).mockResolvedValue();
    render(<HomePage />);

    await user.click(await screen.findByRole("button", { name: "Next" }));
    await user.click(
      screen.getByRole("button", { name: "Delete Production API" }),
    );

    expect(await screen.findByText("Showing 1–20 of 25")).toBeTruthy();
    expect(fetchReleases).toHaveBeenLastCalledWith(
      {
        page: 1,
        pageSize: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
      expect.any(AbortSignal),
    );
  });

  it("shows a fallback message when release deletion fails without an Error", async () => {
    const user = userEvent.setup();
    configureDashboard([release]);
    vi.mocked(deleteRelease).mockRejectedValue("delete failed");
    render(<HomePage />);

    await user.click(
      await screen.findByRole("button", { name: "Delete Production API" }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "The release could not be deleted.",
    );
  });

  it("reports unavailable API health and version responses", async () => {
    vi.mocked(fetchHealth).mockRejectedValue(new Error("health unavailable"));
    vi.mocked(fetchVersion).mockRejectedValue(new Error("version unavailable"));
    render(<HomePage />);

    expect(await screen.findByText("API offline")).toBeTruthy();
    expect(screen.getByText("version unavailable")).toBeTruthy();
  });

  it("keeps the form open and shows a save error", async () => {
    const user = userEvent.setup();
    vi.mocked(createRelease).mockRejectedValue(new Error("Save failed"));
    render(<HomePage />);
    await user.click(
      await screen.findByRole("button", { name: "New release" }),
    );
    await user.type(screen.getByLabelText("Release name"), "Production API");
    await user.type(screen.getByLabelText("Version"), "v1.4.0");
    await user.click(screen.getByRole("button", { name: "Create release" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Save failed");
    expect(screen.getByLabelText("Release name")).toBeTruthy();
  });
});
