"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Prescription {
  id: string;
  rxNumber: string;
  refillsRemaining: number;
  expirationDate?: string;
  item?: {
    name: string;
  };
}

interface RefillRequest {
  id: string;
  status: string;
  requestedAt: string;
  prescription: {
    id: string;
    rxNumber: string;
    item?: {
      name: string;
    };
  };
}

export default function RefillsPage(): React.ReactNode {
  const router = useRouter();
  const [selectedRxId, setSelectedRxId] = useState("");
  const [notes, setNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [refillRequests, setRefillRequests] = useState<RefillRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("patient_token");

      if (!token) {
        router.push("/patient");
        return;
      }

      fetchData(token);
    };

    checkAuth();
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      setIsLoading(true);
      setError("");

      // Fetch eligible prescriptions (those with refills remaining and not expired)
      const rxResponse = await fetch("/api/patient-portal/prescriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!rxResponse.ok) throw new Error("Failed to fetch prescriptions");
      const rxData = await rxResponse.json();

      // Filter eligible prescriptions
      const eligible = rxData.prescriptions.filter(
        (rx: Prescription) =>
          rx.refillsRemaining > 0 &&
          (!rx.expirationDate || new Date(rx.expirationDate) > new Date())
      );

      setPrescriptions(eligible);

      // Fetch refill request history
      const historyResponse = await fetch("/api/patient-portal/refills", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!historyResponse.ok)
        throw new Error("Failed to fetch refill requests");
      const historyData = await historyResponse.json();
      setRefillRequests(historyData.refillRequests);
    } catch (err) {
      setError("Failed to load refill information");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!selectedRxId) {
      setError("Please select a prescription");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("patient_token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch("/api/patient-portal/refills", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prescriptionId: selectedRxId,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit refill request");
      }

      setSuccessMessage(
        "Refill request submitted successfully! We'll process it soon."
      );
      setSelectedRxId("");
      setNotes("");

      // Refresh data
      await fetchData(token);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit refill request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading refill information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Request a Refill
        </h1>
        <p className="text-gray-600">
          Select a prescription and submit a refill request.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Refill Form */}
        <div className="lg:col-span-2">
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              New Refill Request
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {prescriptions.length > 0 ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Select Prescription */}
                <div>
                  <label
                    htmlFor="prescription"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Select Prescription *
                  </label>
                  <select
                    id="prescription"
                    value={selectedRxId}
                    onChange={(e) => setSelectedRxId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition"
                    required
                  >
                    <option value="">-- Choose a prescription --</option>
                    {prescriptions.map((rx) => (
                      <option key={rx.id} value={rx.id}>
                        {rx.item?.name || "Medication"} - Rx#{rx.rxNumber} (
                        {rx.refillsRemaining} refill
                        {rx.refillsRemaining !== 1 ? "s" : ""} remaining)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests or instructions?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D] focus:border-[#40721D] outline-none transition resize-none"
                    rows={4}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedRxId}
                  className="w-full py-2.5 px-4 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
                >
                  {isSubmitting ? "Submitting..." : "Submit Refill Request"}
                </button>
              </form>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  No prescriptions eligible for refill at this time.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Check back once your prescriptions have refills remaining.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Refill History */}
        <div className="lg:col-span-1">
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Request History
            </h2>

            {refillRequests.length > 0 ? (
              <div className="space-y-3">
                {refillRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="p-3 border border-gray-200 rounded-lg"
                  >
                    <p className="text-xs text-gray-600">
                      Rx# {request.prescription.rxNumber}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded mt-2 ${
                        request.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : request.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {request.status.charAt(0).toUpperCase() +
                        request.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  No refill requests yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
