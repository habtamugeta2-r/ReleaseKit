import type { Release } from "../types";
import { RELEASE_STATUS_LABELS } from "../constants";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type ReleaseResultsProps = {
  releases: Release[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onClearFilters: () => void;
  onCreate: () => void;
  onEdit: (release: Release) => void;
  onDelete: (release: Release) => void;
  busyId?: string;
  onPageChange: (page: number) => void;
};

export function ReleaseResults({
  releases,
  total,
  page,
  pageSize,
  loading,
  error,
  onRetry,
  onClearFilters,
  onCreate,
  onEdit,
  onDelete,
  busyId,
  onPageChange,
}: ReleaseResultsProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      {error && (
        <div className="notice notice-error" role="alert">
          <span>{error}</span>
          <button className="text-button" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {loading && releases.length === 0 && !error ? (
        <div className="empty-state" aria-live="polite">
          <p>Loading release data…</p>
        </div>
      ) : !error && releases.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ↗
          </span>
          <h3>{total > 0 ? "No matching releases" : "No releases yet"}</h3>
          <p>
            {total > 0
              ? "Try a different search or status filter."
              : "Create a release record to start tracking changes through your delivery pipeline."}
          </p>
          {total > 0 ? (
            <button
              className="button button-secondary"
              onClick={onClearFilters}
            >
              Clear filters
            </button>
          ) : (
            <button className="button button-secondary" onClick={onCreate}>
              Create your first release
            </button>
          )}
        </div>
      ) : (
        <div className="release-list">
          {releases.map((release) => (
            <article className="release-card" key={release.id}>
              <div className="release-main">
                <div className="release-title-row">
                  <h3>{release.name}</h3>
                  <span className="release-version">{release.version}</span>
                </div>
                <p className="release-description">
                  {release.description || "No release notes added."}
                </p>
                <p className="release-date">
                  Updated {formatDate(release.updatedAt)}
                </p>
              </div>
              <div className="release-actions">
                <span
                  className={`status-badge status-${release.status.toLowerCase()}`}
                >
                  <span className="status-dot" />
                  {RELEASE_STATUS_LABELS[release.status]}
                </span>
                <button
                  className="text-button"
                  onClick={() => onEdit(release)}
                  aria-label={`Edit ${release.name}`}
                >
                  Edit
                </button>
                <button
                  className="text-button text-danger"
                  onClick={() => onDelete(release)}
                  disabled={busyId === release.id}
                  aria-label={`Delete ${release.name}`}
                >
                  {busyId === release.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!error && total > 0 && (
        <nav className="pagination" aria-label="Release pages">
          <p>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="pagination-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </button>
            <span aria-current="page">
              Page {page} of {pageCount}
            </span>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pageCount || loading}
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
