import type { ReleaseQuery, ReleaseStatus } from "../types";
import {
  RELEASE_SORT_OPTIONS,
  RELEASE_STATUS_LABELS,
  RELEASE_STATUSES,
} from "../constants";

type ReleaseToolbarProps = {
  searchInput: string;
  statusFilter: ReleaseStatus | "";
  sortBy: NonNullable<ReleaseQuery["sortBy"]>;
  sortOrder: NonNullable<ReleaseQuery["sortOrder"]>;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onStatusChange: (value: ReleaseStatus | "") => void;
  onSortChange: (
    sortBy: ReleaseQuery["sortBy"],
    sortOrder: ReleaseQuery["sortOrder"],
  ) => void;
};

export function ReleaseToolbar({
  searchInput,
  statusFilter,
  sortBy,
  sortOrder,
  onSearchInputChange,
  onSearch,
  onStatusChange,
  onSortChange,
}: ReleaseToolbarProps) {
  return (
    <form
      className="release-toolbar"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <label className="search-field">
        <span className="visually-hidden">Search releases</span>
        <input
          type="search"
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="Search by name or version"
          maxLength={120}
        />
      </label>
      <button className="button button-secondary" type="submit">
        Search
      </button>
      <label className="filter-field">
        <span className="visually-hidden">Filter by status</span>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(event) => {
            const value = event.currentTarget.value;
            onStatusChange(
              RELEASE_STATUSES.find((status) => status === value) ?? "",
            );
          }}
        >
          <option value="">All statuses</option>
          {Object.entries(RELEASE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span className="visually-hidden">Sort releases</span>
        <select
          aria-label="Sort releases"
          value={`${sortBy}:${sortOrder}`}
          onChange={(event) => {
            const option = RELEASE_SORT_OPTIONS.find(
              (item) => item.value === event.currentTarget.value,
            );
            if (option) {
              onSortChange(option.sortBy, option.sortOrder);
            }
          }}
        >
          {RELEASE_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
