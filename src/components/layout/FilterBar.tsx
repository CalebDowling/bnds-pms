import type { ReactNode } from "react";

/**
 * FilterBar — the unified toolbar for every landing page.
 *
 * Renders a card-styled row with three flexible slots:
 *   - `search`  (left)   — usually a <SearchBar>
 *   - `filters` (middle) — status pills, tabs, or category chips
 *   - `right`   (right)  — export, sort, refresh, bulk-action buttons
 *
 * Any slot can be omitted. Responsive: wraps to multiple rows on small screens.
 *
 * Usage:
 *   <FilterBar
 *     search={<SearchBar placeholder="Search patients..." />}
 *     filters={<StatusPills options={STATUS_OPTIONS} />}
 *     right={<ExportButton />}
 *   />
 */
export interface FilterBarProps {
  search?: ReactNode;
  filters?: ReactNode;
  right?: ReactNode;
}

export default function FilterBar({ search, filters, right }: FilterBarProps) {
  return (
    <div
      className="flex items-center gap-3 flex-wrap rounded-lg px-4 py-3"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--border)",
      }}
    >
      {search && <div className="flex-shrink-0 min-w-0">{search}</div>}
      {filters && (
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          {filters}
        </div>
      )}
      {right && (
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {right}
        </div>
      )}
    </div>
  );
}
