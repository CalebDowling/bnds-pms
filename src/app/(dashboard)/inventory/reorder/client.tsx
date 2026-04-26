"use client";

import { useState } from "react";
import { TrendingDown, FileText, Clock, Settings } from "lucide-react";
import type { ReorderAlert, ReorderHistoryItem } from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import StatsRow from "@/components/layout/StatsRow";
import { formatDateTime } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";

interface ReorderPageProps {
  initialAlerts: ReorderAlert[];
  initialHistory: ReorderHistoryItem[];
}

export function ReorderPage({
  initialAlerts,
  initialHistory,
}: ReorderPageProps) {
  const [alerts, setAlerts] = useState<ReorderAlert[]>(initialAlerts);
  const [history, setHistory] = useState<ReorderHistoryItem[]>(initialHistory);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  async function loadData() {
    try {
      const res = await fetch("/api/inventory/reorder-data");
      if (!res.ok) throw new Error("Failed to load");

      const { alerts: alertsData, history: historyData } = await res.json();
      setAlerts(alertsData);
      setHistory(historyData);
    } catch (error) {
      console.error("Failed to load reorder data:", error);
    }
  }

  async function handleAutoGenerate() {
    try {
      setGenerating(true);
      const res = await fetch("/api/inventory/auto-reorder", { method: "POST" });
      if (!res.ok) throw new Error("Failed");

      await loadData();
    } catch (error) {
      console.error("Failed to auto-generate orders:", error);
    } finally {
      setGenerating(false);
    }
  }

  async function handleAddToPO() {
    if (selectedItems.size === 0) return;

    try {
      const itemsToOrder = Array.from(selectedItems)
        .map((itemId) => {
          const alert = alerts.find((a) => a.itemId === itemId);
          return alert
            ? {
                itemId,
                quantity: alert.suggestedQuantity,
              }
            : null;
        })
        .filter((item) => item !== null);

      if (itemsToOrder.length > 0) {
        const res = await fetch("/api/inventory/purchase-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsToOrder }),
        });

        if (!res.ok) throw new Error("Failed");

        setSelectedItems(new Set());
        await loadData();
      }
    } catch (error) {
      console.error("Failed to create PO:", error);
    }
  }

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const toggleAllItems = () => {
    if (selectedItems.size === alerts.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(alerts.map((a) => a.itemId)));
    }
  };

  const belowThreshold = alerts.length;
  const draftPOs = history.filter((h) => h.status === "draft").length;
  const pendingOrders = history.filter(
    (h) => h.status === "approved" || h.status === "submitted"
  ).length;

  return (
    <PermissionGuard resource="inventory" action="write">
      <PageShell
        title="Inventory Reorder"
        subtitle="Automated stock replenishment"
        actions={
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Auto-Reorder
            </span>
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                defaultChecked={false}
                className="sr-only peer"
              />
              <span className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{ backgroundColor: "var(--border)" }}></span>
            </span>
          </label>
        }
        stats={
          <StatsRow
            stats={[
              {
                label: "Below Threshold",
                value: belowThreshold,
                icon: <TrendingDown size={12} />,
                accent: belowThreshold > 0 ? "#dc2626" : undefined,
              },
              {
                label: "Draft POs",
                value: draftPOs,
                icon: <FileText size={12} />,
                accent: draftPOs > 0 ? "#d97706" : undefined,
              },
              {
                label: "Pending Orders",
                value: pendingOrders,
                icon: <Clock size={12} />,
                accent: pendingOrders > 0 ? "#2563eb" : undefined,
              },
              {
                label: "Reorder Points Set",
                value: alerts.length + history.length,
                icon: <Settings size={12} />,
              },
            ]}
          />
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Table */}
          <div className="lg:col-span-2">
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
            >
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border-light)" }}
              >
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Items Below Reorder Point</h2>
                <div className="flex items-center gap-2">
                  {selectedItems.size > 0 && (
                    <button
                      onClick={handleAddToPO}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
                      style={{ backgroundColor: "var(--color-primary)" }}
                    >
                      Add {selectedItems.size} to PO
                    </button>
                  )}
                  <button
                    onClick={handleAutoGenerate}
                    disabled={generating || alerts.length === 0}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#2563eb" }}
                  >
                    {generating ? "Generating..." : "Generate All POs"}
                  </button>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-400">All items are well-stocked</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedItems.size === alerts.length}
                            onChange={toggleAllItems}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          NDC
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Reorder Pt
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Suggested Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {alerts.map((alert) => (
                        <tr
                          key={alert.itemId}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(alert.itemId)}
                              onChange={() => toggleItemSelection(alert.itemId)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {alert.itemName}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                            {alert.ndc || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-sm font-medium ${
                                alert.currentStock <= alert.reorderPoint
                                  ? "text-red-600"
                                  : "text-gray-900"
                              }`}
                            >
                              {alert.currentStock}
                            </span>
                            {alert.unitOfMeasure && (
                              <span className="text-xs text-gray-400 ml-1">
                                {alert.unitOfMeasure}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {alert.reorderPoint}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
                              {alert.suggestedQuantity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Recent POs */}
          <div
            className="rounded-xl p-6 h-fit"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Recent Orders</h3>

            {history.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No orders yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-lg p-3 transition-colors"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                          {order.poNumber}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{order.supplier}</p>
                      </div>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                        style={{
                          backgroundColor:
                            order.status === "draft"
                              ? "#fef3c7"
                              : order.status === "approved"
                              ? "#dbeafe"
                              : "var(--green-100)",
                          color:
                            order.status === "draft"
                              ? "#92400e"
                              : order.status === "approved"
                              ? "#1e40af"
                              : "var(--green-700)",
                        }}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                      <span>{order.itemCount} items</span>
                      <span>{formatDateTime(order.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageShell>
    </PermissionGuard>
  );
}
