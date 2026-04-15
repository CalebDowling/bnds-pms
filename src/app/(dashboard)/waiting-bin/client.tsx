"use client";

import { useCallback, useState } from "react";
import { Plus, Package, AlertTriangle, CalendarPlus, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import PageShell from "@/components/layout/PageShell";
import StatsRow from "@/components/layout/StatsRow";

interface WaitingBinItem {
  id: string;
  binLocation: string;
  patient: string;
  rxNumber: string;
  drug: string;
  dateAdded: Date | string;
  daysInBin: number;
  status: "in_bin" | "picked_up" | "returned_to_stock";
  statusColor: "green" | "yellow" | "red";
}

interface WaitingBinStats {
  totalInBin: number;
  overdue: number;
  addedToday: number;
  pickedUpToday: number;
}

interface WaitingBinClientProps {
  initialItems: WaitingBinItem[];
  initialStats: WaitingBinStats;
}

export default function WaitingBinClient({ initialItems, initialStats }: WaitingBinClientProps) {
  const [items, setItems] = useState<WaitingBinItem[]>(initialItems);
  const [stats, setStats] = useState<WaitingBinStats>(initialStats);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"binLocation" | "patientName" | "daysInBin">(
    "binLocation"
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [rxNumber, setRxNumber] = useState("");
  const [binLocation, setBinLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredItems = items.filter(
    (item) =>
      item.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rxNumber.includes(searchTerm)
  );

  const getStatusBadgeColor = (color: string) => {
    switch (color) {
      case "green":
        return "success";
      case "yellow":
        return "warning";
      case "red":
        return "error";
      default:
        return "default";
    }
  };

  const handleAddToBin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!rxNumber.trim()) {
      setError("Please enter an Rx#");
      return;
    }

    if (!binLocation.trim()) {
      setError("Please enter a bin location");
      return;
    }

    if (!/^[A-Z]\d+$/.test(binLocation.toUpperCase())) {
      setError("Invalid bin location format (use A1, B2, Z99, etc.)");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/waiting-bin/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rxNumber: rxNumber.trim(),
          binLocation: binLocation.toUpperCase(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add to bin");
      }

      setSuccess("Item added to waiting bin");
      setRxNumber("");
      setBinLocation("");
      setShowAddModal(false);

      // Refresh data
      const dataResponse = await fetch("/api/waiting-bin/items");
      const data = await dataResponse.json();
      setItems(data.items);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to bin");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromBin = async (fillId: string, reason: "pickup" | "return_to_stock") => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/waiting-bin/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fillId,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove from bin");
      }

      setSuccess(
        reason === "pickup" ? "Item marked as picked up" : "Item returned to stock"
      );

      // Refresh data
      const dataResponse = await fetch("/api/waiting-bin/items");
      const data = await dataResponse.json();
      setItems(data.items);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove from bin");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      title="Waiting Bin Tracking"
      subtitle="Manage physical waiting bin locations"
      actions={
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white transition-colors"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Plus size={14} /> Add to Bin
        </button>
      }
      stats={
        <StatsRow
          stats={[
            { label: "Total in Bin", value: stats.totalInBin, icon: <Package size={12} /> },
            {
              label: "Overdue (>14d)",
              value: stats.overdue,
              icon: <AlertTriangle size={12} />,
              accent: stats.overdue > 0 ? "#dc2626" : undefined,
            },
            { label: "Added Today", value: stats.addedToday, icon: <CalendarPlus size={12} /> },
            {
              label: "Picked Up Today",
              value: stats.pickedUpToday,
              icon: <CheckCircle2 size={12} />,
              accent: "var(--color-primary)",
            },
          ]}
        />
      }
    >
      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Filters and Controls */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Patient name or Rx#..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSortBy(e.target.value as "binLocation" | "patientName" | "daysInBin")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="binLocation">Bin Location</option>
                <option value="patientName">Patient Name</option>
                <option value="daysInBin">Days in Bin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Bin Location</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Patient Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Rx#</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Drug</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Date Filled</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Days in Bin</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                      {item.binLocation}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.patient}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                      {item.rxNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.drug}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(item.dateAdded)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {item.daysInBin}d
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        item.statusColor === "green" ? "bg-green-100 text-green-800" :
                        item.statusColor === "yellow" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {item.daysInBin <= 7 && "Green"}
                        {item.daysInBin > 7 && item.daysInBin <= 14 && "Yellow"}
                        {item.daysInBin > 14 && "Red (Overdue)"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button
                        onClick={() => handleRemoveFromBin(item.id, "pickup")}
                        disabled={isLoading}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        Pickup
                      </button>
                      <button
                        onClick={() => handleRemoveFromBin(item.id, "return_to_stock")}
                        disabled={isLoading}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        Return
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {items.length === 0 ? "No items in waiting bin" : "No results matching your search"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            Showing {filteredItems.length} of {items.length} items
          </div>
        )}
      </div>

      {/* Add to Bin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="border border-gray-200 rounded-lg bg-white w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Add to Waiting Bin</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setError("");
                    setRxNumber("");
                    setBinLocation("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddToBin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scan or Enter Rx#
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., RX123456"
                    value={rxNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRxNumber(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bin Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., A1, B5, Z99"
                    value={binLocation}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBinLocation(e.target.value.toUpperCase())}
                    maxLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setError("");
                      setRxNumber("");
                      setBinLocation("");
                    }}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? "Adding..." : "Add to Bin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
