"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  getSubscriptions,
  enrollSubscription,
  cancelSubscription,
  getSubscriptionStats,
  processUpcomingSubscriptions,
  getPatientPrescriptions,
  type SubscriptionRow,
  type SubscriptionStats,
} from "./actions";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateWithTime(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PatientPrescription = {
  id: string;
  rxNumber: string;
  drugName: string;
  strength?: string;
  isSubscribed: boolean;
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    activeCount: 0,
    enrolledPatients: 0,
    dueThisWeek: 0,
  });

  // Search and filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("patient");

  // Modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollPatientId, setEnrollPatientId] = useState("");
  const [enrollPatientName, setEnrollPatientName] = useState("");
  const [enrollPrescriptions, setEnrollPrescriptions] = useState<PatientPrescription[]>([]);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState("");
  const [selectedInterval, setSelectedInterval] = useState<"30" | "60" | "90">("30");

  // UI state
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [processResults, setProcessResults] = useState<{
    fillsCreated: number;
    errors: string[];
  } | null>(null);

  // Refs for modal inputs (React 19 requires initial value)
  const enrollSearchInputRef = useRef<HTMLInputElement>(null);

  // Load subscriptions and stats
  const loadData = async () => {
    setLoading(true);
    try {
      const [subsData, statsData] = await Promise.all([
        getSubscriptions({ search, status: statusFilter, sortBy }),
        getSubscriptionStats(),
      ]);
      setSubscriptions(subsData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, sortBy]);

  // Search for patients to enroll
  const handleEnrollSearchChange = async (value: string) => {
    setEnrollSearch(value);

    if (value.length < 2) {
      setEnrollPatientId("");
      setEnrollPatientName("");
      setEnrollPrescriptions([]);
      setSelectedPrescriptionId("");
      return;
    }

    try {
      // We'll search through existing subscriptions to find matching patients
      const allSubs = await getSubscriptions({ search: value, status: "all" });

      // Get unique patient info from first match
      if (allSubs.length > 0) {
        const firstMatch = allSubs[0];
        setEnrollPatientId(firstMatch.patientId);
        setEnrollPatientName(firstMatch.patientName);

        // Load prescriptions for this patient
        const rxs = await getPatientPrescriptions(firstMatch.patientId);
        setEnrollPrescriptions(rxs);
        setSelectedPrescriptionId("");
      }
    } catch (err) {
      console.error("Failed to search patients:", err);
    }
  };

  // Handle enrollment
  const handleEnroll = async () => {
    if (!enrollPatientId || !selectedPrescriptionId) {
      alert("Please select a prescription");
      return;
    }

    setEnrolling(true);
    try {
      const result = await enrollSubscription(
        enrollPatientId,
        selectedPrescriptionId,
        selectedInterval
      );

      if (result.success) {
        setShowEnrollModal(false);
        setEnrollSearch("");
        setEnrollPatientId("");
        setEnrollPatientName("");
        setEnrollPrescriptions([]);
        setSelectedPrescriptionId("");
        await loadData();
      } else {
        alert(result.error || "Failed to enroll subscription");
      }
    } catch (err) {
      console.error("Enrollment failed:", err);
      alert("Failed to enroll subscription");
    } finally {
      setEnrolling(false);
    }
  };

  // Handle cancellation
  const handleCancel = async (patientId: string, prescriptionId: string) => {
    if (!confirm("Are you sure you want to cancel this subscription?")) return;

    try {
      const result = await cancelSubscription(patientId, prescriptionId);
      if (result.success) {
        await loadData();
      } else {
        alert(result.error || "Failed to cancel subscription");
      }
    } catch (err) {
      console.error("Cancellation failed:", err);
      alert("Failed to cancel subscription");
    }
  };

  // Process upcoming subscriptions
  const handleProcessRefills = async () => {
    if (
      !confirm(
        "Process all subscriptions due today or earlier? This will create pending fills."
      )
    )
      return;

    setProcessing(true);
    try {
      const result = await processUpcomingSubscriptions();
      setProcessResults({
        fillsCreated: result.fillsCreated,
        errors: result.errors,
      });
      await loadData();
    } catch (err) {
      console.error("Processing failed:", err);
      alert("Failed to process subscriptions");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage recurring medication refill subscriptions
          </p>
        </div>
        <Link
          href="/patients"
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to Patients
        </Link>
      </div>

      {/* Process Results Banner */}
      {processResults && (
        <div className="mb-4 rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Processing Complete — {processResults.fillsCreated} fills created
            </h3>
            <button
              onClick={() => setProcessResults(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Dismiss
            </button>
          </div>
          {processResults.errors.length > 0 && (
            <div className="space-y-1">
              {processResults.errors.map((error, idx) => (
                <div key={idx} className="text-xs text-red-600">
                  • {error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">
            Active Subscriptions
          </p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase">
            Enrolled Patients
          </p>
          <p className="text-2xl font-bold text-gray-900">{stats.enrolledPatients}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs font-semibold text-amber-400 uppercase">Due This Week</p>
          <p className="text-2xl font-bold text-amber-600">{stats.dueThisWeek}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#40721D]/20 p-4">
          <p className="text-xs font-semibold text-[#40721D] uppercase">Status</p>
          <p className="text-lg font-bold text-[#40721D]">Active</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient name, drug..."
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D] w-72"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
        >
          <option value="all">All Subscriptions</option>
          <option value="active">Active Only</option>
          <option value="paused">Paused Only</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
        >
          <option value="patient">By Patient</option>
          <option value="next_refill">By Next Refill</option>
          <option value="drug">By Drug</option>
        </select>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setShowEnrollModal(true)}
            className="px-4 py-2 bg-[#40721D] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5114] transition-colors"
          >
            Enroll Patient
          </button>
          <button
            onClick={handleProcessRefills}
            disabled={processing}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {processing ? "Processing..." : "Process Due Refills"}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">
          Loading subscriptions...
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">💊</p>
          <p className="text-sm text-gray-400">
            No subscriptions found. Enroll a patient to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Patient
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Drug
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Interval
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Last Refill
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Next Refill
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-900">
                    {sub.patientName}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm text-gray-900">{sub.drugName}</p>
                    {sub.strength && (
                      <p className="text-xs text-gray-400">{sub.strength}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-900">
                    {sub.interval} days
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full ${
                        sub.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">
                    {formatDate(sub.lastRefillDate)}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">
                    {formatDate(sub.nextRefillDate)}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() =>
                        handleCancel(sub.patientId, sub.prescriptionId)
                      }
                      className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Enroll Patient in Subscription
            </h2>

            {!enrollPatientId ? (
              <div className="space-y-4 mb-4">
                <input
                  ref={enrollSearchInputRef}
                  type="text"
                  value={enrollSearch}
                  onChange={(e) => handleEnrollSearchChange(e.target.value)}
                  placeholder="Search by patient name or MRN..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                />
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Selected Patient</p>
                  <p className="text-base font-semibold text-gray-900">
                    {enrollPatientName}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Prescription
                  </label>
                  <select
                    value={selectedPrescriptionId}
                    onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                  >
                    <option value="">Choose a prescription...</option>
                    {enrollPrescriptions.map((rx) => (
                      <option key={rx.id} value={rx.id} disabled={rx.isSubscribed}>
                        {rx.drugName}
                        {rx.strength ? ` (${rx.strength})` : ""} - Rx#{rx.rxNumber}
                        {rx.isSubscribed ? " (already subscribed)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refill Interval
                  </label>
                  <div className="flex gap-2">
                    {(["30", "60", "90"] as const).map((interval) => (
                      <button
                        key={interval}
                        onClick={() => setSelectedInterval(interval)}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                          selectedInterval === interval
                            ? "bg-[#40721D] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {interval} days
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEnrollPatientId("");
                    setEnrollSearch("");
                    setEnrollPrescriptions([]);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ← Change Patient
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollSearch("");
                  setEnrollPatientId("");
                  setEnrollPatientName("");
                  setEnrollPrescriptions([]);
                  setSelectedPrescriptionId("");
                }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {enrollPatientId && (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling || !selectedPrescriptionId}
                  className="flex-1 px-4 py-2 bg-[#40721D] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5114] disabled:opacity-50 transition-colors"
                >
                  {enrolling ? "Enrolling..." : "Enroll"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
