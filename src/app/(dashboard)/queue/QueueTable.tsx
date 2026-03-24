"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { QueueFill } from "./constants";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ─── Types ──────────────────────────────────────
type SortDir = "asc" | "desc" | null;
type ColKey = "rxId" | "patientName" | "phone" | "itemName" | "quantity" | "fillDate" | "tags" | "method" | "status";

const COLUMNS: { key: ColKey; label: string }[] = [
  { key: "rxId", label: "Rx" },
  { key: "patientName", label: "Patient" },
  { key: "phone", label: "Phone" },
  { key: "itemName", label: "Drug" },
  { key: "quantity", label: "Qty" },
  { key: "fillDate", label: "Due" },
  { key: "tags", label: "Tags" },
  { key: "method", label: "Method" },
  { key: "status", label: "Status" },
];

// ─── Sort arrow icon ────────────────────────────
function SortIcon({ dir }: { dir: SortDir }) {
  if (!dir) return <span className="text-gray-300 ml-1">&#8597;</span>;
  return <span className="text-[#40721D] ml-1">{dir === "asc" ? "▲" : "▼"}</span>;
}

// ─── Filter dropdown ────────────────────────────
function FilterDropdown({
  values,
  selected,
  onSelect,
  onClear,
  isOpen,
  onToggle,
}: {
  values: string[];
  selected: Set<string>;
  onSelect: (value: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (isOpen) onToggle();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onToggle]);

  const hasFilter = selected.size > 0;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded text-[10px] leading-none ${
          hasFilter
            ? "bg-[#40721D] text-white"
            : "text-gray-400 hover:text-gray-600"
        }`}
        title="Filter"
      >
        ▾
      </button>
      {isOpen && (
        <div className="absolute z-50 top-6 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px] max-h-[240px] overflow-hidden">
          {hasFilter && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="w-full text-left px-3 py-1.5 text-xs text-[#40721D] font-medium hover:bg-gray-50 border-b border-gray-100"
            >
              Clear filter
            </button>
          )}
          <div className="overflow-y-auto max-h-[200px]">
            {values.map((v) => (
              <label
                key={v}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selected.has(v)}
                  onChange={() => onSelect(v)}
                  className="rounded border-gray-300 text-[#40721D] focus:ring-[#40721D] w-3.5 h-3.5"
                />
                <span className="truncate">{v || "(empty)"}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Get value for sorting/filtering ────────────
function getCellValue(fill: QueueFill, key: ColKey): string {
  switch (key) {
    case "rxId": return fill.rxId;
    case "patientName": return fill.patientName;
    case "phone": return fill.phone || "";
    case "itemName": return fill.itemName;
    case "quantity": return String(fill.quantity);
    case "fillDate": return fill.fillDate || "";
    case "tags": return fill.tags.join(", ");
    case "method": return fill.method || "";
    case "status": return fill.status;
  }
}

// ─── Main component ─────────────────────────────
export default function QueueTable({ fills }: { fills: QueueFill[] }) {
  const [sortCol, setSortCol] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filters, setFilters] = useState<Record<ColKey, Set<string>>>({
    rxId: new Set(), patientName: new Set(), phone: new Set(), itemName: new Set(),
    quantity: new Set(), fillDate: new Set(), tags: new Set(), method: new Set(), status: new Set(),
  });
  const [openDropdown, setOpenDropdown] = useState<ColKey | null>(null);

  // Unique values per column (computed from all fills, not filtered)
  const uniqueValues = useMemo(() => {
    const result: Record<ColKey, string[]> = {
      rxId: [], patientName: [], phone: [], itemName: [],
      quantity: [], fillDate: [], tags: [], method: [], status: [],
    };
    for (const col of COLUMNS) {
      const set = new Set<string>();
      for (const fill of fills) {
        const v = getCellValue(fill, col.key);
        if (v) set.add(v);
      }
      result[col.key] = Array.from(set).sort();
    }
    return result;
  }, [fills]);

  // Handle sort click
  function handleSort(col: ColKey) {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortCol(null); setSortDir(null); }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  // Handle filter toggle
  function toggleFilter(col: ColKey, value: string) {
    setFilters((prev) => {
      const next = new Set(prev[col]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [col]: next };
    });
  }

  function clearFilter(col: ColKey) {
    setFilters((prev) => ({ ...prev, [col]: new Set<string>() }));
  }

  function clearAllFilters() {
    setFilters({
      rxId: new Set(), patientName: new Set(), phone: new Set(), itemName: new Set(),
      quantity: new Set(), fillDate: new Set(), tags: new Set(), method: new Set(), status: new Set(),
    });
  }

  // Filter then sort
  const processed = useMemo(() => {
    let result = fills.filter((fill) => {
      for (const col of COLUMNS) {
        const filterSet = filters[col.key];
        if (filterSet.size > 0) {
          const val = getCellValue(fill, col.key);
          if (!filterSet.has(val)) return false;
        }
      }
      return true;
    });

    if (sortCol && sortDir) {
      result = [...result].sort((a, b) => {
        let va = getCellValue(a, sortCol);
        let vb = getCellValue(b, sortCol);
        // Numeric sort for quantity
        if (sortCol === "quantity") {
          return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
        }
        // Date sort
        if (sortCol === "fillDate") {
          const da = va ? new Date(va).getTime() : 0;
          const db = vb ? new Date(vb).getTime() : 0;
          return sortDir === "asc" ? da - db : db - da;
        }
        // String sort
        va = va.toLowerCase();
        vb = vb.toLowerCase();
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [fills, filters, sortCol, sortDir]);

  const hasActiveFilters = Object.values(filters).some((s) => s.size > 0);

  return (
    <div>
      {/* Active filter bar */}
      {hasActiveFilters && (
        <div className="px-4 py-2 bg-[#40721D]/5 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs text-[#40721D] font-medium">
            Showing {processed.length} of {fills.length} fills
          </span>
          <button
            onClick={clearAllFilters}
            className="text-xs text-[#40721D] hover:text-[#2d5114] font-medium underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-100">
              {COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  className={`text-left px-3 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider select-none whitespace-nowrap ${
                    i > 0 ? "border-l border-gray-200" : ""
                  }`}
                >
                  <span
                    className="cursor-pointer hover:text-gray-800 inline-flex items-center"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon dir={sortCol === col.key ? sortDir : null} />
                  </span>
                  <FilterDropdown
                    values={uniqueValues[col.key]}
                    selected={filters[col.key]}
                    onSelect={(v) => toggleFilter(col.key, v)}
                    onClear={() => clearFilter(col.key)}
                    isOpen={openDropdown === col.key}
                    onToggle={() => setOpenDropdown(openDropdown === col.key ? null : col.key)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No fills match your filters
                </td>
              </tr>
            ) : (
              processed.map((fill, rowIdx) => (
                <tr
                  key={fill.fillId}
                  className={`border-b border-gray-200 hover:bg-[#40721D]/5 transition-colors ${
                    rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                  }`}
                >
                  {/* RX — monospace, bold, green accent */}
                  <td className="px-3 py-2.5">
                    <span className="text-sm font-mono font-bold text-[#40721D]">{fill.rxId}</span>
                  </td>
                  {/* Patient — bold black, key identifier */}
                  <td className="px-3 py-2.5 border-l border-gray-100">
                    <span className="text-sm font-semibold text-gray-900">{fill.patientName}</span>
                  </td>
                  {/* Phone — muted, smaller */}
                  <td className="px-3 py-2.5 border-l border-gray-100">
                    <span className="text-xs text-gray-500 font-mono">{fill.phone || "—"}</span>
                  </td>
                  {/* Drug — regular weight, slightly emphasized */}
                  <td className="px-3 py-2.5 border-l border-gray-200" style={{ maxWidth: "300px" }}>
                    <span className="text-sm text-gray-700 line-clamp-1">{fill.itemName}</span>
                  </td>
                  {/* Qty — centered, bold */}
                  <td className="px-3 py-2.5 border-l border-gray-100 text-center">
                    <span className="text-sm font-bold text-gray-800">{fill.quantity}</span>
                  </td>
                  {/* Due — date styling */}
                  <td className="px-3 py-2.5 border-l border-gray-100 whitespace-nowrap">
                    <span className="text-xs text-gray-500">{formatDate(fill.fillDate)}</span>
                  </td>
                  {/* Tags — pills */}
                  <td className="px-3 py-2.5 border-l border-gray-200">
                    <div className="flex flex-wrap gap-1">
                      {fill.tags.length > 0 ? fill.tags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          {tag}
                        </span>
                      )) : <span className="text-gray-300 text-xs">—</span>}
                    </div>
                  </td>
                  {/* Method — green pill */}
                  <td className="px-3 py-2.5 border-l border-gray-100">
                    {fill.method ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                        {fill.method}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  {/* Status — colored pill */}
                  <td className="px-3 py-2.5 border-l border-gray-200">
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {fill.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
