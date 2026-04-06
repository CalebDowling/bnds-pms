"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updatePrescriptionStatus } from "@/app/(dashboard)/prescriptions/actions";
import { getErrorMessage } from "@/lib/errors";

const TRANSITIONS: Record<string, { label: string; targets: { value: string; label: string; color: string }[] }> = {
  intake: {
    label: "New prescription in intake",
    targets: [
      { value: "pending_review", label: "Send to Review", color: "bg-yellow-500 hover:bg-yellow-600" },
      { value: "cancelled", label: "Cancel", color: "bg-red-500 hover:bg-red-600" },
    ],
  },
  pending_review: {
    label: "Awaiting pharmacist review",
    targets: [
      { value: "in_progress", label: "Start Processing", color: "bg-blue-500 hover:bg-blue-600" },
      { value: "on_hold", label: "Put on Hold", color: "bg-red-500 hover:bg-red-600" },
      { value: "cancelled", label: "Cancel", color: "bg-red-500 hover:bg-red-600" },
    ],
  },
  in_progress: {
    label: "Being processed",
    targets: [
      { value: "compounding", label: "Send to Compounding", color: "bg-purple-500 hover:bg-purple-600" },
      { value: "ready_to_fill", label: "Ready to Fill", color: "bg-indigo-500 hover:bg-indigo-600" },
      { value: "on_hold", label: "Put on Hold", color: "bg-red-500 hover:bg-red-600" },
    ],
  },
  compounding: {
    label: "In compounding lab",
    targets: [
      { value: "ready_to_fill", label: "Compounding Complete", color: "bg-indigo-500 hover:bg-indigo-600" },
      { value: "on_hold", label: "Put on Hold", color: "bg-red-500 hover:bg-red-600" },
    ],
  },
  ready_to_fill: {
    label: "Ready for technician to fill",
    targets: [
      { value: "filling", label: "Start Filling", color: "bg-blue-500 hover:bg-blue-600" },
      { value: "on_hold", label: "Put on Hold", color: "bg-red-500 hover:bg-red-600" },
    ],
  },
  filling: {
    label: "Being filled by technician",
    targets: [
      { value: "ready_for_verification", label: "Submit for Verification", color: "bg-orange-500 hover:bg-orange-600" },
      { value: "on_hold", label: "Put on Hold", color: "bg-red-500 hover:bg-red-600" },
    ],
  },
  ready_for_verification: {
    label: "Awaiting pharmacist verification",
    targets: [
      { value: "verified", label: "Verify (RPh)", color: "bg-teal-500 hover:bg-teal-600" },
      { value: "filling", label: "Return to Filling", color: "bg-gray-500 hover:bg-gray-600" },
    ],
  },
  verified: {
    label: "Verified by pharmacist",
    targets: [
      { value: "ready", label: "Mark Ready", color: "bg-green-500 hover:bg-green-600" },
    ],
  },
  ready: {
    label: "Ready for patient pickup or shipment",
    targets: [
      { value: "dispensed", label: "Dispensed (Pickup)", color: "bg-green-600 hover:bg-green-700" },
      { value: "shipped", label: "Shipped", color: "bg-cyan-500 hover:bg-cyan-600" },
    ],
  },
  on_hold: {
    label: "On hold — needs attention",
    targets: [
      { value: "pending_review", label: "Resume to Review", color: "bg-yellow-500 hover:bg-yellow-600" },
      { value: "in_progress", label: "Resume Processing", color: "bg-blue-500 hover:bg-blue-600" },
      { value: "cancelled", label: "Cancel", color: "bg-red-500 hover:bg-red-600" },
    ],
  },
  shipped: {
    label: "Shipped to patient",
    targets: [
      { value: "delivered", label: "Mark Delivered", color: "bg-green-600 hover:bg-green-700" },
    ],
  },
  dispensed: { label: "Dispensed to patient", targets: [] },
  delivered: { label: "Delivered to patient", targets: [] },
  cancelled: { label: "Cancelled", targets: [] },
};

export default function PrescriptionStatusBar({
  prescriptionId,
  currentStatus,
}: {
  prescriptionId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(d => {
      if (d.userId) setUserId(d.userId);
    }).catch(() => {});
  }, []);

  const config = TRANSITIONS[currentStatus] || { label: currentStatus, targets: [] };

  async function handleTransition(newStatus: string) {
    setLoading(true);
    setError(null);

    try {
      // TODO: get real user ID from auth context
      if (!userId) { setError("User session not found. Please refresh."); return; }
      await updatePrescriptionStatus(prescriptionId, newStatus, userId);
      router.refresh();
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (config.targets.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
        <p className="text-sm text-gray-500">{config.label}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3 border border-red-200">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{config.label}</p>
        <div className="flex gap-2">
          {config.targets.map((target) => (
            <button
              key={target.value}
              onClick={() => handleTransition(target.value)}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${target.color}`}
            >
              {loading ? "..." : target.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
