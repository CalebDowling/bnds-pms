"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import {
  getRefillRequests,
  getRefillStats,
  approveRefill,
  rejectRefill,
} from "./actions";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import StatsRow from "@/components/layout/StatsRow";

interface RefillRequest {
  id: string;
  patientName: string;
  rxNumber: string;
  drugName: string;
  lastFillDate: string | null;
  requestedDate: string;
  status: "pending" | "approved" | "rejected";
  refillsRemaining: number;
  daysSupply: number | null;
  prescriberName?: string;
  source?: "internal" | "prescriber_portal";
}

interface RefillStats {
  pending: number;
  approved: number;
  rejected: number;
}

interface RefillsClientProps {
  initialRequests: RefillRequest[];
  initialStats: RefillStats;
}

export default function RefillsClient({
  initialRequests,
  initialStats,
}: RefillsClientProps) {
  const [requests, setRequests] = useState<RefillRequest[]>(initialRequests);
  const [stats, setStats] = useState<RefillStats>(initialStats);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [sourceFilter, setSourceFilter] = useState<"all" | "internal" | "prescriber_portal">("all");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const refreshRequests = async () => {
      const status =
        selectedStatus === "all" ? undefined : selectedStatus;
      const data = await getRefillRequests(status);
      setRequests(data);
    };

    refreshRequests();
  }, [selectedStatus]);

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await approveRefill(requestId);
      const [updatedRequests, updatedStats] = await Promise.all([
        getRefillRequests(selectedStatus === "all" ? undefined : selectedStatus),
        getRefillStats(),
      ]);
      setRequests(updatedRequests);
      setStats(updatedStats);
    } catch (error) {
      console.error("Failed to approve refill:", error);
      alert("Failed to approve refill request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setProcessingId(requestId);
    try {
      await rejectRefill(requestId, rejectReason);
      const [updatedRequests, updatedStats] = await Promise.all([
        getRefillRequests(selectedStatus === "all" ? undefined : selectedStatus),
        getRefillStats(),
      ]);
      setRequests(updatedRequests);
      setStats(updatedStats);
      setRejectingId(null);
      setRejectReason("");
    } catch (error) {
      console.error("Failed to reject refill:", error);
      alert("Failed to reject refill request");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const statusMatch = selectedStatus === "all" || r.status === selectedStatus;
    const sourceMatch = sourceFilter === "all" || r.source === sourceFilter;
    return statusMatch && sourceMatch;
  });

  return (
    <PageShell
      title="Refill Request Queue"
      subtitle="Manage and process refill requests"
      stats={
        <StatsRow
          stats={[
            { label: "Pending", value: stats.pending, icon: <RefreshCw size={12} />, accent: "#f97316" },
            { label: "Approved", value: stats.approved, icon: <CheckCircle2 size={12} />, accent: "var(--color-primary)" },
            { label: "Rejected", value: stats.rejected, icon: <XCircle size={12} />, accent: stats.rejected > 0 ? "#dc2626" : undefined },
          ]}
        />
      }
      toolbar={
        <FilterBar
          filters={
            <>
              {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className="px-3 py-1 text-xs font-semibold rounded-full border transition-colors"
                  style={{
                    backgroundColor: selectedStatus === s ? "var(--color-primary)" : "transparent",
                    color: selectedStatus === s ? "#fff" : "var(--text-secondary)",
                    borderColor: selectedStatus === s ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              <span className="w-px h-5 mx-1" style={{ backgroundColor: "var(--border)" }} />
              {(["all", "internal", "prescriber_portal"] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setSourceFilter(src)}
                  className="px-3 py-1 text-xs font-semibold rounded-full border transition-colors"
                  style={{
                    backgroundColor: sourceFilter === src ? "var(--color-primary)" : "transparent",
                    color: sourceFilter === src ? "#fff" : "var(--text-secondary)",
                    borderColor: sourceFilter === src ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {src === "all" ? "All Sources" : src === "prescriber_portal" ? "Prescriber Portal" : "Internal"}
                </button>
              ))}
            </>
          }
        />
      }
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr className="text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              <th className="px-6 py-3">Patient</th>
              <th className="px-6 py-3">Rx#</th>
              <th className="px-6 py-3">Drug</th>
              <th className="px-6 py-3">Prescriber</th>
              <th className="px-6 py-3">Last Fill</th>
              <th className="px-6 py-3">Requested</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Refills</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No refill requests found
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => (
                <tr
                  key={request.id}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {request.patientName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {request.rxNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {request.drugName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {request.prescriberName || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {request.lastFillDate
                      ? new Date(request.lastFillDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(request.requestedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === "pending"
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          : request.status === "approved"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      }`}
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {request.refillsRemaining}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      {request.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={processingId === request.id}
                            className="px-3 py-1.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
                          >
                            {processingId === request.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => setRejectingId(request.id)}
                            disabled={processingId === request.id}
                            className="px-3 py-1.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button className="px-3 py-1.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                        Contact
                      </button>
                    </div>

                    {rejectingId === request.id && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Reject Refill Request
                          </h3>
                          <textarea
                            placeholder="Enter rejection reason..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
                            rows={4}
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => setRejectingId(null)}
                              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() =>
                                handleReject(request.id)
                              }
                              disabled={processingId === request.id}
                              className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50 transition-colors"
                            >
                              {processingId === request.id ? "..." : "Reject"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
