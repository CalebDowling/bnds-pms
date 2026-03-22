"use client";

import { useState, useCallback } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface ReconciliationItem {
  id: string;
  saleNumber?: string;
  claimNumber?: string;
  patient: string;
  expectedAmount: number;
  receivedAmount: number;
  difference: number;
  status: "matched" | "discrepancy" | "underpayment" | "overpayment";
  date: Date | string;
}

interface ReconciliationStats {
  cash: {
    totalExpected: number;
    totalReceived: number;
    itemsMatched: number;
    itemsDiscrepancies: number;
    totalItems: number;
    percentMatched: number;
  };
  insurance: {
    totalExpected: number;
    totalReceived: number;
    itemsMatched: number;
    itemsDiscrepancies: number;
    totalItems: number;
    percentMatched: number;
  };
}

interface ReconciliationClientProps {
  initialCashItems: ReconciliationItem[];
  initialInsuranceItems: ReconciliationItem[];
  initialStats: ReconciliationStats;
  initialPage: number;
  totalPages: number;
  totalCashCount: number;
  totalInsuranceCount: number;
}

export default function ReconciliationClient({
  initialCashItems,
  initialInsuranceItems,
  initialStats,
  initialPage,
  totalPages,
  totalCashCount,
  totalInsuranceCount,
}: ReconciliationClientProps) {
  const [mode, setMode] = useState<"cash" | "insurance">("cash");
  const [items, setItems] = useState<ReconciliationItem[]>(
    mode === "cash" ? initialCashItems : initialInsuranceItems
  );
  const [stats, setStats] = useState<ReconciliationStats>(initialStats);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);

  const currentStats = mode === "cash" ? stats.cash : stats.insurance;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "matched":
        return "success";
      case "discrepancy":
      case "underpayment":
      case "overpayment":
        return "error";
      default:
        return "default";
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const handleMarkReconciled = async () => {
    if (selectedIds.size === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/reconciliation/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          type: mode,
        }),
      });

      if (response.ok) {
        setSelectedIds(new Set());
        // Refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error("Error marking reconciled:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reconciliation Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Match payments to claims</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("cash")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            mode === "cash"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Cash Reconciliation
        </button>
        <button
          onClick={() => setMode("insurance")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            mode === "insurance"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Insurance Reconciliation
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Expected</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(currentStats.totalExpected)}
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Received</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(currentStats.totalReceived)}
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Difference</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                currentStats.totalReceived >= currentStats.totalExpected
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(Math.abs(currentStats.totalReceived - currentStats.totalExpected))}
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Matched</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {currentStats.itemsMatched}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {currentStats.percentMatched.toFixed(1)}% matched
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Discrepancies</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {currentStats.itemsDiscrepancies}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            {mode === "cash" ? "Cash Transactions" : "Insurance Claims"}
          </h3>
          {selectedIds.size > 0 && (
            <button
              onClick={handleMarkReconciled}
              disabled={isLoading}
            >
              Mark {selectedIds.size} as Reconciled
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">
                  {mode === "cash" ? "Sale#" : "Claim#"}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Patient</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Expected</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Received</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Difference</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                      {item.saleNumber || item.claimNumber || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.patient}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(item.expectedAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(item.receivedAmount)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        item.difference >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(item.difference)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        item.status === "matched" ? "bg-green-100 text-green-800" :
                        item.status === "discrepancy" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {item.status.replace("-", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No items found for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing page {page} of {totalPages} (
              {mode === "cash" ? totalCashCount : totalInsuranceCount} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
               
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
               
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
