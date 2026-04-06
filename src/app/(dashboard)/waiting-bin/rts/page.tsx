"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getRtsDashboard,
  processReturn,
  processBatchReturn,
  getRtsHistoryAction,
  type RtsDashboardData,
} from "./actions";
import type { RtsHistoryEntry } from "@/lib/workflow/return-to-stock";

type Tab = "candidates" | "history";

export default function RtsPage() {
  const [tab, setTab] = useState<Tab>("candidates");
  const [dashboard, setDashboard] = useState<RtsDashboardData | null>(null);
  const [history, setHistory] = useState<RtsHistoryEntry[]>([]);
  const [threshold, setThreshold] = useState(14);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"single" | "batch">("single");
  const [confirmFillId, setConfirmFillId] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRtsDashboard(threshold);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load RTS data");
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await getRtsHistoryAction();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  // ── Selection handlers ──

  const toggleSelect = (fillId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fillId)) next.delete(fillId);
      else next.add(fillId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!dashboard) return;
    if (selected.size === dashboard.candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(dashboard.candidates.map((c) => c.fillId)));
    }
  };

  // ── Confirm + Process ──

  const handleSingleRts = (fillId: string) => {
    setConfirmAction("single");
    setConfirmFillId(fillId);
    setShowConfirm(true);
  };

  const handleBatchRts = () => {
    if (selected.size === 0) return;
    setConfirmAction("batch");
    setShowConfirm(true);
  };

  const executeRts = async () => {
    setShowConfirm(false);
    setError("");
    setSuccess("");

    if (confirmAction === "single") {
      setProcessing(confirmFillId);
      try {
        const result = await processReturn(confirmFillId);
        if (result.success) {
          setSuccess(
            `Returned to stock. Claim reversed: ${result.claimReversed ? "Yes" : "No"}. ` +
            `Inventory restocked: ${result.inventoryRestocked ? "Yes" : "No"}. ` +
            `Patient notified: ${result.patientNotified ? "Yes" : "No"}.`
          );
          selected.delete(confirmFillId);
          setSelected(new Set(selected));
        } else {
          setError(result.error || "Failed to process return");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "RTS failed");
      } finally {
        setProcessing(null);
        loadDashboard();
      }
    } else {
      setBatchProcessing(true);
      try {
        const fillIds = Array.from(selected);
        const result = await processBatchReturn(fillIds);
        setSuccess(
          `Batch RTS complete: ${result.succeeded}/${result.total} succeeded, ${result.failed} failed.`
        );
        setSelected(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Batch RTS failed");
      } finally {
        setBatchProcessing(false);
        loadDashboard();
      }
    }
  };

  // ── Render ──

  if (loading && !dashboard) {
    return <div className="text-center py-12 text-gray-500">Loading RTS data...</div>;
  }

  const stats = dashboard?.stats;
  const candidates = dashboard?.candidates || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Return to Stock</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage prescriptions that have exceeded the waiting bin threshold
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Threshold:</label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
          >
            <option value={7}>7 days</option>
            <option value={10}>10 days</option>
            <option value={14}>14 days</option>
            <option value={21}>21 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-500 hover:text-red-700 font-bold">x</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
          <button onClick={() => setSuccess("")} className="ml-2 text-green-500 hover:text-green-700 font-bold">x</button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Candidates for RTS</p>
            <p className={`text-2xl font-bold mt-1 ${stats.candidateCount > 0 ? "text-red-600" : "text-gray-900"}`}>
              {stats.candidateCount}
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Processed Today</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.processedToday}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Claims to Reverse</p>
            <p className={`text-2xl font-bold mt-1 ${stats.claimsToReverse > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {stats.claimsToReverse}
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Copay Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${stats.totalCopayValue.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab("candidates")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === "candidates"
              ? "border-[#40721D] text-[#40721D]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          RTS Candidates ({candidates.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === "history"
              ? "border-[#40721D] text-[#40721D]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          RTS History
        </button>
      </div>

      {/* Candidates Tab */}
      {tab === "candidates" && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Batch action bar */}
          {selected.size > 0 && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <span className="text-sm text-amber-800 font-medium">
                {selected.size} item{selected.size !== 1 ? "s" : ""} selected
              </span>
              <button
                onClick={handleBatchRts}
                disabled={batchProcessing}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {batchProcessing ? "Processing..." : `Return ${selected.size} to Stock`}
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={candidates.length > 0 && selected.size === candidates.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Rx#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Drug</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Days in Bin</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Bin Location</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Copay</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Claim</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length > 0 ? (
                  candidates.map((c) => (
                    <tr key={c.fillId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(c.fillId)}
                          onChange={() => toggleSelect(c.fillId)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{c.patientName}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">{c.rxNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{c.drug}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            c.daysInBin > 21
                              ? "bg-red-100 text-red-700"
                              : c.daysInBin > 14
                              ? "bg-amber-100 text-amber-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {c.daysInBin}d
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-900">{c.binLocation}</td>
                      <td className="px-4 py-3 text-right text-gray-900">${c.copayAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {c.claimId ? (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-semibold">
                            To Reverse
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSingleRts(c.fillId)}
                          disabled={processing === c.fillId}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {processing === c.fillId ? "Processing..." : "RTS"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No items past the {threshold}-day threshold. All caught up!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {candidates.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
              {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} for return to stock
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Rx#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Drug</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Bin</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Copay</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Claim Reversed</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Processed By</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((h) => (
                    <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 text-xs">
                        {new Date(h.processedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{h.patientName}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">{h.rxNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{h.drug}</td>
                      <td className="px-4 py-3 font-mono text-gray-900">{h.binLocation}</td>
                      <td className="px-4 py-3 text-right text-gray-900">${h.copayAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {h.claimReversed ? (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-semibold">Yes</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{h.processedBy}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No RTS history yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg w-full max-w-md mx-4 shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-lg font-bold">!</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Confirm Return to Stock</h2>
              </div>

              <div className="mb-6 space-y-2 text-sm text-gray-600">
                <p>This action will:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>
                    <span className="font-medium text-gray-900">Reverse the insurance claim</span> (if applicable)
                  </li>
                  <li>
                    <span className="font-medium text-gray-900">Restock inventory</span> back to the original lot
                  </li>
                  <li>
                    <span className="font-medium text-gray-900">Notify the patient</span> via SMS that their Rx was returned
                  </li>
                  <li>
                    <span className="font-medium text-gray-900">Cancel the fill</span> (can be re-processed later)
                  </li>
                </ul>
                {confirmAction === "batch" && (
                  <p className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-amber-800 font-medium">
                    You are about to process {selected.size} item{selected.size !== 1 ? "s" : ""} for RTS.
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRts}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
                >
                  Confirm Return to Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
