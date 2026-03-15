"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  getIntakeItem,
  processIntakeItem,
  assignIntakeItem,
  updateIntakeStatus,
  rejectIntakeItem,
} from "../actions";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: "bg-yellow-50 text-yellow-700" },
  matched: { label: "Matched", color: "bg-blue-50 text-blue-700" },
  processing: { label: "Processing", color: "bg-purple-50 text-purple-700" },
  complete: { label: "Complete", color: "bg-green-50 text-green-700" },
  error: { label: "Error / Rejected", color: "bg-red-50 text-red-700" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  stat: { label: "STAT", color: "bg-red-100 text-red-800" },
  urgent: { label: "Urgent", color: "bg-orange-50 text-orange-700" },
  normal: { label: "Normal", color: "bg-gray-100 text-gray-700" },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: string }> = {
  ncpdp: { label: "NCPDP SCRIPT", icon: "📱" },
  epcs: { label: "EPCS", icon: "🔐" },
  fax: { label: "Fax", icon: "📠" },
  manual: { label: "Manual Entry", icon: "✋" },
  fhir: { label: "FHIR", icon: "🔗" },
};

// Types for the parsed data structure stored in rawData
interface ParsedPatient {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: { line1?: string; city?: string; state?: string; zip?: string };
}

interface ParsedPrescriber {
  firstName?: string;
  lastName?: string;
  suffix?: string;
  npi?: string;
  deaNumber?: string;
  phone?: string;
  address?: { line1?: string; city?: string; state?: string; zip?: string };
}

interface ParsedMedication {
  drugName?: string;
  ndc?: string;
  strength?: string;
  dosageForm?: string;
  quantity?: number;
  daysSupply?: number;
  directions?: string;
  refillsAuthorized?: number;
  dawCode?: string;
  isCompound?: boolean;
  deaSchedule?: string;
}

interface MatchCandidate {
  id: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  dateOfBirth?: string;
  npi?: string;
  name?: string;
  ndc?: string;
  type?: string;
  score: number;
}

interface MatchSection {
  patientId?: string | null;
  prescriberId?: string | null;
  itemId?: string | null;
  formulaId?: string | null;
  confidence: string;
  candidates: MatchCandidate[];
}

export default function IntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [item, setItem] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);
  const [selectedMatches, setSelectedMatches] = useState({
    patientId: "",
    prescriberId: "",
    itemId: "",
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    async function fetchItem() {
      try {
        const data = await getIntakeItem(id);
        setItem(data);

        // Pre-populate selections from match results
        const rawData = (data.rawData || {}) as Record<string, unknown>;
        const matchResult = rawData._matchResult as Record<string, MatchSection> | undefined;
        if (matchResult) {
          setSelectedMatches({
            patientId: (matchResult.patient?.patientId as string) || matchResult.patient?.candidates?.[0]?.id || "",
            prescriberId: (matchResult.prescriber?.prescriberId as string) || matchResult.prescriber?.candidates?.[0]?.id || "",
            itemId: (matchResult.drug?.itemId as string) || matchResult.drug?.candidates?.[0]?.id || "",
          });
        }
      } catch {
        setError("Failed to load intake item");
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [id]);

  const handleProcess = async () => {
    if (!selectedMatches.patientId || !selectedMatches.prescriberId) {
      alert("Please select at least a patient and prescriber match before processing.");
      return;
    }

    setActionLoading(true);
    try {
      const prescriptionId = await processIntakeItem(id, {
        patientId: selectedMatches.patientId,
        prescriberId: selectedMatches.prescriberId,
        itemId: selectedMatches.itemId || undefined,
      });
      router.push(`/prescriptions/${prescriptionId}`);
    } catch {
      alert("Failed to process intake item. Check that all required fields are matched.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignToMe = async () => {
    setActionLoading(true);
    try {
      await assignIntakeItem(id, "self");
      const updated = await getIntakeItem(id);
      setItem(updated);
    } catch {
      alert("Failed to assign intake item");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    setActionLoading(true);
    try {
      await rejectIntakeItem(id, rejectReason);
      router.push("/intake");
    } catch {
      alert("Failed to reject intake item");
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
    }
  };

  const handleHold = async () => {
    setActionLoading(true);
    try {
      await updateIntakeStatus(id, "processing", "Placed on hold for manual review");
      const updated = await getIntakeItem(id);
      setItem(updated);
    } catch {
      alert("Failed to update intake item status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400 text-sm">Loading intake item...</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-800">{error || "Item not found"}</p>
          <Link href="/intake" className="text-sm text-[#40721D] hover:underline mt-2 inline-block">
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  // Extract typed data from rawData JSON
  const rawData = (item.rawData || {}) as Record<string, unknown>;
  const parsed = rawData._parsed as Record<string, unknown> | undefined;
  const patient = (parsed?.patient || {}) as ParsedPatient;
  const prescriber = (parsed?.prescriber || {}) as ParsedPrescriber;
  const medication = (parsed?.medication || {}) as ParsedMedication;
  const matchResult = rawData._matchResult as Record<string, MatchSection> | undefined;

  const patientCandidates = matchResult?.patient?.candidates || [];
  const prescriberCandidates = matchResult?.prescriber?.candidates || [];
  const drugCandidates = matchResult?.drug?.candidates || [];

  const statusConfig = STATUS_CONFIG[item.status] || { label: item.status, color: "bg-gray-100 text-gray-700" };
  const priorityConfig = PRIORITY_CONFIG[item.priority || "normal"] || PRIORITY_CONFIG.normal;
  const sourceConfig = SOURCE_CONFIG[item.source] || { label: item.source, icon: "📋" };
  const canProcess = item.status === "pending" || item.status === "matched";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-6 py-2.5 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
        <a href="/dashboard" className="text-[var(--green-700)] no-underline font-medium hover:underline">Home</a>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <Link href="/intake" className="text-[var(--green-700)] no-underline font-medium hover:underline">eRx Intake</Link>
        <span className="text-[#c5d5c9]">&rsaquo;</span>
        <span className="text-[var(--text-secondary)] font-semibold">Review</span>
      </div>

      <div className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">Intake Review</h1>
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full ${priorityConfig.color}`}>
                {priorityConfig.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {sourceConfig.icon} {sourceConfig.label} — Received {formatDate(item.receivedAt)}
            </p>
          </div>
          <Link href="/intake" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg transition-colors">
            Back to Queue
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Patient Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h2>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Name</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {patient.firstName || "—"} {patient.middleName || ""} {patient.lastName || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Date of Birth</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{patient.dateOfBirth || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Gender</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{patient.gender || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Phone</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{patient.phone || "—"}</dd>
                </div>
                {patient.address && (
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-500 uppercase tracking-wider">Address</dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">
                      {patient.address.line1}, {patient.address.city}, {patient.address.state} {patient.address.zip}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Prescriber Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Prescriber Information</h2>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Name</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {prescriber.firstName || "—"} {prescriber.lastName || "—"}{prescriber.suffix ? `, ${prescriber.suffix}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">NPI</dt>
                  <dd className="text-sm font-mono font-medium text-gray-900 mt-1">{prescriber.npi || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">DEA#</dt>
                  <dd className="text-sm font-mono font-medium text-gray-900 mt-1">{prescriber.deaNumber || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Phone</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{prescriber.phone || "—"}</dd>
                </div>
              </dl>
            </div>

            {/* Medication Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Medication Prescribed</h2>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Drug Name</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{medication.drugName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">NDC</dt>
                  <dd className="text-sm font-mono font-medium text-gray-900 mt-1">{medication.ndc || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Strength</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{medication.strength || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Dosage Form</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{medication.dosageForm || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Quantity</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{medication.quantity ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Days Supply</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{medication.daysSupply ?? "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">SIG (Directions)</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1 bg-gray-50 rounded-lg px-3 py-2">
                    {medication.directions || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">Refills Authorized</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{medication.refillsAuthorized ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wider">DAW Code</dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">{medication.dawCode || "—"}</dd>
                </div>
                {medication.deaSchedule && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wider">DEA Schedule</dt>
                    <dd className="text-sm font-bold text-red-600 mt-1">Schedule {medication.deaSchedule}</dd>
                  </div>
                )}
                {medication.isCompound && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wider">Compound</dt>
                    <dd className="text-sm font-medium text-purple-700 mt-1">Yes — Compound Rx</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Matching Results */}
            {matchResult && (
              <div className="space-y-6">
                {/* Patient Match */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Patient Match</h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      matchResult.patient?.confidence === "exact" ? "bg-green-50 text-green-700" :
                      matchResult.patient?.confidence === "probable" ? "bg-blue-50 text-blue-700" :
                      matchResult.patient?.confidence === "possible" ? "bg-yellow-50 text-yellow-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {matchResult.patient?.confidence || "none"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {patientCandidates.length > 0 ? (
                      patientCandidates.map((c: MatchCandidate) => (
                        <label key={c.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedMatches.patientId === c.id ? "border-[#40721D] bg-green-50" : "border-gray-200 hover:bg-gray-50"
                        }`}>
                          <input type="radio" name="patient" value={c.id} checked={selectedMatches.patientId === c.id}
                            onChange={(e) => setSelectedMatches((prev) => ({ ...prev, patientId: e.target.value }))}
                            className="mt-0.5 accent-[#40721D]" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-gray-500">MRN: {c.mrn || "—"} | DOB: {c.dateOfBirth || "—"} | Score: {Math.round(c.score * 100)}%</p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No patient matches found. A new patient record will need to be created.</p>
                    )}
                  </div>
                </div>

                {/* Prescriber Match */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Prescriber Match</h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      matchResult.prescriber?.confidence === "exact" ? "bg-green-50 text-green-700" :
                      matchResult.prescriber?.confidence === "probable" ? "bg-blue-50 text-blue-700" :
                      matchResult.prescriber?.confidence === "possible" ? "bg-yellow-50 text-yellow-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {matchResult.prescriber?.confidence || "none"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {prescriberCandidates.length > 0 ? (
                      prescriberCandidates.map((c: MatchCandidate) => (
                        <label key={c.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedMatches.prescriberId === c.id ? "border-[#40721D] bg-green-50" : "border-gray-200 hover:bg-gray-50"
                        }`}>
                          <input type="radio" name="prescriber" value={c.id} checked={selectedMatches.prescriberId === c.id}
                            onChange={(e) => setSelectedMatches((prev) => ({ ...prev, prescriberId: e.target.value }))}
                            className="mt-0.5 accent-[#40721D]" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Dr. {c.firstName} {c.lastName}</p>
                            <p className="text-xs text-gray-500">NPI: {c.npi || "—"} | Score: {Math.round(c.score * 100)}%</p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No prescriber matches found. A new prescriber record may need to be created.</p>
                    )}
                  </div>
                </div>

                {/* Drug/Medication Match */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Medication Match</h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      matchResult.drug?.confidence === "exact" ? "bg-green-50 text-green-700" :
                      matchResult.drug?.confidence === "probable" ? "bg-blue-50 text-blue-700" :
                      matchResult.drug?.confidence === "possible" ? "bg-yellow-50 text-yellow-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {matchResult.drug?.confidence || "none"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {drugCandidates.length > 0 ? (
                      drugCandidates.map((c: MatchCandidate) => (
                        <label key={c.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedMatches.itemId === c.id ? "border-[#40721D] bg-green-50" : "border-gray-200 hover:bg-gray-50"
                        }`}>
                          <input type="radio" name="drug" value={c.id} checked={selectedMatches.itemId === c.id}
                            onChange={(e) => setSelectedMatches((prev) => ({ ...prev, itemId: e.target.value }))}
                            className="mt-0.5 accent-[#40721D]" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-500">
                              {c.type === "formula" ? "Formula" : "Item"} | NDC: {c.ndc || "—"} | Score: {Math.round(c.score * 100)}%
                            </p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No medication matches found. The item/formula may need to be added to inventory first.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Raw eRx Data (collapsible) */}
            <div className="bg-white rounded-xl border border-gray-200">
              <button
                onClick={() => setRawExpanded(!rawExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Raw eRx Payload</h2>
                <span className="text-gray-400 text-lg">{rawExpanded ? "−" : "+"}</span>
              </button>
              {rawExpanded && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600 overflow-auto max-h-96 font-mono">
                    {JSON.stringify(rawData._original || rawData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Summary</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500">Patient</dt>
                  <dd className="text-sm font-medium text-gray-900">{item.patientName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Prescriber</dt>
                  <dd className="text-sm font-medium text-gray-900">{item.prescriberName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Medication</dt>
                  <dd className="text-sm font-medium text-gray-900">{item.drugName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Message ID</dt>
                  <dd className="text-xs font-mono text-gray-600 break-all">{item.messageId || "—"}</dd>
                </div>
              </dl>
            </div>

            {/* Assignment */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Assigned To</h3>
              {item.assignee ? (
                <p className="text-sm font-medium text-gray-900">
                  {item.assignee.firstName} {item.assignee.lastName}
                </p>
              ) : (
                <p className="text-sm text-gray-400">Unassigned</p>
              )}
            </div>

            {/* Notes */}
            {item.notes && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notes</h3>
                <p className="text-sm text-gray-700">{item.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Actions</h3>
              <div className="space-y-2">
                {canProcess && (
                  <button
                    onClick={handleProcess}
                    disabled={actionLoading || !selectedMatches.patientId || !selectedMatches.prescriberId}
                    className="w-full px-4 py-2.5 bg-[#40721D] text-white text-sm font-medium rounded-lg hover:bg-[#2D5114] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading ? "Processing..." : "Process → Create Rx"}
                  </button>
                )}
                <button
                  onClick={handleAssignToMe}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Assign to Me
                </button>
                {canProcess && (
                  <button
                    onClick={handleHold}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Put on Hold
                  </button>
                )}
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reject Intake Item</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#40721D]"
                rows={4}
                placeholder="Explain why this intake item is being rejected..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
