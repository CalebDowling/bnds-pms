"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Refill {
  id: string;
  rxNumber: string;
  patientName: string;
  medication: string;
  lastFillDate: string;
  refillsRemaining: number;
  status: "Requested" | "Processing" | "Ready" | "Picked Up";
}

export default function RefillsPage(): React.ReactNode {
  const [refills, setRefills] = useState<Refill[]>([]);
  const [filteredRefills, setFilteredRefills] = useState<Refill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchRefills();
  }, []);

  useEffect(() => {
    let filtered = refills;

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.rxNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.medication.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredRefills(filtered);
  }, [searchTerm, statusFilter, refills]);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("prescriber_token") : null;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchRefills = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await fetch("/api/prescriber-portal/refills", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch refills");
      const data = await response.json();
      setRefills(data.refills || []);
    } catch (err) {
      setError("Error loading refills. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestRefill = async (refillId: string) => {
    try {
      setRequestingId(refillId);
      const response = await fetch("/api/prescriber-portal/refills", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ refillId }),
      });

      if (!response.ok) throw new Error("Failed to request refill");

      // Update local state
      setRefills((prev) =>
        prev.map((r) =>
          r.id === refillId ? { ...r, status: "Requested" } : r
        )
      );
    } catch (err) {
      setError("Error requesting refill. Please try again.");
      console.error(err);
    } finally {
      setRequestingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Requested":
        return "border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-lg";
      case "Processing":
        return "border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded-lg";
      case "Ready":
        return "border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg";
      case "Picked Up":
        return "border-gray-200 bg-gray-50 text-gray-700 text-[11px] font-semibold rounded-lg";
      default:
        return "border-gray-200 bg-gray-50 text-gray-700 text-[11px] font-semibold rounded-lg";
    }
  };

  return (
    <div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stagger-1 { animation: fadeUp 0.3s ease-out 0.05s both; }
        .stagger-2 { animation: fadeUp 0.3s ease-out 0.1s both; }
        .stagger-3 { animation: fadeUp 0.3s ease-out 0.15s both; }
        .stagger-4 { animation: fadeUp 0.3s ease-out 0.2s both; }
        .stagger-5 { animation: fadeUp 0.3s ease-out 0.25s both; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 stagger-1">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900">Refill Requests</h1>
          <p className="text-[13px] text-gray-600 mt-1">
            Manage prescription refills for your patients
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl stagger-2">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 space-y-4 stagger-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by RX#, patient, or medication..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[12px] uppercase tracking-wider font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
            >
              <option value="all">All Statuses</option>
              <option value="Requested">Requested</option>
              <option value="Processing">Processing</option>
              <option value="Ready">Ready</option>
              <option value="Picked Up">Picked Up</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden stagger-4">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-[13px]">Loading refills...</p>
          </div>
        ) : filteredRefills.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-[13px]">
              {refills.length === 0
                ? "No refills available"
                : "No refills match your search"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 border-b border-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    RX#
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Medication
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Last Fill Date
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Refills Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRefills.map((refill) => (
                  <tr key={refill.id} className="hover:bg-[#f8faf6] transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {refill.rxNumber}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {refill.patientName}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {refill.medication}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {new Date(refill.lastFillDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {refill.refillsRemaining}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 border ${getStatusColor(
                          refill.status
                        )}`}
                      >
                        {refill.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {refill.status === "Requested" ||
                      refill.status === "Processing" ? (
                        <button
                          disabled
                          className="px-3 py-1.5 text-[11px] font-semibold rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                        >
                          {refill.status === "Requested"
                            ? "Requested"
                            : "Processing"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRequestRefill(refill.id)}
                          disabled={requestingId === refill.id}
                          className="px-3 py-1.5 text-[11px] font-semibold rounded-xl bg-[#40721D] text-white hover:bg-[#355f1a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          {requestingId === refill.id
                            ? "Requesting..."
                            : "Request Refill"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl stagger-5">
        <p className="text-[13px] text-blue-700">
          Showing {filteredRefills.length} of {refills.length} refills eligible
          for refill
        </p>
      </div>
    </div>
  );
}
