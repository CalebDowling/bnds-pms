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

const getStatusBadge = (status: string) => {
  const baseClass = "inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border";
  const statusMap: Record<string, string> = {
    intake: "bg-blue-50 text-blue-700 border-blue-200",
    pending_review: "bg-amber-50 text-amber-700 border-amber-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    compounding: "bg-amber-50 text-amber-700 border-amber-200",
    ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
    shipped: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  return `${baseClass} ${statusMap[status] || statusMap.intake}`;
};

const getPriorityBadge = (priority: string) => {
  const baseClass = "inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border";
  const priorityMap: Record<string, string> = {
    normal: "bg-gray-50 text-gray-700 border-gray-200",
    urgent: "bg-amber-50 text-amber-700 border-amber-200",
    stat: "bg-red-50 text-red-700 border-red-200",
  };
  return `${baseClass} ${priorityMap[priority] || priorityMap.normal}`;
};

type StatusTab = "all" | "pending" | "in_progress" | "completed" | "cancelled";

export default function OrdersPage(): React.ReactNode {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [prescriberName, setPrescriberName] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useEffect(() => {
    filterAndPaginateOrders();
  }, [orders, activeTab, searchTerm, currentPage]);

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

  const filterAndPaginateOrders = () => {
    let filtered = orders;

    // Apply status filter
    if (activeTab !== "all") {
      filtered = filtered.filter((order) => {
        if (activeTab === "pending") {
          return ["intake", "pending_review"].includes(order.status);
        } else if (activeTab === "completed") {
          return ["ready", "shipped"].includes(order.status);
        }
        return order.status === activeTab;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.patientName.toLowerCase().includes(searchLower) ||
          order.rxNumber.toLowerCase().includes(searchLower)
      );
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const tabs: { id: StatusTab; label: string }[] = [
    { id: "all", label: "All Orders" },
    { id: "pending", label: "Pending" },
    { id: "in_progress", label: "In Progress" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading orders...</div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .tab-active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #40721D;
          animation: fadeUp 0.3s ease-out;
        }
      `}</style>

      {/* Page Header */}
      <div className="mb-8" style={{ animation: "fadeUp 0.5s ease-out" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-gray-900">My Orders</h1>
            <p className="text-[13px] text-gray-600 mt-2">
              Welcome, {prescriberName}. View and manage your prescription orders.
            </p>
          </div>
          <Link
            href="/portal/orders/new"
            className="inline-flex items-center px-4 py-2.5 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] shadow-sm transition-all"
          >
            <span className="mr-2">+</span>
            New Order
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by patient name or RX number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#40721D]/20 focus:border-[#40721D] outline-none transition-all"
        />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-100 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentPage(1);
            }}
            className={`relative px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-[#40721D] tab-active"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[13px] text-gray-600 mb-4">
              {searchTerm ? "No orders match your search" : "No orders in this category"}
            </p>
            {!searchTerm && activeTab === "all" && (
              <Link
                href="/portal/orders/new"
                className="inline-flex items-center px-4 py-2 bg-[#40721D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#355f1a] active:scale-[0.98] shadow-sm transition-all"
              >
                Create Your First Order
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      RX Number
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Medication
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-[#f8faf6] transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-[13px] font-semibold text-[#40721D]">
                        #{order.rxNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[13px] text-gray-900">
                        {order.patientName}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-gray-600">
                        {order.medication}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(order.status)}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getPriorityBadge(order.priority)}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[13px] text-gray-600">
                        {new Date(order.dateReceived).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            router.push(`/portal/orders/${order.id}`)
                          }
                          className="text-[#40721D] hover:text-[#355f1a] text-[13px] font-semibold transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-50 px-6 py-4 flex items-center justify-between">
                <div className="text-[13px] text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of{" "}
                  {filteredOrders.length} orders
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 hover:bg-[#f8faf6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                        currentPage === page
                          ? "bg-[#40721D] text-white"
                          : "border border-gray-200 text-gray-700 hover:bg-[#f8faf6]"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 hover:bg-[#f8faf6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
