"use client";

import { useState, useMemo } from "react";
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

/** Inline filter input shown under each column header */
function ColumnFilter({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full mt-1.5 px-2 py-1 text-xs font-normal normal-case tracking-normal border border-gray-200 rounded bg-white text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#40721D] focus:ring-1 focus:ring-[#40721D]/20"
    />
  );
}

export default function QueueTable({ fills }: { fills: QueueFill[] }) {
  const [filters, setFilters] = useState({
    rxId: "",
    patientName: "",
    phone: "",
    itemName: "",
    quantity: "",
    fillDate: "",
    tags: "",
    method: "",
    status: "",
  });

  function setFilter(key: keyof typeof filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const filtered = useMemo(() => {
    return fills.filter((fill) => {
      const match = (value: string | null | undefined, filter: string) => {
        if (!filter) return true;
        return (value || "").toLowerCase().includes(filter.toLowerCase());
      };

      return (
        match(fill.rxId, filters.rxId) &&
        match(fill.patientName, filters.patientName) &&
        match(fill.phone, filters.phone) &&
        match(fill.itemName, filters.itemName) &&
        match(String(fill.quantity), filters.quantity) &&
        match(fill.fillDate, filters.fillDate) &&
        match(fill.tags.join(", "), filters.tags) &&
        match(fill.method, filters.method) &&
        match(fill.status, filters.status)
      );
    });
  }, [fills, filters]);

  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0);

  return (
    <div>
      {/* Filter summary bar */}
      {hasActiveFilters && (
        <div className="px-4 py-2 bg-[#40721D]/5 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs text-[#40721D] font-medium">
            Showing {filtered.length} of {fills.length} fills
          </span>
          <button
            onClick={() =>
              setFilters({
                rxId: "", patientName: "", phone: "", itemName: "",
                quantity: "", fillDate: "", tags: "", method: "", status: "",
              })
            }
            className="text-xs text-[#40721D] hover:text-[#2d5114] font-medium underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Rx
                <ColumnFilter value={filters.rxId} onChange={(v) => setFilter("rxId", v)} placeholder="Filter..." />
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Patient
                <ColumnFilter value={filters.patientName} onChange={(v) => setFilter("patientName", v)} placeholder="Filter..." />
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Phone
                <ColumnFilter value={filters.phone} onChange={(v) => setFilter("phone", v)} placeholder="Filter..." />
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Drug
                <ColumnFilter value={filters.itemName} onChange={(v) => setFilter("itemName", v)} placeholder="Filter..." />
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Qty
                <ColumnFilter value={filters.quantity} onChange={(v) => setFilter("quantity", v)} placeholder="Filter..." />
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Due
                <ColumnFilter value={filters.fillDate} onChange={(v) => setFilter("fillDate", v)} placeholder="Filter..." />
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tags
                <ColumnFilter value={filters.tags} onChange={(v) => setFilter("tags", v)} placeholder="Filter..." />
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Method
                <ColumnFilter value={filters.method} onChange={(v) => setFilter("method", v)} placeholder="Filter..." />
              </th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
                <ColumnFilter value={filters.status} onChange={(v) => setFilter("status", v)} placeholder="Filter..." />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No fills match your filters
                </td>
              </tr>
            ) : (
              filtered.map((fill) => (
                <tr key={fill.fillId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-semibold text-gray-700">{fill.rxId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{fill.patientName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{fill.phone || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{fill.itemName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{fill.quantity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{formatDate(fill.fillDate)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {fill.tags.length > 0 ? fill.tags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {tag}
                        </span>
                      )) : <span className="text-gray-300 text-sm">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {fill.method ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-green-50 text-green-700 border border-green-200">
                        {fill.method}
                      </span>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
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
