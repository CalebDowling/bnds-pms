"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface OrderDetail {
  id: string;
  rxNumber: string;
  status: string;
  priority: string;
  patientFirstName: string;
  patientLastName: string;
  patientDob?: string;
  patientPhone?: string;
  patientGender?: string;
  species?: string;
  breed?: string;
  weight?: number;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerPhone?: string;
  medication: string;
  formulaId?: string;
  quantity: number;
  daysSupply: number;
  refills: number;
  directions: string;
  dateReceived: string;
  dateSubmitted: string;
  dateShipped?: string;
  notes?: string;
}

interface TimelineStep {
  label: string;
  status: string;
  completed: boolean;
  current: boolean;
  date?: string;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  intake: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  pending_review: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  in_progress: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  compounding: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  qa: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  ready: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  shipped: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  picked_up: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const getEstimatedCompletionTime = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case "stat":
      return "Same day";
    case "urgent":
      return "1-2 business days";
    case "normal":
    default:
      return "3-5 business days";
  }
};

export default function OrderDetailPage(): React.ReactNode {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("prescriber_token");
      if (!token) {
        router.push("/portal");
        return;
      }
      await fetchOrderDetail(token);
    };

    checkAuth();
  }, [router, orderId]);

  const fetchOrderDetail = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/prescriber-portal/orders/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("prescriber_token");
          router.push("/portal");
          return;
        }
        throw new Error("Failed to fetch order details");
      }

      const data = await response.json();
      setOrder(data.prescription || data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load order details"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getTimelineSteps = (): TimelineStep[] => {
    if (!order) return [];

    const statusMap: Record<string, number> = {
      intake: 0,
      pending_review: 1,
      in_progress: 2,
      compounding: 2,
      qa: 3,
      ready: 4,
      shipped: 5,
      picked_up: 5,
      cancelled: -1,
    };

    const currentStatusStep = statusMap[order.status] ?? 0;

    const steps: TimelineStep[] = [
      {
        label: "Order Received",
        status: "intake",
        completed: currentStatusStep > 0,
        current: currentStatusStep === 0,
        date: order.dateReceived,
      },
      {
        label: "In Review",
        status: "pending_review",
        completed: currentStatusStep > 1,
        current: currentStatusStep === 1,
      },
      {
        label: "Compounding",
        status: "compounding",
        completed: currentStatusStep > 2,
        current: currentStatusStep === 2,
      },
      {
        label: "Quality Check",
        status: "qa",
        completed: currentStatusStep > 3,
        current: currentStatusStep === 3,
      },
      {
        label: "Ready for Pickup",
        status: "ready",
        completed: currentStatusStep > 4,
        current: currentStatusStep === 4,
      },
      {
        label: order.status === "picked_up" ? "Picked Up" : "Shipped",
        status: "final",
        completed: currentStatusStep >= 5,
        current: currentStatusStep === 5,
        date: order.dateShipped,
      },
    ];

    return steps;
  };

  const handleAddNote = async () => {
    if (!notes.trim() || !order) return;

    try {
      const token = localStorage.getItem("prescriber_token");
      if (!token) return;

      setIsAddingNote(true);
      const response = await fetch(
        `/api/prescriber-portal/orders/${order.id}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: notes }),
        }
      );

      if (response.ok) {
        setNotes("");
        // Optionally refresh the order
        const token = localStorage.getItem("prescriber_token");
        if (token) await fetchOrderDetail(token);
      }
    } catch (err) {
      console.error("Error adding note:", err);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleRequestRefill = async () => {
    if (!order) return;

    try {
      const token = localStorage.getItem("prescriber_token");
      if (!token) {
        router.push("/portal");
        return;
      }

      const response = await fetch(
        `/api/prescriber-portal/orders/${order.id}/refill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        router.push("/portal/orders/new");
      }
    } catch (err) {
      console.error("Error requesting refill:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 text-[13px]">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-[13px] mb-4">{error || "Order not found"}</p>
        <Link
          href="/portal/orders"
          className="text-[#40721D] hover:text-[#355f1a] text-[13px] font-semibold"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const statusColor = statusColors[order.status] || statusColors.intake;
  const timeline = getTimelineSteps();
  const isHuman = !order.species;

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
      `}</style>

      {/* Back Button */}
      <Link
        href="/portal/orders"
        className="text-[13px] text-[#40721D] hover:text-[#355f1a] mb-6 inline-flex items-center font-semibold stagger-1"
      >
        <span className="mr-1">←</span>
        Back to Orders
      </Link>

      <div className="mb-8 stagger-1">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Order #{order.rxNumber}</h1>
            <p className="text-[12px] text-gray-600 mt-1">
              Submitted on {new Date(order.dateSubmitted).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
          >
            {order.status.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8 stagger-2">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[14px] font-semibold text-gray-900">Order Status Timeline</h2>
          <div className="text-right">
            <p className="text-[12px] text-gray-400">Estimated completion</p>
            <p className="text-[13px] font-semibold text-gray-900 mt-0.5">
              {getEstimatedCompletionTime(order.priority)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {timeline.map((step, idx) => (
            <div key={step.status} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full gap-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white transition-all flex-shrink-0 ${
                    step.completed
                      ? "bg-[#40721D]"
                      : step.current
                      ? "bg-[#40721D] ring-2 ring-[#40721D]/30 ring-offset-2"
                      : "bg-gray-300"
                  }`}
                >
                  {step.completed ? "✓" : idx + 1}
                </div>
                {idx < timeline.length - 1 && (
                  <div
                    className={`flex-1 h-1 ${
                      step.completed ? "bg-[#40721D]" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              <div className="text-center mt-2 w-full">
                <p className="text-[11px] font-semibold text-gray-900">
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(step.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Status Details */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[12px] text-gray-600">
            <span className="font-semibold text-gray-900">Current Status:</span>{" "}
            {order.status.replace(/_/g, " ").toUpperCase()} •{" "}
            <span className="font-semibold text-gray-900">Priority:</span>{" "}
            <span className="capitalize">{order.priority}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 stagger-3">
        {/* Patient/Owner Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 text-[14px] mb-4">
              {isHuman ? "Patient Information" : "Animal Information"}
            </h3>
            <dl className="space-y-3">
              {isHuman ? (
                <>
                  <div>
                    <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</dt>
                    <dd className="text-[13px] text-gray-900 mt-1">
                      {order.patientFirstName} {order.patientLastName}
                    </dd>
                  </div>
                  {order.patientDob && (
                    <div>
                      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date of Birth</dt>
                      <dd className="text-[13px] text-gray-900 mt-1">
                        {new Date(order.patientDob).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  {order.patientPhone && (
                    <div>
                      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Phone</dt>
                      <dd className="text-[13px] text-gray-900 mt-1">{order.patientPhone}</dd>
                    </div>
                  )}
                  {order.patientGender && (
                    <div>
                      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Gender</dt>
                      <dd className="text-[13px] text-gray-900 mt-1 capitalize">
                        {order.patientGender}
                      </dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Animal Name</dt>
                    <dd className="text-[13px] text-gray-900 mt-1">
                      {order.patientFirstName} {order.patientLastName}
                    </dd>
                  </div>
                  {order.species && (
                    <div>
                      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Species</dt>
                      <dd className="text-[13px] text-gray-900 mt-1 capitalize">
                        {order.species}
                      </dd>
                    </div>
                  )}
                  {order.breed && (
                    <div>
                      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Breed</dt>
                      <dd className="text-[13px] text-gray-900 mt-1">{order.breed}</dd>
                    </div>
                  )}
                  {order.weight && (
                    <div>
                      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Weight</dt>
                      <dd className="text-[13px] text-gray-900 mt-1">{order.weight} lbs</dd>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <h4 className="text-[13px] font-semibold text-gray-900 mb-3">Owner</h4>
                    <div>
                      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</dt>
                      <dd className="text-[13px] text-gray-900 mt-1">
                        {order.ownerFirstName} {order.ownerLastName}
                      </dd>
                    </div>
                    {order.ownerPhone && (
                      <div className="mt-3">
                        <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Phone</dt>
                        <dd className="text-[13px] text-gray-900 mt-1">{order.ownerPhone}</dd>
                      </div>
                    )}
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Medication and Prescription Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Medication */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 text-[14px] mb-4">Medication</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Medication</dt>
                <dd className="text-[13px] text-gray-900 mt-1">{order.medication}</dd>
              </div>
            </dl>
          </div>

          {/* Prescription Details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 text-[14px] mb-4">Prescription Details</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Quantity</dt>
                <dd className="text-[13px] text-gray-900 mt-1">{order.quantity}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Days Supply</dt>
                <dd className="text-[13px] text-gray-900 mt-1">{order.daysSupply}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Refills</dt>
                <dd className="text-[13px] text-gray-900 mt-1">{order.refills}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Priority</dt>
                <dd className="text-[13px] text-gray-900 mt-1 capitalize">{order.priority}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Directions/SIG</dt>
              <dd className="text-[13px] text-gray-900 mt-2">{order.directions}</dd>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 text-[14px] mb-4">Messages & Notes</h3>
            {order.notes && (
              <div className="mb-6 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[13px] text-gray-700">{order.notes}</p>
              </div>
            )}

            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note or message..."
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition"
              />
              <button
                onClick={handleAddNote}
                disabled={isAddingNote || !notes.trim()}
                className="px-4 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {isAddingNote ? "Adding..." : "Add Note"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4 stagger-3">
        <button
          onClick={handleRequestRefill}
          className="px-6 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] transition-all shadow-sm"
        >
          Request Refill
        </button>
        <Link
          href="/portal/orders"
          className="px-6 py-2.5 border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          Back to Orders
        </Link>
      </div>
    </div>
  );
}
