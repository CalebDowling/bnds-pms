"use client";

import { useCallback, useState } from "react";
import { formatDate } from "@/lib/utils";

interface BlockedNumber {
  phone: string;
  reason: string;
  blockedAt: string;
  blockedBy: string;
}

interface BlockedNumbersClientProps {
  initialNumbers: BlockedNumber[];
}

export default function BlockedNumbersClient({ initialNumbers }: BlockedNumbersClientProps) {
  const [numbers, setNumbers] = useState<BlockedNumber[]>(initialNumbers);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredNumbers = numbers.filter(
    (num) =>
      num.phone.includes(searchTerm.replace(/\D/g, "")) ||
      num.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBlockNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!phone.trim()) {
      setError("Please enter a phone number");
      return;
    }

    if (!reason.trim()) {
      setError("Please enter a reason");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/blocked-numbers/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to block number");
      }

      setSuccess("Number blocked successfully");
      setPhone("");
      setReason("");
      setShowModal(false);

      // Refresh numbers
      const getResponse = await fetch("/api/settings/blocked-numbers");
      const getdata = await getResponse.json();
      setNumbers(getdata);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block number");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (blockedPhone: string) => {
    if (!confirm("Are you sure you want to unblock this number?")) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/blocked-numbers/unblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: blockedPhone }),
      });

      if (!response.ok) {
        throw new Error("Failed to unblock number");
      }

      setSuccess("Number unblocked successfully");

      // Refresh numbers
      const getResponse = await fetch("/api/settings/blocked-numbers");
      const getdata = await getResponse.json();
      setNumbers(getdata);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock number");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blocked Phone Numbers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage blocked caller list</p>
        </div>
        <button onClick={() => setShowModal(true)}>Block Number</button>
      </div>

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

      {/* Search */}
      <div className="border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search by phone number or reason..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Phone Number</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Reason</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Blocked Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNumbers.length > 0 ? (
                filteredNumbers.map((item) => (
                  <tr key={item.phone} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-900">
                      {formatPhoneNumber(item.phone)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.reason}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(item.blockedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleUnblock(item.phone)}
                        disabled={isLoading}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    {numbers.length === 0 ? "No blocked numbers" : "No results matching your search"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Stats */}
        {numbers.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredNumbers.length} of {numbers.length} blocked numbers
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="border border-gray-200 rounded-lg bg-white w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Block Phone Number</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setError("");
                    setPhone("");
                    setReason("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleBlockNumber} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    placeholder="e.g., Harassing calls, Spam, etc."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setError("");
                      setPhone("");
                      setReason("");
                    }}
                   
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={isLoading}>
                    {isLoading ? "Blocking..." : "Block Number"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
