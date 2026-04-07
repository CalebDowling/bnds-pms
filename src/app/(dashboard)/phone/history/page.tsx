"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getCallHistoryAction } from "../actions";
import type { CallRecord, CallHistoryResult } from "../actions";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds === 0) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function outcomeBadge(outcome: string): { label: string; color: string } {
  switch (outcome) {
    case "answered":
      return { label: "Answered", color: "bg-green-100 text-green-700" };
    case "missed":
      return { label: "Missed", color: "bg-red-100 text-red-700" };
    case "voicemail":
      return { label: "Voicemail", color: "bg-purple-100 text-purple-700" };
    case "transferred":
      return { label: "Transferred", color: "bg-blue-100 text-blue-700" };
    case "abandoned":
      return { label: "Abandoned", color: "bg-gray-100 text-gray-600" };
    case "no-answer":
      return { label: "No Answer", color: "bg-yellow-100 text-yellow-700" };
    case "busy":
      return { label: "Busy", color: "bg-orange-100 text-orange-700" };
    default:
      return { label: outcome, color: "bg-gray-100 text-gray-600" };
  }
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case "refill":
      return "Refill";
    case "status":
      return "Rx Status";
    case "pharmacist":
      return "Pharmacist";
    case "billing":
      return "Billing";
    case "shipping":
      return "Shipping";
    default:
      return "General";
  }
}

// ---------------------------------------------------------------------------
// Stats Row
// ---------------------------------------------------------------------------

function HistoryStats({ records, total }: { records: CallRecord[]; total: number }) {
  const answered = records.filter((r) => r.outcome === "answered").length;
  const missed = records.filter((r) => ["missed", "no-answer", "busy"].includes(r.outcome)).length;
  const avgDuration =
    records.length > 0
      ? Math.floor(
          records.reduce((sum, r) => sum + r.durationSeconds, 0) / records.length
        )
      : 0;
  const answerRate = total > 0 ? Math.round(((total - missed) / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Total Calls
        </span>
        <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Answer Rate
        </span>
        <p className="text-2xl font-bold text-gray-900 mt-1">{answerRate}%</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Avg Duration
        </span>
        <p className="text-2xl font-bold text-gray-900 mt-1">{formatDuration(avgDuration)}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Missed Calls
        </span>
        <p className={`text-2xl font-bold mt-1 ${missed > 0 ? "text-red-600" : "text-gray-900"}`}>
          {missed}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CallHistoryPage() {
  const [result, setResult] = useState<CallHistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCallHistoryAction({
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setResult(data);
    } catch (err) {
      console.error("Failed to load call history:", err);
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const records = result?.records ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/phone"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Phone Dashboard
            </Link>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium text-gray-900">Call History</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Call History</h1>
        </div>
        <Link
          href="/phone"
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#40721D] text-white hover:bg-[#345e17] transition-colors"
        >
          Back to Live Calls
        </Link>
      </div>

      {/* Stats */}
      <HistoryStats records={records} total={total} />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Name or phone number..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none"
            />
          </div>
          {/* Start date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none"
            />
          </div>
          {/* End date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none"
            />
          </div>
          {/* Clear */}
          {(search || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
                setPage(0);
              }}
              className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Date / Time
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Caller
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reason
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Duration
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Handled By
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Outcome
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && records.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <p className="text-sm font-medium">No call records found</p>
                    <p className="text-xs text-gray-400 mt-1">Adjust your filters or check back later</p>
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const { label: outcomeLabel, color: outcomeColor } = outcomeBadge(record.outcome);
                  return (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {formatDateTime(record.startedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {record.callerName ?? formatPhone(record.callerPhone)}
                          </p>
                          {record.callerName && (
                            <p className="text-xs text-gray-500">
                              {formatPhone(record.callerPhone)}
                            </p>
                          )}
                          {record.patientMrn && (
                            <p className="text-xs text-[#40721D] font-medium">
                              MRN: {record.patientMrn}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {reasonLabel(record.reason)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono tabular-nums text-gray-600">
                        {formatDuration(record.durationSeconds)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {record.handledByName ?? "--"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${outcomeColor}`}
                        >
                          {outcomeLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing {page * pageSize + 1}--{Math.min((page + 1) * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-2 text-xs text-gray-500">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
