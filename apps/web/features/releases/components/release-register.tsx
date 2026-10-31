import type {
  Release,
  ReleaseInput,
  ReleaseQuery,
  ReleaseStatus,
} from "../types";
import { ReleaseForm } from "./release-form";
import { ReleaseResults } from "./release-results";
import { ReleaseToolbar } from "./release-toolbar";

type ReleaseRegisterProps = {
  releases: Release[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error?: string;
  formRelease: Release | null | undefined;
  busyId?: string;
  searchInput: string;
  statusFilter: ReleaseStatus | "";
  sortBy: NonNullable<ReleaseQuery["sortBy"]>;
  sortOrder: NonNullable<ReleaseQuery["sortOrder"]>;
  onOpenCreate: () => void;
  onOpenEdit: (release: Release) => void;
  onCloseForm: () => void;
  onSave: (input: ReleaseInput) => Promise<void>;
  onDelete: (release: Release) => void;
  onRetry: () => void;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onStatusChange: (status: ReleaseStatus | "") => void;
  onSortChange: (
    sortBy: ReleaseQuery["sortBy"],
    sortOrder: ReleaseQuery["sortOrder"],
  ) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
};

export function ReleaseRegister({
  releases,
  total,
  page,
  pageSize,
  loading,
  error,
  formRelease,
  busyId,
  searchInput,
  statusFilter,
  sortBy,
  sortOrder,
  onOpenCreate,
  onOpenEdit,
  onCloseForm,
  onSave,
  onDelete,
  onRetry,
  onSearchInputChange,
  onSearch,
  onStatusChange,
  onSortChange,
  onPageChange,
  onClearFilters,
}: ReleaseRegisterProps) {
  return (
    <section
      className="release-section"
      aria-labelledby="release-heading"
      aria-busy={loading}
    >
      <div className="section-heading release-heading">
        <div>
          <p className="eyebrow">Release register</p>
          <h2 id="release-heading">Recent releases</h2>
        </div>
        <button className="button button-primary" onClick={onOpenCreate}>
          <span aria-hidden="true">+</span> New release
        </button>
      </div>

      {formRelease !== undefined && (
        <ReleaseForm
          key={formRelease?.id ?? "new"}
          initial={formRelease ?? undefined}
          onCancel={onCloseForm}
          onSave={onSave}
        />
      )}

      <ReleaseToolbar
        searchInput={searchInput}
        statusFilter={statusFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSearchInputChange={onSearchInputChange}
        onSearch={onSearch}
        onStatusChange={onStatusChange}
        onSortChange={onSortChange}
      />

      {loading && releases.length > 0 && (
        <p className="results-loading" role="status">
          Updating release results…
        </p>
      )}

      <ReleaseResults
        releases={releases}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onClearFilters={onClearFilters}
        onCreate={onOpenCreate}
        onEdit={onOpenEdit}
        onDelete={onDelete}
        busyId={busyId}
        onPageChange={onPageChange}
      />
    </section>
  );
}
