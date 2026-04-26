"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { PurchaseOrder, PurchaseOrderLineItem } from "./actions";
import {
  searchCardinalCatalog,
  createOrder,
  retryOrder,
  cancelOrder,
} from "./actions";
import type { CatalogItem } from "@/lib/integrations/cardinal-health";
import { formatDateTime } from "@/lib/utils/formatters";

// ─── Cart Item Type ─────────────────────────────

interface CartItem {
  ndc: string;
  productName: string;
  manufacturer: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  strength?: string;
  dosageForm?: string;
  packageSize?: string;
}

// ─── Status Badge Colors ────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  draft: { label: "Draft", bg: "bg-gray-100", text: "text-gray-700" },
  submitted: { label: "Submitted", bg: "bg-blue-100", text: "text-blue-700" },
  confirmed: { label: "Confirmed", bg: "bg-indigo-100", text: "text-indigo-700" },
  processing: { label: "Processing", bg: "bg-yellow-100", text: "text-yellow-700" },
  shipped: { label: "Shipped", bg: "bg-purple-100", text: "text-purple-700" },
  delivered: { label: "Delivered", bg: "bg-green-100", text: "text-green-700" },
  cancelled: { label: "Cancelled", bg: "bg-red-100", text: "text-red-700" },
  error: { label: "Error", bg: "bg-red-100", text: "text-red-700" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

// ─── Format Helpers ─────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatNdc(ndc: string) {
  const clean = ndc.replace(/\D/g, "");
  if (clean.length === 11) {
    return `${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
  }
  return ndc;
}

// ─── Main Client Component ──────────────────────

export function PurchaseOrdersClient({
  initialOrders,
}: {
  initialOrders: PurchaseOrder[];
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // Silent refresh failure
    }
  }, []);

  const handleRetry = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const updated = await retryOrder(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Retry failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("Cancel this purchase order?")) return;
    setActionLoading(orderId);
    try {
      const updated = await cancelOrder(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Cancel failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOrderCreated = (order: PurchaseOrder) => {
    setOrders((prev) => [order, ...prev]);
    setShowNewOrder(false);
  };

  // Stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) =>
    ["submitted", "confirmed", "processing"].includes(o.status)
  ).length;
  const shippedOrders = orders.filter((o) => o.status === "shipped").length;
  const errorOrders = orders.filter((o) => o.status === "error").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/inventory"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Inventory
            </Link>
            <span className="text-sm text-gray-400">/</span>
            <span className="text-sm text-gray-700 font-medium">Purchase Orders</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary, #111827)" }}>
            Purchase Orders
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary, #6B7280)" }}>
            Order from Cardinal Health wholesale
          </p>
        </div>
        <button
          onClick={() => setShowNewOrder(true)}
          className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
          style={{ backgroundColor: "var(--green-700, #40721D)" }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--green-800, #2D5114)")}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--green-700, #40721D)")}
        >
          + New Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-stat rounded-xl p-4" style={{ backgroundColor: "var(--card-bg, #FFFFFF)" }}>
          <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-secondary, #9CA3AF)" }}>
            Total Orders
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary, #111827)" }}>
            {totalOrders}
          </p>
        </div>
        <div className="glass-stat rounded-xl p-4" style={{ backgroundColor: "var(--card-bg, #FFFFFF)" }}>
          <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-secondary, #9CA3AF)" }}>
            Pending
          </p>
          <p className={`text-2xl font-bold mt-1 ${pendingOrders > 0 ? "text-blue-600" : ""}`} style={{ color: pendingOrders > 0 ? undefined : "var(--text-primary, #111827)" }}>
            {pendingOrders}
          </p>
        </div>
        <div className="glass-stat rounded-xl p-4" style={{ backgroundColor: "var(--card-bg, #FFFFFF)" }}>
          <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-secondary, #9CA3AF)" }}>
            Shipped
          </p>
          <p className={`text-2xl font-bold mt-1 ${shippedOrders > 0 ? "text-purple-600" : ""}`} style={{ color: shippedOrders > 0 ? undefined : "var(--text-primary, #111827)" }}>
            {shippedOrders}
          </p>
        </div>
        <div className="glass-stat rounded-xl p-4" style={{ backgroundColor: "var(--card-bg, #FFFFFF)" }}>
          <p className="text-xs font-semibold uppercase" style={{ color: "var(--text-secondary, #9CA3AF)" }}>
            Errors
          </p>
          <p className={`text-2xl font-bold mt-1 ${errorOrders > 0 ? "text-red-600" : ""}`} style={{ color: errorOrders > 0 ? undefined : "var(--text-primary, #111827)" }}>
            {errorOrders}
          </p>
        </div>
      </div>

      {/* New Order Modal */}
      {showNewOrder && (
        <NewOrderForm
          onClose={() => setShowNewOrder(false)}
          onCreated={handleOrderCreated}
        />
      )}

      {/* Orders Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: "var(--card-bg, #FFFFFF)",
          borderColor: "var(--border-color, #E5E7EB)",
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "var(--table-header-bg, #F9FAFB)" }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: "var(--text-secondary, #6B7280)" }}>
                PO Number
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: "var(--text-secondary, #6B7280)" }}>
                Date
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: "var(--text-secondary, #6B7280)" }}>
                Status
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: "var(--text-secondary, #6B7280)" }}>
                Items
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: "var(--text-secondary, #6B7280)" }}>
                Total
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: "var(--text-secondary, #6B7280)" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary, #6B7280)" }}>
                      No purchase orders yet
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-secondary, #9CA3AF)" }}>
                      Click "New Order" to create your first Cardinal Health order
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  expanded={expandedOrder === order.id}
                  onToggle={() =>
                    setExpandedOrder(expandedOrder === order.id ? null : order.id)
                  }
                  onRetry={() => handleRetry(order.id)}
                  onCancel={() => handleCancel(order.id)}
                  loading={actionLoading === order.id}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Order Row with Expand ──────────────────────

function OrderRow({
  order,
  expanded,
  onToggle,
  onRetry,
  onCancel,
  loading,
}: {
  order: PurchaseOrder;
  expanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <>
      <tr
        className="border-t cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ borderColor: "var(--border-color, #E5E7EB)" }}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary, #111827)" }}>
              {order.poNumber}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary, #6B7280)" }}>
          {formatDateTime(order.createdAt)}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-4 py-3 text-sm text-right" style={{ color: "var(--text-primary, #111827)" }}>
          {order.lineItems.length}
        </td>
        <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: "var(--text-primary, #111827)" }}>
          {formatCurrency(order.totalCost)}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {order.status === "error" && (
              <button
                onClick={onRetry}
                disabled={loading}
                className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {loading ? "..." : "Retry"}
              </button>
            )}
            {["draft", "submitted", "error"].includes(order.status) && (
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Line Items */}
      {expanded && (
        <tr>
          <td colSpan={6} className="px-0 py-0">
            <div
              className="mx-4 mb-3 rounded-lg border overflow-hidden"
              style={{
                backgroundColor: "var(--table-header-bg, #F9FAFB)",
                borderColor: "var(--border-color, #E5E7EB)",
              }}
            >
              {order.errorMessage && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm text-red-700">
                  Error: {order.errorMessage}
                </div>
              )}
              {order.trackingNumber && (
                <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 text-sm text-purple-700">
                  Tracking: {order.trackingCarrier ? `${order.trackingCarrier} - ` : ""}
                  {order.trackingNumber}
                </div>
              )}
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">NDC</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Product</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Manufacturer</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Unit Price</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Ext. Price</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lineItems.map((li, idx) => (
                    <tr
                      key={idx}
                      className="border-t"
                      style={{ borderColor: "var(--border-color, #E5E7EB)" }}
                    >
                      <td className="px-3 py-2 text-xs font-mono text-gray-600">
                        {formatNdc(li.ndc)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-800">
                        {li.productName}
                        {li.strength && (
                          <span className="text-gray-500 ml-1">{li.strength}</span>
                        )}
                        {li.dosageForm && (
                          <span className="text-gray-400 ml-1">({li.dosageForm})</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {li.manufacturer}
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-gray-800">
                        {li.quantity} {li.unit}
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-gray-600">
                        {formatCurrency(li.unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-medium text-gray-800">
                        {formatCurrency(li.extendedPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: "var(--border-color, #D1D5DB)" }}>
                    <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-right text-gray-600">
                      Subtotal
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-bold text-gray-800">
                      {formatCurrency(order.subtotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              {order.notes && (
                <div className="px-4 py-2 border-t text-xs text-gray-500" style={{ borderColor: "var(--border-color, #E5E7EB)" }}>
                  Notes: {order.notes}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── New Order Form ─────────────────────────────

function NewOrderForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (order: PurchaseOrder) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced catalog search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCardinalCatalog(query);
        setSearchResults(results);
      } catch (err) {
        console.error("Catalog search error:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const addToCart = (item: CatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.ndc === item.ndc);
      if (existing) {
        return prev.map((c) =>
          c.ndc === item.ndc ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          ndc: item.ndc,
          productName: item.productName,
          manufacturer: item.manufacturer,
          quantity: 1,
          unit: item.unit || "EA",
          unitPrice: item.contractPrice || item.unitPrice,
          strength: item.strength,
          dosageForm: item.dosageForm,
          packageSize: item.packageSize,
        },
      ];
    });
  };

  const updateQuantity = (ndc: string, quantity: number) => {
    if (quantity < 1) {
      setCart((prev) => prev.filter((c) => c.ndc !== ndc));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.ndc === ndc ? { ...c, quantity } : c))
      );
    }
  };

  const removeFromCart = (ndc: string) => {
    setCart((prev) => prev.filter((c) => c.ndc !== ndc));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const order = await createOrder(cart, { notes: notes || undefined });
      onCreated(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ backgroundColor: "var(--card-bg, #FFFFFF)" }}
      >
        {/* Modal Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b rounded-t-2xl"
          style={{
            backgroundColor: "var(--card-bg, #FFFFFF)",
            borderColor: "var(--border-color, #E5E7EB)",
          }}
        >
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary, #111827)" }}
            >
              New Purchase Order
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary, #6B7280)" }}>
              Search the Cardinal Health catalog and build your order
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Search */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-primary, #111827)" }}
            >
              Search Cardinal Health Catalog
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Enter NDC number or product name..."
                className="w-full px-4 py-2.5 pl-10 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{
                  borderColor: "var(--border-color, #D1D5DB)",
                  color: "var(--text-primary, #111827)",
                  backgroundColor: "var(--input-bg, #FFFFFF)",
                }}
              />
              <svg
                className="absolute left-3 top-3 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searching && (
                <div className="absolute right-3 top-3">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div
                className="mt-2 rounded-lg border overflow-hidden max-h-64 overflow-y-auto"
                style={{ borderColor: "var(--border-color, #E5E7EB)" }}
              >
                {searchResults.map((item) => {
                  const inCart = cart.some((c) => c.ndc === item.ndc);
                  return (
                    <div
                      key={item.ndc}
                      className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                      style={{ borderColor: "var(--border-color, #F3F4F6)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">
                            {formatNdc(item.ndc)}
                          </span>
                          {item.deaSchedule && (
                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1 rounded">
                              C-{item.deaSchedule}
                            </span>
                          )}
                          {!item.available && (
                            <span className="text-[10px] font-medium bg-red-100 text-red-600 px-1 rounded">
                              Unavailable
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary, #111827)" }}>
                          {item.productName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.manufacturer}
                          {item.strength && ` | ${item.strength}`}
                          {item.dosageForm && ` | ${item.dosageForm}`}
                          {item.packageSize && ` | ${item.packageSize}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary, #111827)" }}>
                            {formatCurrency(item.contractPrice || item.unitPrice)}
                          </p>
                          {item.contractPrice && item.contractPrice < item.unitPrice && (
                            <p className="text-[10px] text-gray-400 line-through">
                              {formatCurrency(item.unitPrice)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!item.available}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            inCart
                              ? "bg-green-100 text-green-700"
                              : item.available
                                ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {inCart ? "Added" : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">
                No products found for "{searchQuery}"
              </p>
            )}
          </div>

          {/* Cart */}
          <div>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: "var(--text-primary, #111827)" }}
            >
              Order Items ({cart.length})
            </h3>

            {cart.length === 0 ? (
              <div
                className="text-center py-8 rounded-lg border border-dashed"
                style={{ borderColor: "var(--border-color, #D1D5DB)" }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary, #9CA3AF)" }}>
                  Search above to add items to your order
                </p>
              </div>
            ) : (
              <div
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: "var(--border-color, #E5E7EB)" }}
              >
                {cart.map((item) => (
                  <div
                    key={item.ndc}
                    className="flex items-center justify-between px-4 py-3 border-b last:border-b-0"
                    style={{ borderColor: "var(--border-color, #F3F4F6)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary, #111827)" }}>
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatNdc(item.ndc)} | {item.manufacturer}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.ndc, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.ndc, parseInt(e.target.value) || 1)
                          }
                          className="w-14 text-center text-sm border rounded py-1"
                          style={{ borderColor: "var(--border-color, #D1D5DB)" }}
                        />
                        <button
                          onClick={() => updateQuantity(item.ndc, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <div className="w-20 text-right">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary, #111827)" }}>
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatCurrency(item.unitPrice)} ea.
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.ndc)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Cart Total */}
                <div
                  className="flex items-center justify-between px-4 py-3 font-semibold"
                  style={{ backgroundColor: "var(--table-header-bg, #F9FAFB)" }}
                >
                  <span className="text-sm" style={{ color: "var(--text-primary, #111827)" }}>
                    Estimated Total
                  </span>
                  <span className="text-sm" style={{ color: "var(--text-primary, #111827)" }}>
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--text-primary, #111827)" }}
            >
              Order Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions or notes..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2"
              style={{
                borderColor: "var(--border-color, #D1D5DB)",
                color: "var(--text-primary, #111827)",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t rounded-b-2xl"
          style={{
            backgroundColor: "var(--card-bg, #FFFFFF)",
            borderColor: "var(--border-color, #E5E7EB)",
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={cart.length === 0 || submitting}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: "var(--green-700, #40721D)" }}
            onMouseOver={(e) => {
              if (!submitting && cart.length > 0)
                e.currentTarget.style.backgroundColor = "var(--green-800, #2D5114)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "var(--green-700, #40721D)";
            }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              `Submit Order (${cart.length} items - ${formatCurrency(cartTotal)})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
