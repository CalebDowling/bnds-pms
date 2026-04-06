"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getRefillCandidates,
  processBatchRefills,
  type RefillCandidate,
  type BatchRefillResult,
} from "./actions";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BatchRefillPage() {
  const [candidates, setCandidates] = useState<RefillCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("overdue_first");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<BatchRefillResult[] | null>(null);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRefillCandidates({ search, filter, sortBy });
      setCandidates(data);
    } catch (err) {
      console.error("Failed to load candidates:", err);
    } finally {
      setLoading(false);
    }
  }, [search, filter, sortBy]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((c) => c.id)));
    }
  }

  function selectOverdue() {
    setSelected(new Set(candidates.filter((c) => c.isOverdue).map((c) => c.id)));
  }

  function selectDueSoon() {
    setSelected(
      new Set(candidates.filter((c) => c.isOverdue || c.isDueSoon).map((c) => c.id))
    );
  }

  async function handleBatchProcess() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Process ${selected.size} refill${selected.size !== 1 ? "s" : ""}? This will create pending fills for each selected prescription.`
      )
    )
      return;

    setProcessing(true);
    try {
      const batchResults = await processBatchRefills(Array.from(selected));
      setResults(batchResults);
      setSelected(new Set());
      await loadCandidates();
    } catch (err) {
      console.error("Batch process failed:", err);
      alert("Failed to process batch refills");
    } finally {
      setProcessing(false);
    }
  }

  const overdueCount = candidates.filter((c) => c.isOverdue).length;
  const dueSoonCount = candidates.filter((c) => c.isDueSoon).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Refills</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select prescriptions and process multiple refills at once
          </p>
        </div>
        <Link
          href="/prescriptions"
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to Prescriptions
        </Link>
      </div>

      {/* Results Banner */}
      {results && (
        <div className="mb-4 rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Batch Results — {results.filter((r) => r.success).length} of{" "}
              {results.length} successful
            </h3>
            <button
              onClick={() => setResults(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-1">
            {results.map((r) => (
              <div
                key={r.prescriptionId}
                className={`flex items-center gap-2 text-sm ${
                  r.success ? "text-green-700" : "text-red-600"
                }`}
              >
                <span>{r.success ? "✓" : "✗"}</span>
                <span className="font-mono">{r.rxNumber}</span>
                <span>{r.patientName}</span>
                {r.success ? (
                  <span className="text-green-500 text-xs">
                    Fill #{r.fillNumber} created
                  </span>
                ) : (
                  <span className="text-red-400 text-xs">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Eligible</p>
          <p className="text-2xl font-bold text-gray-900">{candidates.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs font-semibold text-red-400 uppercase">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs font-semibold text-amber-400 uppercase">Due Soon</p>
          <p className="text-2xl font-bold text-amber-600">{dueSoonCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#40721D]/20 p-4">
          <p className="text-xs font-semibold text-[#40721D] uppercase">Selected</p>
          <p className="text-2xl font-bold text-[#40721D]">{selected.size}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Rx#, patient, drug..."
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] w-72"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
        >
          <option value="all">All Eligible</option>
          <option value="overdue">Overdue Only</option>
          <option value="due_soon">Due Soon + Overdue</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
        >
          <option value="overdue_first">Overdue First</option>
          <option value="patient">By Patient</option>
          <option value="drug">By Drug</option>
        </select>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={selectOverdue}
            className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            Select Overdue ({overdueCount})
          </button>
          <button
            onClick={selectDueSoon}
            className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Select Due ({overdueCount + dueSoonCount})
          </button>
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {selected.size === candidates.length ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>

      {/* Process Button */}
      {selected.size > 0 && (
        <div className="bg-[#40721D]/5 border border-[#40721D]/20 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-[#40721D] font-medium">
            {selected.size} prescription{selected.size !== 1 ? "s" : ""} selected
            for batch refill
          </span>
          <button
            onClick={handleBatchProcess}
            disabled={processing}
            className="px-5 py-2 bg-[#40721D] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5114] disabled:opacity-50 transition-colors"
          >
            {processing
              ? "Processing..."
              : `Process ${selected.size} Refill${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">
          Loading eligible prescriptions...
        </div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">💊</p>
          <p className="text-sm text-gray-400">
            No prescriptions eligible for refill
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.size === candidates.length && candidates.length > 0}
                    onChange={selectAll}
                    className="rounded border-gray-300 text-[#40721D] focus:ring-[#40721D]"
                  />
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Rx #
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Patient
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Drug
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Last Fill
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Days Since
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Supply
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Refills Left
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Prescriber
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {candidates.map((rx) => (
                <tr
                  key={rx.id}
                  onClick={() => toggleSelect(rx.id)}
                  className={`cursor-pointer transition-colors ${
                    selected.has(rx.id)
                      ? "bg-green-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(rx.id)}
                      onChange={() => toggleSelect(rx.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 text-[#40721D] focus:ring-[#40721D]"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {rx.isOverdue ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">
                        OVERDUE
                      </span>
                    ) : rx.isDueSoon ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700">
                        DUE SOON
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-mono text-gray-600">
                    {rx.rxNumber}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-900">
                    {rx.patientName}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm text-gray-900">{rx.drugName}</p>
                    {rx.strength && (
                      <p className="text-xs text-gray-400">{rx.strength}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">
                    {formatDate(rx.lastFillDate)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-sm font-medium ${
                        rx.isOverdue
                          ? "text-red-600"
                          : rx.isDueSoon
                          ? "text-amber-600"
                          : "text-gray-600"
                      }`}
                    >
                      {rx.daysSinceLastFill !== null ? rx.daysSinceLastFill : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">
                    {rx.daysSupply || "—"} days
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-sm font-medium text-gray-900">
                      {rx.refillsRemaining}
                    </span>
                    <span className="text-xs text-gray-400">
                      /{rx.refillsAuthorized}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">
                    {rx.prescriberName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
