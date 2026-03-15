"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Order {
  id: string;
  rxNumber: string;
  status: string;
  priority: string;
  patientName: string;
  medication: string;
  daysSupply: number;
  dateReceived: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  intake: { bg: "bg-yellow-50", text: "text-yellow-700" },
  pending_review: { bg: "bg-blue-50", text: "text-blue-700" },
  in_progress: { bg: "bg-purple-50", text: "text-purple-700" },
  compounding: { bg: "bg-orange-50", text: "text-orange-700" },
  ready: { bg: "bg-green-50", text: "text-green-700" },
  shipped: { bg: "bg-gray-50", text: "text-gray-700" },
  cancelled: { bg: "bg-red-50", text: "text-red-700" },
};

const priorityColors: Record<string, string> = {
  normal: "bg-gray-100 text-gray-800",
  urgent: "bg-orange-100 text-orange-800",
  stat: "bg-red-100 text-red-800",
};

export default function OrdersPage(): React.ReactNode {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [prescriberName, setPrescriberName] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("prescriber_token");
      const name = localStorage.getItem("prescriber_name");

      if (!token) {
        router.push("/portal");
        return;
      }

      setPrescriberName(name || "");
      await fetchOrders(token);
    };

    checkAuth();
  }, [router]);

  const fetchOrders = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/prescriber-portal/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("prescriber_token");
          router.push("/portal");
          return;
        }
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.prescriptions || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load orders"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading orders...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600 mt-1">
              Welcome, {prescriberName}. View and manage your prescription orders.
            </p>
          </div>
          <Link
            href="/portal/orders/new"
            className="inline-flex items-center px-4 py-2.5 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
          >
            <span className="mr-2">+</span>
            New Order
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No orders submitted yet</p>
            <Link
              href="/portal/orders/new"
              className="inline-flex items-center px-4 py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
            >
              Create Your First Order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">
                    RX Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Medication
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => {
                  const statusColor =
                    statusColors[order.status] || statusColors.intake;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/portal/orders/${order.id}`)
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#40721D]">
                        #{order.rxNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.patientName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {order.medication}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[order.priority] || priorityColors.normal}`}
                        >
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(order.dateReceived).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
