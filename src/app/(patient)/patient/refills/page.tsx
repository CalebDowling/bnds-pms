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
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Request a Refill</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Select a prescription and submit a refill request.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-40 mb-6 animate-pulse"></div>
              <div className="space-y-4">
                <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse"></div>
                <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse"></div>
                <div className="h-11 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-40 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Request a Refill
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Select a prescription and submit a refill request.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Refill Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#40721D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Refill Request
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] focus:ring-opacity-50 outline-none transition-all bg-white"
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] focus:ring-opacity-50 outline-none transition-all resize-none bg-white"
                    rows={4}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedRxId}
                  className="w-full py-3 px-4 bg-[#40721D] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5114] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-6"
                >
                  {isSubmitting ? "Submitting..." : "Submit Refill Request"}
                </button>
              </form>
            ) : (
              <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-100">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-base text-gray-600 font-semibold">
                  No prescriptions eligible for refill
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Check back once your prescriptions have refills remaining.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Refill History */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#40721D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Recent Requests
            </h2>

            {refillRequests.length > 0 ? (
              <div className="space-y-3">
                {refillRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-xs font-semibold text-gray-900">
                      Rx# {request.prescription.rxNumber}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                        request.status === "completed"
                          ? "bg-green-100/80 text-green-700 ring-1 ring-green-300"
                          : request.status === "pending"
                            ? "bg-yellow-100/80 text-yellow-700 ring-1 ring-yellow-300"
                            : "bg-gray-100 text-gray-700 ring-1 ring-gray-300"
                      }`}
                    >
                      {request.status.charAt(0).toUpperCase() +
                        request.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-100">
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-xs text-gray-600 font-medium">
                  No requests yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
