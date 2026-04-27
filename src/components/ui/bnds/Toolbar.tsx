"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";

export interface ToolbarTab {
  id: string;
  label: string;
  count?: number;
  dot?: "ok" | "warn" | "danger" | "info";
}

const DOT_COLOR = {
  ok: "#5aa845",
  warn: "#c98a14",
  danger: "#b83a2f",
  info: "#2b6c9b",
};

/**
 * Toolbar matching the BNDS PMS Redesign — segmented tabs (with optional count badge),
 * filters slot, search slot, right slot.
 */
export function Toolbar({
  tabs,
  active,
  onChange,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  right,
}: {
  tabs?: ToolbarTab[];
  active?: string;
  onChange?: (id: string) => void;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 flex-wrap"
      style={{
        padding: "12px 24px",
        borderBottom: "1px solid #e3ddd1",
        backgroundColor: "#faf8f4",
      }}
    >
      {tabs && tabs.length > 0 && (
        <div
          className="inline-flex items-center gap-0.5 p-0.5 rounded-md"
          style={{ backgroundColor: "#ece4d3", border: "1px solid #d9d2c2" }}
        >
          {tabs.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => onChange?.(t.id)}
                className="inline-flex items-center gap-1.5 rounded-[5px] transition-all"
                style={{
                  padding: "5px 11px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: isActive ? "#0f2e1f" : "#5a6b58",
                  backgroundColor: isActive ? "#ffffff" : "transparent",
                  boxShadow: isActive
                    ? "0 1px 2px rgba(15, 46, 31, 0.08)"
                    : "none",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t.dot && (
                  <span
                    className="inline-block rounded-full"
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: DOT_COLOR[t.dot],
                    }}
                  />
                )}
                {t.label}
                {typeof t.count === "number" && (
                  <span
                    style={{
                      fontSize: 10.5,
                      padding: "1px 6px",
                      borderRadius: 999,
                      backgroundColor: isActive
                        ? "rgba(31, 90, 58, 0.10)"
                        : "rgba(15, 46, 31, 0.05)",
                      color: isActive ? "#1f5a3a" : "#7a8a78",
                      fontWeight: 600,
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {(onSearchChange !== undefined || search !== undefined) && (
        <div
          className="inline-flex items-center gap-2 rounded-md flex-1 min-w-[240px] max-w-[480px]"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e3ddd1",
            padding: "6px 10px",
          }}
        >
          <Search size={14} style={{ color: "#7a8a78" }} strokeWidth={2} />
          <input
            value={search ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 border-none bg-transparent outline-none"
            style={{
              fontSize: 13,
              color: "#0f2e1f",
              fontFamily:
                "var(--font-inter), 'Inter Tight', Inter, system-ui, sans-serif",
            }}
          />
          <kbd
            className="hidden sm:inline-flex items-center justify-center rounded"
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 5px",
              backgroundColor: "#ece4d3",
              color: "#7a8a78",
              border: "1px solid #d9d2c2",
              fontFamily:
                "var(--font-mono), 'JetBrains Mono', monospace",
            }}
          >
            ⌘K
          </kbd>
        </div>
      )}

      {filters && (
        <div className="flex items-center gap-2 flex-wrap">{filters}</div>
      )}

      {right && (
        <div className="ml-auto flex items-center gap-2">{right}</div>
      )}
    </div>
  );
}

export default Toolbar;
