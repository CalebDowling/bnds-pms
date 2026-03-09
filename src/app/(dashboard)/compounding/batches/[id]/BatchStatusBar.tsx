"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateBatchStatus } from "@/app/(dashboard)/compounding/actions";

const TRANSITIONS: Record<string, { label: string; targets: { value: string; label: string; color: string }[] }> = {
  in_progress: { label: "Compounding in progress", targets: [
    { value: "completed", label: "Mark Completed", color: "bg-blue-500 hover:bg-blue-600" },
  ]},
  completed: { label: "Awaiting pharmacist verification", targets: [
    { value: "verified", label: "Verify (RPh)", color: "bg-green-600 hover:bg-green-700" },
    { value: "failed", label: "Fail Batch", color: "bg-red-500 hover:bg-red-600" },
  ]},
  verified: { label: "Verified and ready for dispensing", targets: [] },
  failed: { label: "Batch failed QA", targets: [] },
};

export default function BatchStatusBar({ batchId, currentStatus }: { batchId: string; currentStatus: string }) {
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
    if (!userId) { setError("User session not found"); return; }
    setLoading(true);
    setError(null);
    try {
      await updateBatchStatus(batchId, newStatus, userId);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update");
    } finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-3 border border-red-200">{error}</div>}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{config.label}</p>
        <div className="flex gap-2">
          {config.targets.map((t) => (
            <button key={t.value} onClick={() => handleTransition(t.value)} disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${t.color}`}>
              {loading ? "..." : t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
