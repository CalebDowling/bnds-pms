"use client";

/**
 * Compliance Packaging — Sync List Dashboard
 *
 * Shows enrolled patients, pack due dates, stats, and allows enrollment.
 */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  getSyncListDashboard,
  enrollPatientAction,
  type SyncListDashboard,
} from "./actions";
import type { PackDueItem } from "@/lib/compliance-packaging/sync-list";

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------
type Filter = "all" | "due-today" | "overdue" | "changes";

// ---------------------------------------------------------------------------
// Demo seed patients (for enroll dialog)
// ---------------------------------------------------------------------------
const DEMO_PATIENTS = [
  { id: "pt-1001", name: "Martha Johnson", mrn: "MRN-2001" },
  { id: "pt-1002", name: "Robert Williams", mrn: "MRN-2002" },
  { id: "pt-1003", name: "Dorothy Davis", mrn: "MRN-2003" },
  { id: "pt-1004", name: "James Wilson", mrn: "MRN-2004" },
  { id: "pt-1005", name: "Helen Thompson", mrn: "MRN-2005" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CompliancePackagingPage() {
  const [dashboard, setDashboard] = useState<SyncListDashboard | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [showEnroll, setShowEnroll] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Enrollment form state
  const [enrollForm, setEnrollForm] = useState({
    patientId: "",
    patientName: "",
    mrn: "",
    syncDate: 1,
    daysSupply: 28,
    notes: "",
  });
  const [enrollError, setEnrollError] = useState("");

  // Load dashboard
  const loadDashboard = () => {
    startTransition(async () => {
      const data = await getSyncListDashboard();
      setDashboard(data);
    });
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Filter patients
  const filtered = (dashboard?.patients ?? []).filter((p) => {
    if (filter === "all") return true;
    if (filter === "due-today") return p.status === "due-today";
    if (filter === "overdue") return p.status === "overdue";
    if (filter === "changes") return p.hasChanges;
    return true;
  });

  // Handle enrollment
  const handleEnroll = async () => {
    setEnrollError("");
    if (!enrollForm.patientId) {
      setEnrollError("Select a patient");
      return;
    }
    const result = await enrollPatientAction(enrollForm);
    if (result.success) {
      setShowEnroll(false);
      setEnrollForm({ patientId: "", patientName: "", mrn: "", syncDate: 1, daysSupply: 28, notes: "" });
      loadDashboard();
    } else {
      setEnrollError(result.error ?? "Failed to enroll");
    }
  };

  // Status color helpers
  const statusColor = (status: PackDueItem["status"]): string => {
    switch (status) {
      case "overdue":       return "bg-red-900/30 border-l-4 border-l-red-500";
      case "due-today":     return "bg-yellow-900/20 border-l-4 border-l-yellow-500";
      case "due-this-week": return "bg-green-900/20 border-l-4 border-l-green-500";
      case "review-needed": return "bg-blue-900/20 border-l-4 border-l-blue-500";
      case "completed":     return "bg-slate-800/50 border-l-4 border-l-slate-500";
      default:              return "bg-slate-800/30 border-l-4 border-l-slate-600";
    }
  };

  const statusBadge = (status: PackDueItem["status"]): string => {
    switch (status) {
      case "overdue":       return "bg-red-600 text-white";
      case "due-today":     return "bg-yellow-600 text-white";
      case "due-this-week": return "bg-green-600 text-white";
      case "review-needed": return "bg-blue-600 text-white";
      case "completed":     return "bg-slate-600 text-white";
      default:              return "bg-slate-700 text-slate-300";
    }
  };

  const statusLabel = (status: PackDueItem["status"]): string => {
    switch (status) {
      case "overdue":       return "Overdue";
      case "due-today":     return "Due Today";
      case "due-this-week": return "Due This Week";
      case "review-needed": return "Review Needed";
      case "completed":     return "Completed";
      default:              return "Upcoming";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Packaging</h1>
          <p className="text-sm text-slate-400 mt-1">
            Blister pack sync list &mdash; manage enrolled patients and pack schedules
          </p>
        </div>
        <button
          onClick={() => setShowEnroll(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Enroll Patient
        </button>
      </div>

      {/* ---- Stats Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Enrolled Patients"
          value={dashboard?.enrolledCount ?? 0}
          icon="👥"
          accent="border-blue-500"
        />
        <StatCard
          label="Packs Due This Week"
          value={dashboard?.dueThisWeek ?? 0}
          icon="📦"
          accent="border-yellow-500"
        />
        <StatCard
          label="Completed Today"
          value={dashboard?.completedToday ?? 0}
          icon="✅"
          accent="border-green-500"
        />
        <StatCard
          label="Changes Pending Review"
          value={dashboard?.changesPending ?? 0}
          icon="⚠️"
          accent="border-red-500"
        />
      </div>

      {/* ---- Filters ---- */}
      <div className="flex items-center gap-2">
        {(["all", "due-today", "overdue", "changes"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {f === "all" ? "All" : f === "due-today" ? "Due Today" : f === "overdue" ? "Overdue" : "Changes Needed"}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">
          Showing {filtered.length} of {dashboard?.patients.length ?? 0} patients
        </span>
      </div>

      {/* ---- Sync List Table ---- */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        {isPending && !dashboard ? (
          <div className="p-12 text-center text-slate-400">Loading sync list...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {dashboard?.patients.length === 0
              ? "No patients enrolled. Click \"Enroll Patient\" to get started."
              : "No patients match the selected filter."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">Patient</th>
                <th className="text-left py-3 px-4">Sync Date</th>
                <th className="text-left py-3 px-4">Next Pack Due</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Meds</th>
                <th className="text-left py-3 px-4">Last Packed</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((pt) => (
                <tr key={pt.patientId} className={`${statusColor(pt.status)} hover:bg-slate-800/50 transition-colors`}>
                  <td className="py-3 px-4">
                    <Link href={`/compliance-packaging/${pt.patientId}`} className="hover:underline">
                      <div className="font-medium text-white">{pt.patientName}</div>
                      <div className="text-xs text-slate-500">{pt.mrn}</div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {ordinal(pt.syncDate)} of month
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {pt.nextPackDue}
                    {pt.daysTilDue < 0 && (
                      <span className="ml-2 text-xs text-red-400">({Math.abs(pt.daysTilDue)}d overdue)</span>
                    )}
                    {pt.daysTilDue === 0 && (
                      <span className="ml-2 text-xs text-yellow-400">(today)</span>
                    )}
                    {pt.daysTilDue > 0 && pt.daysTilDue <= 7 && (
                      <span className="ml-2 text-xs text-green-400">(in {pt.daysTilDue}d)</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(pt.status)}`}>
                      {statusLabel(pt.status)}
                    </span>
                    {pt.hasChanges && pt.status !== "review-needed" && (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-700 text-white">
                        {pt.changeCount} change{pt.changeCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-300 font-mono">
                    {pt.medicationCount}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {pt.lastPackedDate ?? "Never"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/compliance-packaging/${pt.patientId}`}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Enroll Modal ---- */}
      {showEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Enroll Patient</h2>
              <button onClick={() => setShowEnroll(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>

            {enrollError && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-3 py-2">
                {enrollError}
              </div>
            )}

            {/* Patient Select */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Patient</label>
              <select
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                value={enrollForm.patientId}
                onChange={(e) => {
                  const pt = DEMO_PATIENTS.find((p) => p.id === e.target.value);
                  setEnrollForm({
                    ...enrollForm,
                    patientId: e.target.value,
                    patientName: pt?.name ?? "",
                    mrn: pt?.mrn ?? "",
                  });
                }}
              >
                <option value="">Select patient...</option>
                {DEMO_PATIENTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>
                ))}
              </select>
            </div>

            {/* Sync Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Sync Date (day of month)</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  value={enrollForm.syncDate}
                  onChange={(e) => setEnrollForm({ ...enrollForm, syncDate: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Days Supply</label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  value={enrollForm.daysSupply}
                  onChange={(e) => setEnrollForm({ ...enrollForm, daysSupply: parseInt(e.target.value) })}
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={28}>28 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <textarea
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                placeholder="Special instructions, delivery preferences..."
                value={enrollForm.notes}
                onChange={(e) => setEnrollForm({ ...enrollForm, notes: e.target.value })}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEnroll(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEnroll}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Enroll Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: string;
  accent: string;
}) {
  return (
    <div className={`bg-slate-900 border border-slate-700 ${accent} border-l-4 rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
