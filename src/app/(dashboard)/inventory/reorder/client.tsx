"use client";

import { useState } from "react";
import type { ReorderAlert, ReorderHistoryItem } from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";

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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Reorder</h1>
          <p className="text-gray-500 mt-1">Automated stock replenishment</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">
                  Below Threshold
                </p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {belowThreshold}
                </p>
              </div>
              <div className="text-4xl opacity-20">📉</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">
                  Draft POs
                </p>
                <p className="text-3xl font-bold text-amber-600 mt-2">
                  {draftPOs}
                </p>
              </div>
              <div className="text-4xl opacity-20">📝</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">
                  Pending Orders
                </p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {pendingOrders}
                </p>
              </div>
              <div className="text-4xl opacity-20">⏳</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase">
                  Auto-Reorder
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={false}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#40721D]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#40721D]"></div>
                  </label>
                </div>
              </div>
              <div className="text-4xl opacity-20">⚙️</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Items Below Reorder Point</h2>
                <div className="flex items-center gap-2">
                  {selectedItems.size > 0 && (
                    <button
                      onClick={handleAddToPO}
                      className="px-3 py-1.5 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] transition-colors"
                    >
                      Add {selectedItems.size} to PO
                    </button>
                  )}
                  <button
                    onClick={handleAutoGenerate}
                    disabled={generating || alerts.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Orders</h3>

            {history.length === 0 ? (
              <p className="text-sm text-gray-400">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {order.poNumber}
                        </p>
                        <p className="text-xs text-gray-500">{order.supplier}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          order.status === "draft"
                            ? "bg-amber-50 text-amber-700"
                            : order.status === "approved"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-green-50 text-green-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{order.itemCount} items</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
