"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface DIRFee {
  id: string;
  date: Date;
  claimNumber: string | null;
  patient: string;
  drug: string;
  originalPaid: number;
  dirFeeAmount: number;
  netReimbursement: number;
  pbm: string;
}

interface Stats {
  totalDIRFees: number;
  claimsWithDIR: number;
  averageDIRFee: number;
  mostImpactedDrugs: Array<{ drug: string; totalImpact: number }>;
}

interface DIRFeesClientProps {
  initialFees: DIRFee[];
  initialStats: Stats;
  initialPage: number;
  totalPages: number;
  totalCount: number;
}

export default function DIRFeesClient({
  initialFees,
  initialStats,
  initialPage,
  totalPages,
  totalCount,
}: DIRFeesClientProps) {
  const [fees, setFees] = useState<DIRFee[]>(initialFees);
  const [stats, setStats] = useState<Stats>(initialStats);
  const getDateString = (date: Date) => date.toISOString().split("T")[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [startDate, setStartDate] = useState<string>(getDateString(thirtyDaysAgo));
  const [endDate, setEndDate] = useState<string>(getDateString(new Date()));
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/billing/dir-fees?startDate=${startDate}&endDate=${endDate}&page=${page}`
      );
      const data = await response.json();
      setFees(data.fees);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching DIR fees:", error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, page]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  const handleExportCSV = async () => {
    try {
      const response = await fetch(
        `/api/billing/dir-fees/export?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      const csv = [
        data.headers.join(","),
        ...data.rows.map((row: string[]) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().split("T")[0];
      a.download = `dir-fees-${today}.csv`;
      a.click();
    } catch (error) {
      console.error("Error exporting CSV:", error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DIR Fees Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">PBM clawback tracking and analysis</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Total DIR Fees</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(stats.totalDIRFees)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.claimsWithDIR} claims affected
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Average DIR Fee</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(stats.averageDIRFee)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Per impacted claim</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Revenue Impact</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            -{formatCurrency(stats.totalDIRFees)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Period total loss</p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">Most Impacted</p>
          <p className="text-sm font-semibold text-gray-900 mt-1 truncate">
            {stats.mostImpactedDrugs[0]?.drug || "N/A"}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {formatCurrency(stats.mostImpactedDrugs[0]?.totalImpact || 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Apply Filters"}
              </button>
            </div>
          </div>
        </div>

        {/* Top Impacted Drugs */}
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Most Impacted Drugs</h4>
          <div className="space-y-2">
            {stats.mostImpactedDrugs.length > 0 ? (
              stats.mostImpactedDrugs.map((item) => (
                <div key={item.drug} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.drug}</span>
                  <span className="text-sm font-semibold text-orange-600">{formatCurrency(item.totalImpact)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No DIR fees recorded</p>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Claim#</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Patient</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Drug</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Original Paid</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">DIR Fee</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Net Reimbursement</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">PBM/Plan</th>
              </tr>
            </thead>
            <tbody>
              {fees.length > 0 ? (
                fees.map((fee) => (
                  <tr key={fee.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(fee.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{fee.claimNumber || "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{fee.patient}</td>
                    <td className="px-4 py-3 text-gray-700">{fee.drug}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(fee.originalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-semibold bg-red-100 text-red-800 px-2 py-1 rounded">
                        {formatCurrency(fee.dirFeeAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(fee.netReimbursement)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{fee.pbm}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No DIR fees found for the selected period
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
              Showing page {page} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
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
