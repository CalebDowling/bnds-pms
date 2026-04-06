"use client";

/**
 * Compliance Packaging — Patient Pack Detail
 *
 * Shows a single enrolled patient's medications, changes since last pack,
 * pack history, and actions to generate / complete packs.
 */

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPatientPackDetail,
  generatePackAction,
  completePackAction,
  type PatientPackDetail,
} from "../actions";
import type { PackManifest, PackRecord } from "@/lib/compliance-packaging/sync-list";

export default function PatientPackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;

  const [detail, setDetail] = useState<PatientPackDetail | null>(null);
  const [manifest, setManifest] = useState<PackManifest | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showComplete, setShowComplete] = useState(false);

  // Complete form state
  const [completeForm, setCompleteForm] = useState({
    packedBy: "",
    verifiedBy: "",
    notes: "",
  });
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load detail
  const loadDetail = () => {
    startTransition(async () => {
      const data = await getPatientPackDetail(patientId);
      setDetail(data);
      setManifest(data.latestManifest);
    });
  };

  useEffect(() => {
    loadDetail();
  }, [patientId]);

  // Generate pack
  const handleGenerate = async () => {
    setActionMsg(null);
    const result = await generatePackAction(patientId);
    if (result.success && result.manifest) {
      setManifest(result.manifest);
      setActionMsg({ type: "success", text: "Pack manifest generated successfully." });
      loadDetail();
    } else {
      setActionMsg({ type: "error", text: result.error ?? "Failed to generate pack." });
    }
  };

  // Complete pack
  const handleComplete = async () => {
    if (!manifest) return;
    if (!completeForm.packedBy || !completeForm.verifiedBy) {
      setActionMsg({ type: "error", text: "Packed By and Verified By are required." });
      return;
    }
    const result = await completePackAction({
      patientId,
      manifestId: manifest.id,
      packedBy: completeForm.packedBy,
      verifiedBy: completeForm.verifiedBy,
      notes: completeForm.notes,
    });
    if (result.success) {
      setShowComplete(false);
      setCompleteForm({ packedBy: "", verifiedBy: "", notes: "" });
      setActionMsg({ type: "success", text: "Pack marked as completed." });
      loadDetail();
    } else {
      setActionMsg({ type: "error", text: result.error ?? "Failed to complete pack." });
    }
  };

  // Change highlight color
  const changeColor = (type: string | null) => {
    switch (type) {
      case "new":              return "bg-green-900/30 border-l-4 border-l-green-500";
      case "dose-change":      return "bg-yellow-900/30 border-l-4 border-l-yellow-500";
      case "direction-change": return "bg-yellow-900/20 border-l-4 border-l-yellow-400";
      case "discontinued":     return "bg-red-900/30 border-l-4 border-l-red-500";
      default:                 return "";
    }
  };

  const changeBadge = (type: string | null) => {
    switch (type) {
      case "new":              return "bg-green-700 text-white";
      case "dose-change":      return "bg-yellow-700 text-white";
      case "direction-change": return "bg-yellow-600 text-white";
      case "discontinued":     return "bg-red-700 text-white";
      default:                 return "";
    }
  };

  const changeBadgeLabel = (type: string | null) => {
    switch (type) {
      case "new":              return "NEW";
      case "dose-change":      return "DOSE CHANGE";
      case "direction-change": return "SIG CHANGE";
      case "discontinued":     return "DISCONTINUED";
      default:                 return "";
    }
  };

  if (!detail && isPending) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center text-slate-400 py-20">Loading patient details...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center text-slate-500 py-20">Patient not found or not enrolled.</div>
      </div>
    );
  }

  const enrollment = detail.enrollment;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* ---- Breadcrumb ---- */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/compliance-packaging" className="hover:text-blue-400 transition-colors">
          Compliance Packaging
        </Link>
        <span>/</span>
        <span className="text-slate-300">{enrollment?.patientName ?? patientId}</span>
      </div>

      {/* ---- Patient Header ---- */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{enrollment?.patientName ?? "Unknown Patient"}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
              <span>MRN: <span className="text-slate-200 font-mono">{enrollment?.mrn ?? "N/A"}</span></span>
              <span className="text-slate-600">|</span>
              <span>Sync Date: <span className="text-slate-200">{enrollment ? ordinal(enrollment.syncDate) : "N/A"} of month</span></span>
              <span className="text-slate-600">|</span>
              <span>Days Supply: <span className="text-slate-200">{enrollment?.daysSupply ?? 28}</span></span>
              <span className="text-slate-600">|</span>
              <span>Next Due: <span className="text-white font-medium">{detail.nextPackDue || "N/A"}</span></span>
            </div>
            {enrollment?.notes && (
              <p className="mt-2 text-xs text-slate-500 italic">Notes: {enrollment.notes}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Generate Pack
            </button>
            <button
              onClick={() => setShowComplete(true)}
              disabled={!manifest}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Mark Complete
            </button>
          </div>
        </div>
      </div>

      {/* ---- Action Messages ---- */}
      {actionMsg && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            actionMsg.type === "success"
              ? "bg-green-900/40 border border-green-700 text-green-300"
              : "bg-red-900/40 border border-red-700 text-red-300"
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {/* ---- Current Medications ---- */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="bg-slate-800/60 px-5 py-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Current Medications ({detail.medications.length})
          </h2>
        </div>

        {detail.medications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No active medications found. Generate a pack to pull current prescriptions.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider bg-slate-800/30">
                <th className="text-left py-2 px-4">Drug Name</th>
                <th className="text-left py-2 px-4">Strength</th>
                <th className="text-left py-2 px-4">Directions</th>
                <th className="text-center py-2 px-4">Qty/Pack</th>
                <th className="text-left py-2 px-4">Prescriber</th>
                <th className="text-left py-2 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {detail.medications.map((med, i) => (
                <tr key={med.rxNumber + i} className={`${changeColor(med.changeType)} hover:bg-slate-800/40 transition-colors`}>
                  <td className="py-3 px-4 text-white font-medium">{med.drugName}</td>
                  <td className="py-3 px-4 text-slate-300">{med.strength || "---"}</td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{med.directions || "---"}</td>
                  <td className="py-3 px-4 text-center text-slate-300 font-mono">{med.quantityPerPack}</td>
                  <td className="py-3 px-4 text-slate-400">{med.prescriber || "---"}</td>
                  <td className="py-3 px-4">
                    {med.changeType ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${changeBadge(med.changeType)}`}>
                        {changeBadgeLabel(med.changeType)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">No change</span>
                    )}
                    {med.changeDetails && med.changeType === "dose-change" && (
                      <span className="ml-2 text-xs text-yellow-400">({med.changeDetails})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Changes Since Last Pack ---- */}
      {detail.changes.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">
            Changes Since Last Pack ({detail.changes.length})
          </h2>
          <ul className="space-y-2">
            {detail.changes.map((ch, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full ${
                  ch.type === "new" ? "bg-green-500" :
                  ch.type === "discontinued" ? "bg-red-500" :
                  "bg-yellow-500"
                }`} />
                <span className="text-slate-300">
                  <span className="font-medium text-white">{ch.drugName}</span>
                  {" "}&mdash;{" "}{ch.details}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Pack History ---- */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="bg-slate-800/60 px-5 py-3 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Pack History
          </h2>
        </div>

        {detail.history.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No packs completed yet for this patient.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider bg-slate-800/30">
                <th className="text-left py-2 px-4">Date Packed</th>
                <th className="text-center py-2 px-4">Medications</th>
                <th className="text-center py-2 px-4">Days Supply</th>
                <th className="text-left py-2 px-4">Packed By</th>
                <th className="text-left py-2 px-4">Verified By</th>
                <th className="text-left py-2 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {detail.history.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-white">
                    {new Date(rec.packedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-300 font-mono">{rec.medicationCount}</td>
                  <td className="py-3 px-4 text-center text-slate-300">{rec.daysSupply}</td>
                  <td className="py-3 px-4 text-slate-300">{rec.packedBy}</td>
                  <td className="py-3 px-4 text-slate-300">{rec.verifiedBy}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      rec.status === "completed" ? "bg-green-700 text-white" : "bg-red-700 text-white"
                    }`}>
                      {rec.status === "completed" ? "Completed" : "Voided"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Complete Pack Modal ---- */}
      {showComplete && manifest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Complete Pack</h2>
              <button onClick={() => setShowComplete(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>

            <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-300 space-y-1">
              <p>Manifest: <span className="font-mono text-xs text-slate-400">{manifest.id}</span></p>
              <p>Medications: <span className="text-white font-medium">{manifest.totalMedications}</span></p>
              <p>Period: {manifest.packStartDate} to {manifest.packEndDate}</p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Packed By (Technician)</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                placeholder="Technician name or initials"
                value={completeForm.packedBy}
                onChange={(e) => setCompleteForm({ ...completeForm, packedBy: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Verified By (Pharmacist)</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                placeholder="RPh name or initials"
                value={completeForm.verifiedBy}
                onChange={(e) => setCompleteForm({ ...completeForm, verifiedBy: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <textarea
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                placeholder="Optional notes..."
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowComplete(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Confirm Complete
              </button>
            </div>
          </div>
        </div>
      )}
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
