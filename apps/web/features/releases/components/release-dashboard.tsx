"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type Release,
  type ReleaseInput,
  type ReleaseQuery,
  type ReleaseStatus,
} from "../types";
import {
  createRelease,
  deleteRelease,
  fetchReleases,
  updateRelease,
} from "../api";
import { fetchHealth, fetchVersion } from "../../operations/api";
import { DashboardFooter, DashboardOverview } from "./dashboard-overview";
import { ReleaseRegister } from "./release-register";
import { RELEASE_PAGE_SIZE } from "../constants";

export function ReleaseDashboard() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [total, setTotal] = useState(0);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [version, setVersion] = useState<string>();
  const [pageError, setPageError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [formRelease, setFormRelease] = useState<Release | null | undefined>();
  const [busyId, setBusyId] = useState<string>();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReleaseStatus | "">("");
  const [sortBy, setSortBy] =
    useState<NonNullable<ReleaseQuery["sortBy"]>>("createdAt");
  const [sortOrder, setSortOrder] =
    useState<NonNullable<ReleaseQuery["sortOrder"]>>("desc");

  const loadReleases = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const result = await fetchReleases(
          {
            page,
            pageSize: RELEASE_PAGE_SIZE,
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(search ? { search } : {}),
            sortBy,
            sortOrder,
          },
          signal,
        );
        if (signal?.aborted) return;
        setReleases(result.items);
        setTotal(result.total);
        setPageError(undefined);
      } catch (error) {
        if (signal?.aborted) return;
        setPageError(
          error instanceof Error
            ? error.message
            : "Release data could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, search, sortBy, sortOrder, statusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadReleases(controller.signal);
    return () => controller.abort();
  }, [loadReleases]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.allSettled([
      fetchHealth(controller.signal),
      fetchVersion(controller.signal),
    ]).then(([healthResult, versionResult]) => {
      if (controller.signal.aborted) return;
      setApiStatus(
        healthResult.status === "fulfilled" &&
          healthResult.value.status === "ok"
          ? "online"
          : "offline",
      );
      setVersion(
        versionResult.status === "fulfilled"
          ? versionResult.value.version
          : undefined,
      );
    });
    return () => controller.abort();
  }, []);

  async function saveRelease(input: ReleaseInput) {
    if (formRelease) {
      await updateRelease(formRelease.id, input);
    } else {
      await createRelease(input);
    }
    setFormRelease(undefined);
    if (page !== 1) {
      setPage(1);
      return;
    }
    await loadReleases();
  }

  async function removeRelease(release: Release) {
    setBusyId(release.id);
    setPageError(undefined);
    try {
      await deleteRelease(release.id);
      if (releases.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadReleases();
      }
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "The release could not be deleted.",
      );
    } finally {
      setBusyId(undefined);
    }
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setPage(1);
  }

  return (
    <main className="page-shell">
      <DashboardOverview
        apiStatus={apiStatus}
        total={total}
        version={version}
      />
      <ReleaseRegister
        releases={releases}
        total={total}
        page={page}
        pageSize={RELEASE_PAGE_SIZE}
        loading={loading}
        error={pageError}
        formRelease={formRelease}
        busyId={busyId}
        searchInput={searchInput}
        statusFilter={statusFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onOpenCreate={() => setFormRelease(null)}
        onOpenEdit={setFormRelease}
        onCloseForm={() => setFormRelease(undefined)}
        onSave={saveRelease}
        onDelete={(release) => void removeRelease(release)}
        onRetry={() => void loadReleases()}
        onSearchInputChange={setSearchInput}
        onSearch={() => {
          setPage(1);
          setSearch(searchInput.trim());
        }}
        onStatusChange={(status) => {
          setPage(1);
          setStatusFilter(status);
        }}
        onSortChange={(nextSortBy, nextSortOrder) => {
          if (nextSortBy && nextSortOrder) {
            setPage(1);
            setSortBy(nextSortBy);
            setSortOrder(nextSortOrder);
          }
        }}
        onPageChange={setPage}
        onClearFilters={clearFilters}
      />
      <DashboardFooter />
    </main>
  );
}
