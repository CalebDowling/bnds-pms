"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateShipmentStatus } from "@/app/(dashboard)/shipping/actions";

const TRANSITIONS: Record<string, { label: string; targets: { value: string; label: string; color: string }[] }> = {
  pending: { label: "Awaiting packing", targets: [
    { value: "packed", label: "Mark Packed", color: "bg-blue-500 hover:bg-blue-600" },
    { value: "cancelled", label: "Cancel", color: "bg-red-500 hover:bg-red-600" },
  ]},
  packed: { label: "Packed and ready to ship", targets: [
    { value: "shipped", label: "Mark Shipped", color: "bg-cyan-500 hover:bg-cyan-600" },
    { value: "cancelled", label: "Cancel", color: "bg-red-500 hover:bg-red-600" },
  ]},
  shipped: { label: "Shipped — in transit", targets: [
    { value: "delivered", label: "Mark Delivered", color: "bg-green-600 hover:bg-green-700" },
    { value: "returned", label: "Mark Returned", color: "bg-red-500 hover:bg-red-600" },
  ]},
  in_transit: { label: "In transit to patient", targets: [
    { value: "delivered", label: "Mark Delivered", color: "bg-green-600 hover:bg-green-700" },
    { value: "returned", label: "Mark Returned", color: "bg-red-500 hover:bg-red-600" },
  ]},
  delivered: { label: "Delivered to patient", targets: [] },
  returned: { label: "Returned to pharmacy", targets: [
    { value: "pending", label: "Reship", color: "bg-yellow-500 hover:bg-yellow-600" },
  ]},
  cancelled: { label: "Cancelled", targets: [] },
};

export default function ShipmentActions({ shipmentId, currentStatus }: { shipmentId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const config = TRANSITIONS[currentStatus] || { label: currentStatus, targets: [] };

  async function handleTransition(newStatus: string) {
    setLoading(true);
    setError(null);
    try {
      await updateShipmentStatus(shipmentId, newStatus);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update");
    } finally { setLoading(false); }
  }

  if (config.targets.length === 0) {
    return <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6"><p className="text-sm text-gray-500">{config.label}</p></div>;
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
