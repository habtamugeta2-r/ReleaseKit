import type { ReleaseStatus } from "./types";

export const RELEASE_PAGE_SIZE = 20;

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  DRAFT: "Draft",
  DEPLOYING: "Deploying",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
};

export const RELEASE_STATUSES = Object.keys(
  RELEASE_STATUS_LABELS,
) as ReleaseStatus[];

export const RELEASE_SORT_OPTIONS = [
  {
    value: "createdAt:desc",
    label: "Newest first",
    sortBy: "createdAt",
    sortOrder: "desc",
  },
  {
    value: "createdAt:asc",
    label: "Oldest first",
    sortBy: "createdAt",
    sortOrder: "asc",
  },
  { value: "name:asc", label: "Name A–Z", sortBy: "name", sortOrder: "asc" },
  { value: "name:desc", label: "Name Z–A", sortBy: "name", sortOrder: "desc" },
  {
    value: "version:desc",
    label: "Version, highest first",
    sortBy: "version",
    sortOrder: "desc",
  },
  {
    value: "status:asc",
    label: "Status A–Z",
    sortBy: "status",
    sortOrder: "asc",
  },
] as const;
