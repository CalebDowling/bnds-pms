"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDurDashboard,
  runDurCheck,
  overrideAlert,
  type DurDashboardData,
} from "./actions";
import { DUR_OVERRIDE_REASON_CODES } from "@/lib/clinical/dur-engine";
import type { DURAlert, DUROverrideRecord } from "@/lib/clinical/dur-engine";

type Tab = "alerts" | "overrides";

const SEVERITY_STYLES: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  critical: { bg: "bg-red-50", border: "border-red-300", badge: "bg-red-600 text-white", text: "text-red-700" },
  major: { bg: "bg-amber-50", border: "border-amber-300", badge: "bg-amber-500 text-white", text: "text-amber-700" },
  moderate: { bg: "bg-yellow-50", border: "border-yellow-300", badge: "bg-yellow-500 text-white", text: "text-yellow-700" },
  minor: { bg: "bg-blue-50", border: "border-blue-300", badge: "bg-blue-500 text-white", text: "text-blue-700" },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  drug_interaction: "Drug Interaction",
  drug_allergy: "Drug Allergy",
  therapeutic_duplication: "Therapeutic Duplication",
  dose_range: "Dose Range",
  age_gender: "Age/Gender",
  refill_too_soon: "Refill Too Soon",
};

export default function DurPage() {
  const [tab, setTab] = useState<Tab>("alerts");
  const [dashboard, setDashboard] = useState<DurDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Override modal state
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideAlertId, setOverrideAlertId] = useState("");
  const [overrideReasonCode, setOverrideReasonCode] = useState("01");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [overrideProcessing, setOverrideProcessing] = useState(false);

  // Run DUR modal state
  const [durModal, setDurModal] = useState(false);
  const [durFillId, setDurFillId] = useState("");
  const [durRunning, setDurRunning] = useState(false);
  const [durResult, setDurResult] = useState<{ totalAlerts: number; hasCritical: boolean } | null>(null);

  // Filter
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDurDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DUR data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── Override handler ──

  const handleOverride = (alertId: string) => {
    setOverrideAlertId(alertId);
    setOverrideReasonCode("01");
    setOverrideNotes("");
    setOverrideModal(true);
  };

  const submitOverride = async () => {
    setOverrideProcessing(true);
    setError("");
    try {
      const result = await overrideAlert(overrideAlertId, overrideReasonCode, overrideNotes || undefined);
      if (result.success) {
        setSuccess("DUR alert overridden successfully");
        setOverrideModal(false);
        loadDashboard();
      } else {
        setError(result.error || "Override failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Override failed");
    } finally {
      setOverrideProcessing(false);
    }
  };

  // ── Run DUR handler ──

  const handleRunDur = async () => {
    if (!durFillId.trim()) return;
    setDurRunning(true);
    setDurResult(null);
    setError("");
    try {
      const result = await runDurCheck(durFillId.trim());
      setDurResult({
        totalAlerts: result.totalAlerts,
        hasCritical: result.hasCritical,
      });
      setSuccess(
        result.totalAlerts === 0
          ? "DUR check complete: no alerts"
          : `DUR check complete: ${result.totalAlerts} alert(s) found`
      );
      loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "DUR check failed");
    } finally {
      setDurRunning(false);
    }
  };

  // ── Filtered alerts ──

  const filteredAlerts = (dashboard?.alerts || []).filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (typeFilter !== "all" && a.alertType !== typeFilter) return false;
    return true;
  });

  // ── Render ──

  if (loading && !dashboard) {
    return <div className="text-center py-12 text-gray-500">Loading DUR data...</div>;
  }

  const stats = dashboard?.stats;
  const overrides = dashboard?.overrides || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drug Utilization Review</h1>
          <p className="text-sm text-gray-500 mt-1">
            Clinical decision support — interactions, allergies, dose checks, and more
          </p>
        </div>
        <button
          onClick={() => { setDurModal(true); setDurFillId(""); setDurResult(null); }}
          className="px-4 py-2 bg-[#40721D] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5114]"
        >
          Run DUR Check
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-500 hover:text-red-700 font-bold">x</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
          <button onClick={() => setSuccess("")} className="ml-2 text-green-500 hover:text-green-700 font-bold">x</button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Active Alerts</p>
            <p className={`text-2xl font-bold mt-1 ${stats.activeAlerts > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {stats.activeAlerts}
            </p>
          </div>
          <div className={`border rounded-lg p-4 ${stats.criticalAlerts > 0 ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase">Critical Alerts</p>
            <p className={`text-2xl font-bold mt-1 ${stats.criticalAlerts > 0 ? "text-red-600" : "text-gray-300"}`}>
              {stats.criticalAlerts}
            </p>
          </div>
          <div className={`border rounded-lg p-4 ${stats.majorAlerts > 0 ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase">Major Alerts</p>
            <p className={`text-2xl font-bold mt-1 ${stats.majorAlerts > 0 ? "text-amber-600" : "text-gray-300"}`}>
              {stats.majorAlerts}
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Overrides Today</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.overridesToday}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab("alerts")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === "alerts"
              ? "border-[#40721D] text-[#40721D]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Active Alerts ({filteredAlerts.length})
        </button>
        <button
          onClick={() => setTab("overrides")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === "overrides"
              ? "border-[#40721D] text-[#40721D]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Override History ({overrides.length})
        </button>
      </div>

      {/* Active Alerts Tab */}
      {tab === "alerts" && (
        <>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="moderate">Moderate</option>
                <option value="minor">Minor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Alert Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
              >
                <option value="all">All Types</option>
                <option value="drug_interaction">Drug Interaction</option>
                <option value="drug_allergy">Drug Allergy</option>
                <option value="therapeutic_duplication">Therapeutic Duplication</option>
                <option value="dose_range">Dose Range</option>
                <option value="age_gender">Age/Gender</option>
              </select>
            </div>
          </div>

          {/* Alert Cards */}
          {filteredAlerts.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <p className="text-sm font-semibold text-green-700">No active DUR alerts</p>
              <p className="text-xs text-green-500 mt-1">
                All alerts have been reviewed or no checks have been run yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.minor;
                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border ${style.border} ${style.bg} p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${style.badge}`}>
                            {alert.severity}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full font-semibold">
                            {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-gray-900 mt-2">
                          {alert.description}
                        </h4>

                        <div className="mt-1 text-xs text-gray-500">
                          <span className="font-semibold">{alert.drugA}</span>
                          {alert.drugB && (
                            <>
                              {" + "}
                              <span className="font-semibold">{alert.drugB}</span>
                            </>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Clinical Effect</p>
                            <p className="text-xs text-gray-700">{alert.clinicalEffect}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Recommendation</p>
                            <p className="text-xs text-gray-700">{alert.recommendation}</p>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex-shrink-0">
                        <button
                          onClick={() => handleOverride(alert.id)}
                          className="px-3 py-1.5 border border-gray-300 bg-white text-xs font-semibold rounded-lg hover:bg-gray-50 text-gray-700"
                        >
                          Override
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Override History Tab */}
      {tab === "overrides" && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Pharmacist</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Drug</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Alert Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Severity</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Reason Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Notes</th>
                </tr>
              </thead>
              <tbody>
                {overrides.length > 0 ? (
                  overrides.map((o, i) => {
                    const style = SEVERITY_STYLES[o.severity] || SEVERITY_STYLES.minor;
                    return (
                      <tr key={`${o.alertId}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 text-xs">
                          {new Date(o.overriddenAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-medium text-xs">{o.pharmacistName}</td>
                        <td className="px-4 py-3 text-gray-700">{o.drug}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-semibold">
                            {ALERT_TYPE_LABELS[o.alertType] || o.alertType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${style.badge}`}>
                            {o.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-xs">
                          {o.reasonCode}: {o.reasonLabel}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                          {o.notes || "-"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No overrides recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg w-full max-w-md mx-4 shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Override DUR Alert</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason Code <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={overrideReasonCode}
                    onChange={(e) => setOverrideReasonCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                  >
                    {DUR_OVERRIDE_REASON_CODES.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} - {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                    rows={3}
                    placeholder="Additional details about the override decision..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                  />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <p className="font-semibold mb-1">Pharmacist responsibility:</p>
                  <p>
                    By overriding this alert, you are certifying that you have reviewed the
                    clinical concern and determined that the benefit outweighs the risk for
                    this patient. This override will be recorded in the audit trail.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setOverrideModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitOverride}
                  disabled={overrideProcessing}
                  className="px-4 py-2 bg-[#40721D] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5114] disabled:opacity-50"
                >
                  {overrideProcessing ? "Processing..." : "Confirm Override"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Run DUR Modal */}
      {durModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg w-full max-w-md mx-4 shadow-xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Run DUR Check</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fill ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={durFillId}
                    onChange={(e) => setDurFillId(e.target.value)}
                    placeholder="Enter fill ID..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                  />
                </div>

                {durResult && (
                  <div
                    className={`p-3 rounded-lg border text-sm ${
                      durResult.hasCritical
                        ? "bg-red-50 border-red-200 text-red-700"
                        : durResult.totalAlerts > 0
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}
                  >
                    {durResult.totalAlerts === 0
                      ? "No DUR alerts found"
                      : `${durResult.totalAlerts} alert(s) found${durResult.hasCritical ? " — includes CRITICAL" : ""}`}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setDurModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleRunDur}
                  disabled={durRunning || !durFillId.trim()}
                  className="px-4 py-2 bg-[#40721D] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5114] disabled:opacity-50"
                >
                  {durRunning ? "Running..." : "Run DUR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-[10px] text-gray-400 leading-relaxed">
          <span className="font-bold">Disclaimer:</span> This DUR engine uses a built-in
          reference database for common drug interactions, allergy cross-reactivity, therapeutic
          duplications, and dose ranges. It does not replace comprehensive clinical references
          (Lexicomp, Clinical Pharmacology, Micromedex). Pharmacists should always apply clinical
          judgment and consult authoritative sources when making dispensing decisions.
        </p>
      </div>
    </div>
  );
}
