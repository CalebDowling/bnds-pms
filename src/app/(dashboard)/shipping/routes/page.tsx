"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  getTodayDeliveries,
  optimizeDeliveryRoute,
  getDrivers,
  saveRoute,
  startRoute,
  getRouteHistory,
  type TodayDelivery,
  type RouteRecord,
  type DriverOption,
} from "./actions";
import type { OptimizedRoute, RouteStop } from "@/lib/delivery/route-optimizer";
import { formatDate } from "@/lib/utils/formatters";

type Tab = "plan" | "history";

export default function RoutePlanningPage() {
  // Tab state
  const [tab, setTab] = useState<Tab>("plan");

  // Plan tab state
  const [deliveries, setDeliveries] = useState<TodayDelivery[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [optimized, setOptimized] = useState<OptimizedRoute | null>(null);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeSaved, setRouteSaved] = useState(false);

  // History tab state
  const [history, setHistory] = useState<RouteRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Drag-and-drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  // Load deliveries and drivers
  useEffect(() => {
    const load = async () => {
      try {
        const [dels, drvs] = await Promise.all([getTodayDeliveries(), getDrivers()]);
        setDeliveries(dels);
        setDrivers(drvs);
        // Auto-select all
        setSelected(new Set(dels.map((d) => d.shipmentId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load deliveries");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load history when switching to history tab
  useEffect(() => {
    if (tab === "history" && history.length === 0) {
      setHistoryLoading(true);
      getRouteHistory()
        .then(setHistory)
        .catch(() => {})
        .finally(() => setHistoryLoading(false));
    }
  }, [tab, history.length]);

  // Toggle delivery selection
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Reset optimization when selection changes
    setOptimized(null);
    setRouteSaved(false);
  };

  // Select / deselect all
  const toggleAll = () => {
    if (selected.size === deliveries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(deliveries.map((d) => d.shipmentId)));
    }
    setOptimized(null);
    setRouteSaved(false);
  };

  // Optimize
  const handleOptimize = async () => {
    if (selected.size === 0) {
      setError("Select at least one delivery to optimize");
      return;
    }
    setOptimizing(true);
    setError(null);
    try {
      const result = await optimizeDeliveryRoute(Array.from(selected));
      setOptimized(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setOptimizing(false);
    }
  };

  // Drag & drop reorder
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverIdx.current = idx;
  };

  const handleDrop = useCallback(() => {
    if (dragIdx === null || dragOverIdx.current === null || !optimized) return;
    if (dragIdx === dragOverIdx.current) return;

    const newStops = [...optimized.stops];
    const [removed] = newStops.splice(dragIdx, 1);
    newStops.splice(dragOverIdx.current, 0, removed);

    // Reassign sort orders
    const reordered = newStops.map((s, idx) => ({ ...s, sortOrder: idx + 1 }));
    setOptimized({ ...optimized, stops: reordered });
    setDragIdx(null);
    dragOverIdx.current = null;
  }, [dragIdx, optimized]);

  // Save route & start
  const handleSaveRoute = async () => {
    if (!optimized || optimized.stops.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const routeName = `Route ${new Date().toLocaleDateString()} (${optimized.stops.length} stops)`;
      const routeId = await saveRoute(
        routeName,
        optimized.stops,
        selectedDriver || undefined
      );
      setRouteSaved(true);

      // Store the route ID for start button
      setOptimized({
        ...optimized,
        pharmacyAddress: routeId, // piggyback routeId for the start action
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save route");
    } finally {
      setSaving(false);
    }
  };

  const handleStartRoute = async () => {
    if (!optimized) return;
    // The routeId was stored in pharmacyAddress after save
    const routeId = optimized.pharmacyAddress;
    if (!routeId || routeId.includes(",")) {
      setError("Please save the route first");
      return;
    }
    try {
      await startRoute(routeId);
      // Reload history
      const h = await getRouteHistory();
      setHistory(h);
      setTab("history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start route");
    }
  };

  // Print route sheet
  const handlePrint = () => {
    window.print();
  };

  // Format time
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Route Planning</h1>
          <p className="text-sm text-gray-500 mt-1">
            Optimize delivery routes and assign drivers
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/shipping"
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Shipping
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab("plan")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "plan"
              ? "border-[#40721D] text-[#40721D]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Plan Route
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "history"
              ? "border-[#40721D] text-[#40721D]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Route History
        </button>
      </div>

      {tab === "plan" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Delivery Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Map Placeholder */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Route Map
              </h2>
              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center relative overflow-hidden">
                {optimized && optimized.stops.length > 0 ? (
                  <div className="absolute inset-0 p-4">
                    {/* Simple visual markers */}
                    <div className="relative w-full h-full">
                      {/* Pharmacy marker */}
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#40721D] text-white text-xs flex items-center justify-center font-bold">
                          P
                        </span>
                        <span className="text-xs text-gray-600 bg-white px-1 rounded shadow-sm">
                          Pharmacy
                        </span>
                      </div>
                      {/* Stop markers distributed across the map area */}
                      {optimized.stops.map((stop, idx) => {
                        const total = optimized.stops.length;
                        const angle = (idx / total) * Math.PI * 1.5 + Math.PI / 4;
                        const radius = 35;
                        const cx = 50 + radius * Math.cos(angle);
                        const cy = 50 + radius * Math.sin(angle);
                        return (
                          <div
                            key={stop.id}
                            className="absolute flex items-center gap-1"
                            style={{
                              left: `${Math.max(5, Math.min(85, cx))}%`,
                              top: `${Math.max(10, Math.min(85, cy))}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            <span className="w-6 h-6 rounded-full bg-[#40721D] text-white text-xs flex items-center justify-center font-bold shadow-md">
                              {stop.sortOrder}
                            </span>
                            <span className="text-[10px] text-gray-700 bg-white/90 px-1 rounded shadow-sm whitespace-nowrap max-w-[100px] truncate">
                              {stop.patientName.split(",")[0]}
                            </span>
                          </div>
                        );
                      })}
                      {/* Route lines (simplified) */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                        {optimized.stops.length > 1 &&
                          optimized.stops.map((stop, idx) => {
                            if (idx === 0) return null;
                            const total = optimized.stops.length;
                            const prevAngle = ((idx - 1) / total) * Math.PI * 1.5 + Math.PI / 4;
                            const currAngle = (idx / total) * Math.PI * 1.5 + Math.PI / 4;
                            const r = 35;
                            const x1 = 50 + r * Math.cos(prevAngle);
                            const y1 = 50 + r * Math.sin(prevAngle);
                            const x2 = 50 + r * Math.cos(currAngle);
                            const y2 = 50 + r * Math.sin(currAngle);
                            return (
                              <line
                                key={`line-${idx}`}
                                x1={`${x1}%`}
                                y1={`${y1}%`}
                                x2={`${x2}%`}
                                y2={`${y2}%`}
                                stroke="#40721D"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                                opacity="0.5"
                              />
                            );
                          })}
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">
                      Select deliveries and click &quot;Optimize Route&quot; to see the map
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Deliveries */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Today&apos;s Deliveries ({deliveries.length})
                </h2>
                <button
                  onClick={toggleAll}
                  className="text-xs text-[#40721D] hover:underline"
                >
                  {selected.size === deliveries.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading deliveries...</div>
              ) : deliveries.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-400 text-sm">No pending deliveries for today</p>
                  <Link
                    href="/shipping/new"
                    className="text-[#40721D] text-sm font-medium hover:underline mt-2 inline-block"
                  >
                    Create a shipment
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {deliveries.map((d) => (
                    <label
                      key={d.shipmentId}
                      className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selected.has(d.shipmentId) ? "bg-green-50/50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(d.shipmentId)}
                        onChange={() => toggleSelect(d.shipmentId)}
                        className="w-4 h-4 text-[#40721D] rounded mt-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {d.patientName}
                          <span className="text-xs text-gray-400 font-mono ml-2">
                            {d.patientMrn}
                          </span>
                        </p>
                        {d.address ? (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {d.address.line1}, {d.address.city}, {d.address.state}{" "}
                            {d.address.zip}
                          </p>
                        ) : (
                          <p className="text-xs text-red-400 mt-0.5">No address on file</p>
                        )}
                        {d.items.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {d.items.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            d.status === "pending"
                              ? "bg-yellow-50 text-yellow-700"
                              : d.status === "packed"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-cyan-50 text-cyan-700"
                          }`}
                        >
                          {d.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <div className="flex gap-1">
                          {d.requiresSignature && (
                            <span className="text-[9px] text-orange-600">SIG</span>
                          )}
                          {d.requiresColdChain && (
                            <span className="text-[9px] text-blue-600">COLD</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Optimized Route Stops (drag-to-reorder) */}
            {optimized && optimized.stops.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Optimized Stop Order (drag to reorder)
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {optimized.stops.map((stop, idx) => (
                    <div
                      key={stop.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={handleDrop}
                      className={`flex items-center gap-3 p-4 cursor-grab active:cursor-grabbing transition-colors ${
                        dragIdx === idx ? "bg-green-50 opacity-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-7 h-7 rounded-full bg-[#40721D] text-white text-xs flex items-center justify-center font-bold shrink-0">
                        {stop.sortOrder}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{stop.patientName}</p>
                        <p className="text-xs text-gray-500">{stop.address}</p>
                        {stop.items.length > 0 && (
                          <p className="text-xs text-gray-400 truncate">
                            {stop.items.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {stop.estimatedArrival && (
                          <p className="text-xs text-gray-500">
                            ETA {formatTime(stop.estimatedArrival)}
                          </p>
                        )}
                      </div>
                      <div className="text-gray-300 shrink-0 cursor-grab">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="5" cy="3" r="1.5" />
                          <circle cx="11" cy="3" r="1.5" />
                          <circle cx="5" cy="8" r="1.5" />
                          <circle cx="11" cy="8" r="1.5" />
                          <circle cx="5" cy="13" r="1.5" />
                          <circle cx="11" cy="13" r="1.5" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Actions & Summary */}
          <div className="space-y-4">
            {/* Optimize Button */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <button
                onClick={handleOptimize}
                disabled={optimizing || selected.size === 0}
                className="w-full py-3 bg-[#40721D] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {optimizing ? "Optimizing..." : "Optimize Route"}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                {selected.size} stop{selected.size !== 1 ? "s" : ""} selected
              </p>
            </div>

            {/* Route Summary */}
            {optimized && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Route Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Stops</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {optimized.stops.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Est. Distance</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {optimized.totalDistanceMiles} mi
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Est. Drive Time</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {optimized.totalDriveTimeMinutes < 60
                        ? `${optimized.totalDriveTimeMinutes} min`
                        : `${Math.floor(optimized.totalDriveTimeMinutes / 60)}h ${optimized.totalDriveTimeMinutes % 60}m`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Start</span>
                    <span className="text-sm text-gray-900">
                      {formatTime(optimized.estimatedStartTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Est. Finish</span>
                    <span className="text-sm text-gray-900">
                      {formatTime(optimized.estimatedEndTime)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Assign Driver */}
            {optimized && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Assign Driver
                </h3>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                >
                  <option value="">-- Select Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Save & Start */}
            {optimized && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                {!routeSaved ? (
                  <button
                    onClick={handleSaveRoute}
                    disabled={saving}
                    className="w-full py-2 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving..." : "Save Route"}
                  </button>
                ) : (
                  <>
                    <div className="text-center text-sm text-green-700 font-medium">
                      Route saved
                    </div>
                    <button
                      onClick={handleStartRoute}
                      className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Route
                    </button>
                  </>
                )}

                <button
                  onClick={handlePrint}
                  className="w-full py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Print Route Sheet
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── History Tab ──────────────────────────────────────── */
        <div className="bg-white rounded-xl border border-gray-200">
          {historyLoading ? (
            <div className="p-8 text-center text-gray-400">Loading route history...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm">No routes yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stops
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {r.routeName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(r.routeDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.driverName || "Unassigned"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.deliveredCount}/{r.stopCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                            r.status === "completed"
                              ? "bg-green-50 text-green-700"
                              : r.status === "active"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {r.startedAt ? formatTime(r.startedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
