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
        eyebrow="Operations"
        title="Inventory Reorder"
        subtitle="Automated stock replenishment"
        actions={
          <label className="flex items-center gap-2 cursor-pointer">
            <span
              className="text-[11px] font-semibold uppercase"
              style={{ color: "#7a8a78", letterSpacing: "0.12em" }}
            >
              Auto-Reorder
            </span>
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                defaultChecked={false}
                className="sr-only peer"
              />
              <span
                className="w-10 h-5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all"
                style={{ backgroundColor: "#d9d2c2" }}
              ></span>
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
                accent: belowThreshold > 0 ? "#9a2c1f" : undefined,
              },
              {
                label: "Draft POs",
                value: draftPOs,
                icon: <FileText size={12} />,
                accent: draftPOs > 0 ? "#d48a28" : undefined,
              },
              {
                label: "Pending Orders",
                value: pendingOrders,
                icon: <Clock size={12} />,
                accent: pendingOrders > 0 ? "#386d8c" : undefined,
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
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
            >
              <div
                className="px-6 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid #ede6d6" }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-serif), 'Source Serif 4', Georgia, serif",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#0f2e1f",
                  }}
                >
                  Items Below Reorder Point
                </h2>
                <div className="flex items-center gap-2">
                  {selectedItems.size > 0 && (
                    <button
                      onClick={handleAddToPO}
                      className="rounded-md font-semibold transition-colors"
                      style={{
                        backgroundColor: "#1f5a3a",
                        color: "#ffffff",
                        border: "1px solid #1f5a3a",
                        padding: "5px 11px",
                        fontSize: 12,
                      }}
                    >
                      Add {selectedItems.size} to PO
                    </button>
                  )}
                  <button
                    onClick={handleAutoGenerate}
                    disabled={generating || alerts.length === 0}
                    className="rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "#386d8c",
                      color: "#ffffff",
                      border: "1px solid #386d8c",
                      padding: "5px 11px",
                      fontSize: 12,
                    }}
                  >
                    {generating ? "Generating..." : "Generate All POs"}
                  </button>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="p-12 text-center">
                  <p style={{ color: "#7a8a78" }}>All items are well-stocked</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e3ddd1", backgroundColor: "#f4ede0" }}>
                        <th className="px-4 py-2.5 text-left">
                          <input
                            type="checkbox"
                            checked={selectedItems.size === alerts.length}
                            onChange={toggleAllItems}
                            style={{ accentColor: "#1f5a3a" }}
                          />
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Item</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>NDC</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Current Stock</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Reorder Pt</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Suggested Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((alert, idx) => (
                        <tr
                          key={alert.itemId}
                          className="transition-colors"
                          style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(alert.itemId)}
                              onChange={() => toggleItemSelection(alert.itemId)}
                              style={{ accentColor: "#1f5a3a" }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p style={{ color: "#0f2e1f", fontWeight: 500 }}>
                              {alert.itemName}
                            </p>
                          </td>
                          <td className="px-4 py-3" style={{ color: "#7a8a78", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                            {alert.ndc || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              style={{
                                color: alert.currentStock <= alert.reorderPoint
                                  ? "#9a2c1f"
                                  : "#0f2e1f",
                                fontWeight: 500,
                              }}
                            >
                              {alert.currentStock}
                            </span>
                            {alert.unitOfMeasure && (
                              <span className="ml-1" style={{ color: "#a3a89c", fontSize: 12 }}>
                                {alert.unitOfMeasure}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                            {alert.reorderPoint}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center"
                              style={{
                                backgroundColor: "rgba(90,168,69,0.14)",
                                color: "#2d6a1f",
                                fontSize: 12,
                                fontWeight: 600,
                                padding: "2px 10px",
                                borderRadius: 999,
                              }}
                            >
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
            className="rounded-lg p-6 h-fit"
            style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}
          >
            <h3
              className="mb-4"
              style={{
                fontFamily: "var(--font-serif), 'Source Serif 4', Georgia, serif",
                fontSize: 16,
                fontWeight: 500,
                color: "#0f2e1f",
              }}
            >
              Recent Orders
            </h3>

            {history.length === 0 ? (
              <p style={{ color: "#7a8a78", fontSize: 13 }}>No orders yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-md p-3 transition-colors"
                    style={{ border: "1px solid #e3ddd1", backgroundColor: "#faf8f4" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p style={{ color: "#0f2e1f", fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}>
                          {order.poNumber}
                        </p>
                        <p style={{ color: "#7a8a78", fontSize: 12 }}>{order.supplier}</p>
                      </div>
                      <span
                        className="inline-flex items-center capitalize whitespace-nowrap"
                        style={{
                          backgroundColor:
                            order.status === "draft"
                              ? "rgba(212,138,40,0.14)"
                              : order.status === "approved"
                              ? "rgba(56,109,140,0.12)"
                              : "rgba(90,168,69,0.14)",
                          color:
                            order.status === "draft"
                              ? "#8a5a17"
                              : order.status === "approved"
                              ? "#2c5e7a"
                              : "#2d6a1f",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between tabular-nums" style={{ color: "#7a8a78", fontSize: 12 }}>
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
