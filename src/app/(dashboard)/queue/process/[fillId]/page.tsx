"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Pill,
  Stethoscope,
  Shield,
  ArrowRight,
  Pause,
  XCircle,
  ScanLine,
  Printer,
  FileText,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { getFillDetail, processFill, verifyScan, type FillDetail } from "./actions";
import { FILL_STATUS_META } from "@/lib/workflow/fill-status";

// ─── Status Colors ────────────────────────────────────────────────

function statusColor(status: string): string {
  return FILL_STATUS_META[status]?.color || "#6b7280";
}

function statusLabel(status: string): string {
  return FILL_STATUS_META[status]?.label || status;
}

// ─── Main Page ────────────────────────────────────────────────────

export default function FillProcessPage() {
  const params = useParams();
  const router = useRouter();
  const fillId = params.fillId as string;

  const [fill, setFill] = useState<FillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [actionNotes, setActionNotes] = useState("");

  // Barcode scan state
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<{ match: boolean; message: string } | null>(null);
  const [scanning, setScanning] = useState(false);

  const loadFill = useCallback(async () => {
    try {
      const data = await getFillDetail(fillId);
      setFill(data);
      if (!data) setError("Fill not found");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fill");
    } finally {
      setLoading(false);
    }
  }, [fillId]);

  useEffect(() => { loadFill(); }, [loadFill]);

  const handleAdvance = async (newStatus: string) => {
    if (!fill) return;
    setProcessing(true);
    setError(null);
    try {
      await processFill(fill.id, newStatus, actionNotes || undefined);
      setActionNotes("");
      await loadFill();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleScan = async () => {
    if (!fill || !scanInput.trim()) return;
    setScanning(true);
    try {
      const result = await verifyScan(fill.id, scanInput.trim());
      setScanResult(result);
    } catch {
      setScanResult({ match: false, message: "Scan verification failed" });
    } finally {
      setScanning(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--green-700)" }} />
      </div>
    );
  }

  // ── Not found ──
  if (!fill) {
    return (
      <div className="px-6 py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Fill Not Found</h2>
        <Link href="/queue" className="text-sm no-underline" style={{ color: "var(--green-700)" }}>
          <ChevronLeft className="w-4 h-4 inline" /> Back to Queue
        </Link>
      </div>
    );
  }

  const isControlled = fill.item?.isControlled || (fill.item?.deaSchedule && fill.item.deaSchedule >= 2);
  const happyPath = fill.happyPathNext;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-6 py-2.5 text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard" className="no-underline font-medium hover:underline" style={{ color: "var(--green-700)" }}>Home</Link>
        <span style={{ color: "#c5d5c9" }}>&rsaquo;</span>
        <Link href="/queue" className="no-underline font-medium hover:underline" style={{ color: "var(--green-700)" }}>Queue</Link>
        <span style={{ color: "#c5d5c9" }}>&rsaquo;</span>
        <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Process Fill</span>
      </div>

      <div className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/queue" className="inline-flex items-center gap-1 text-sm no-underline" style={{ color: "var(--green-700)" }}>
              <ChevronLeft className="w-4 h-4" /> Queue
            </Link>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              RX# {fill.prescription.rxNumber} &middot; Fill #{fill.fillNumber}
            </h1>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: statusColor(fill.status) }}
            >
              {statusLabel(fill.status)}
            </span>
            {isControlled && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">
                C-{fill.item?.deaSchedule || "II"} Controlled
              </span>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Main grid: 2-col content + sidebar */}
        <div className="grid grid-cols-3 gap-4" style={{ minHeight: "calc(100vh - 220px)" }}>
          {/* Left 2 columns: processing panels */}
          <div className="col-span-2 space-y-4">

            {/* Patient & Drug Info */}
            <div className="bg-white rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
              <div className="grid grid-cols-2 gap-4">
                {/* Patient */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <User className="w-3.5 h-3.5" /> Patient
                  </h3>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {fill.patient.firstName} {fill.patient.lastName}
                  </p>
                  {fill.patient.dateOfBirth && (
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      DOB: {new Date(fill.patient.dateOfBirth).toLocaleDateString()}
                    </p>
                  )}
                  {fill.patient.phoneNumbers[0] && (
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {fill.patient.phoneNumbers[0].number}
                    </p>
                  )}
                  {fill.patient.insurance.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      <Shield className="w-3 h-3 inline mr-1" />
                      {fill.patient.insurance[0].planName || "Insurance on file"}
                      {fill.patient.insurance[0].memberId && ` — ${fill.patient.insurance[0].memberId}`}
                    </p>
                  )}
                </div>

                {/* Drug */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <Pill className="w-3.5 h-3.5" /> Drug
                  </h3>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {fill.item?.name || "Unknown"}
                  </p>
                  {fill.item?.strength && (
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {fill.item.strength} {fill.item.dosageForm || ""}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    NDC: {fill.ndc || fill.item?.ndc || "—"} &middot; Qty: {fill.quantity} &middot; Days: {fill.daysSupply || "—"}
                  </p>
                  {fill.prescription.sig && (
                    <p className="text-xs mt-1 italic" style={{ color: "var(--text-secondary)" }}>
                      SIG: {fill.prescription.sig}
                    </p>
                  )}
                </div>
              </div>

              {/* Allergies Warning */}
              {fill.patient.allergies.length > 0 && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded px-3 py-2">
                  <span className="text-xs font-semibold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> ALLERGIES
                  </span>
                  <p className="text-xs text-red-600 mt-0.5">
                    {fill.patient.allergies.map((a) => `${a.allergen}${a.severity ? ` (${a.severity})` : ""}`).join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Status-Specific Processing Panel */}
            {fill.status === "scan" && (
              <div className="bg-white rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <ScanLine className="w-3.5 h-3.5" /> Barcode Scan Verification
                </h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Scan or enter NDC barcode..."
                    value={scanInput}
                    onChange={(e) => { setScanInput(e.target.value); setScanResult(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleScan(); }}
                    className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--border)" }}
                    autoFocus
                  />
                  <button
                    onClick={handleScan}
                    disabled={scanning || !scanInput.trim()}
                    className="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50"
                    style={{ backgroundColor: "var(--green-700)" }}
                  >
                    {scanning ? "Verifying..." : "Verify NDC"}
                  </button>
                </div>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                  Expected NDC: <span className="font-mono font-bold">{fill.ndc || fill.item?.ndc || "—"}</span>
                </p>
                {scanResult && (
                  <div className={`rounded px-3 py-2 flex items-center gap-2 ${scanResult.match ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    {scanResult.match
                      ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    }
                    <span className={`text-sm font-medium ${scanResult.match ? "text-green-700" : "text-red-700"}`}>
                      {scanResult.message}
                    </span>
                  </div>
                )}
              </div>
            )}

            {fill.status === "verify" && (
              <div className="bg-white rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <Shield className="w-3.5 h-3.5" /> Pharmacist Verification
                </h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <div>
                      <span className="font-semibold block" style={{ color: "var(--text-muted)" }}>Prescriber</span>
                      {fill.prescriber ? `${fill.prescriber.firstName} ${fill.prescriber.lastName}` : "—"}
                      {fill.prescriber?.npi && ` (NPI: ${fill.prescriber.npi})`}
                    </div>
                    <div>
                      <span className="font-semibold block" style={{ color: "var(--text-muted)" }}>Refills Remaining</span>
                      {fill.prescription.refillsRemaining}
                    </div>
                    <div>
                      <span className="font-semibold block" style={{ color: "var(--text-muted)" }}>Date Written</span>
                      {fill.prescription.dateWritten ? new Date(fill.prescription.dateWritten).toLocaleDateString() : "—"}
                    </div>
                    <div>
                      <span className="font-semibold block" style={{ color: "var(--text-muted)" }}>Expiration</span>
                      {fill.prescription.expirationDate ? new Date(fill.prescription.expirationDate).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mt-2">
                    <span className="text-xs font-semibold text-blue-700">Pharmacist Review Checklist:</span>
                    <ul className="text-xs text-blue-600 mt-1 space-y-0.5 list-disc list-inside">
                      <li>Drug, strength, and dosage form correct</li>
                      <li>Quantity and days supply appropriate</li>
                      <li>SIG directions match prescription</li>
                      <li>No drug interactions or allergy conflicts</li>
                      <li>NDC / lot verified during scan step</li>
                      {isControlled && <li className="font-bold">CONTROLLED SUBSTANCE — verify PDMP check</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {fill.status === "print" && (
              <div className="bg-white rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <Printer className="w-3.5 h-3.5" /> Print Label
                </h3>
                <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                  Print the prescription label, then advance to the Scan queue for barcode verification.
                </p>
                <a
                  href={`/api/labels/print/${fill.id}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-md no-underline"
                  style={{ backgroundColor: "var(--green-700)" }}
                >
                  <FileText className="w-4 h-4" /> Open Label PDF
                </a>
              </div>
            )}

            {/* Action Panel — advance or hold */}
            <div className="bg-white rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <ArrowRight className="w-3.5 h-3.5" /> Actions
              </h3>
              <div className="flex flex-col gap-3">
                {/* Notes */}
                <input
                  type="text"
                  placeholder="Optional notes for this action..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "var(--border)" }}
                />

                {/* Happy path button */}
                {happyPath && (
                  <button
                    onClick={() => handleAdvance(happyPath)}
                    disabled={processing || (fill.status === "scan" && !scanResult?.match)}
                    className="w-full px-4 py-3 text-sm font-bold text-white rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    style={{ backgroundColor: statusColor(happyPath) }}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Advance to {statusLabel(happyPath)}
                  </button>
                )}

                {/* Other transitions */}
                <div className="flex flex-wrap gap-2">
                  {fill.nextStatuses
                    .filter((s) => s !== happyPath)
                    .map((s) => (
                      <button
                        key={s}
                        onClick={() => handleAdvance(s)}
                        disabled={processing}
                        className="px-3 py-1.5 text-xs font-medium border rounded-md disabled:opacity-50 transition-colors"
                        style={{
                          borderColor: statusColor(s),
                          color: statusColor(s),
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = statusColor(s);
                          (e.target as HTMLElement).style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = "";
                          (e.target as HTMLElement).style.color = statusColor(s);
                        }}
                      >
                        {s === "hold" && <Pause className="w-3 h-3 inline mr-1" />}
                        {s === "cancelled" && <XCircle className="w-3 h-3 inline mr-1" />}
                        {statusLabel(s)}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Prescriber */}
            {fill.prescriber && (
              <div className="bg-white rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <Stethoscope className="w-3.5 h-3.5" /> Prescriber
                </h3>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Dr. {fill.prescriber.firstName} {fill.prescriber.lastName}
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  NPI: {fill.prescriber.npi || "—"}
                </p>
                {fill.prescriber.phone && (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{fill.prescriber.phone}</p>
                )}
              </div>
            )}

            {/* Fill Info */}
            <div className="bg-white rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <Clock className="w-3.5 h-3.5" /> Fill Details
              </h3>
              <div className="space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                <p>Fill #{fill.fillNumber}</p>
                <p>Created: {new Date(fill.createdAt).toLocaleString()}</p>
                {fill.filledAt && <p>Filled: {new Date(fill.filledAt).toLocaleString()}</p>}
                {fill.verifiedAt && <p>Verified: {new Date(fill.verifiedAt).toLocaleString()}</p>}
                {fill.filler && <p>Filled by: {fill.filler.firstName} {fill.filler.lastName}</p>}
                {fill.verifier && <p>Verified by: {fill.verifier.firstName} {fill.verifier.lastName}</p>}
                {fill.binLocation && <p>Bin: {fill.binLocation}</p>}
                {fill.copayAmount != null && <p>Copay: ${fill.copayAmount.toFixed(2)}</p>}
                {fill.totalPrice != null && <p>Total: ${fill.totalPrice.toFixed(2)}</p>}
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <Activity className="w-3.5 h-3.5" /> Activity Log
              </h3>
              {fill.events.length === 0 ? (
                <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>No events yet</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {fill.events.map((event, i) => (
                    <div key={i} className="text-xs border-l-2 pl-2 py-0.5" style={{ borderColor: "var(--border)" }}>
                      <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {event.fromValue && event.toValue
                          ? `${statusLabel(event.fromValue)} → ${statusLabel(event.toValue)}`
                          : event.eventType}
                      </p>
                      <p style={{ color: "var(--text-muted)" }}>
                        {event.performerName} &middot; {new Date(event.createdAt).toLocaleString()}
                      </p>
                      {event.notes && (
                        <p className="italic" style={{ color: "var(--text-secondary)" }}>{event.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
