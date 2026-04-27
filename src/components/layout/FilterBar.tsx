import type { ReactNode } from "react";

/**
 * FilterBar — the unified toolbar for every landing page.
 *
 * BNDS PMS Redesign — paper card with line border. Search slot uses inline
 * input with leading icon and ⌘K hint when populated by the SearchBar
 * component; filters render as segmented pills/chips, right slot is for
 * export, sort, refresh, bulk-action buttons.
 */
export interface FilterBarProps {
  search?: ReactNode;
  filters?: ReactNode;
  right?: ReactNode;
}

export default function FilterBar({ search, filters, right }: FilterBarProps) {
  return (
    <div
      className="flex items-center gap-3 flex-wrap rounded-lg"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e3ddd1",
        padding: "10px 14px",
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
