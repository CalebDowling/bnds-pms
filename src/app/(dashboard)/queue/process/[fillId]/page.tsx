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
  MapPin,
  DollarSign,
  MessageCircle,
  PenLine,
  Bell,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import {
  getFillDetail,
  processFill,
  verifyScan,
  setFillFinancials,
  recordVerifyChecklist,
  saveVerifyChecklistDraft,
  recordPickupChecklist,
  notifyPatientReady,
  runDurForFill,
  getDurAlertsForCurrentFill,
  overrideDurAlertOnFill,
  submitAdjudicationForFill,
  type FillDetail,
} from "./actions";
import { FILL_STATUS_META } from "@/lib/workflow/fill-status";
import { DUR_OVERRIDE_REASON_CODES, type DURAlert } from "@/lib/clinical/dur-engine";

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

  // Editable fill metadata (qty fix, bin location, copay, total).
  // Tracked separately from `fill` so the input is responsive and only saves
  // when the tech clicks the per-section Save button.
  const [qtyDraft, setQtyDraft] = useState<string>("");
  const [binDraft, setBinDraft] = useState<string>("");
  const [copayDraft, setCopayDraft] = useState<string>("");
  const [totalDraft, setTotalDraft] = useState<string>("");
  const [savingMeta, setSavingMeta] = useState(false);

  // Pharmacist verify checklist — must be all-checked before advancing
  // out of Verify so the audit trail captures who attested to each item.
  const [checklist, setChecklist] = useState({
    drugCorrect: false,
    quantityCorrect: false,
    sigCorrect: false,
    noInteractions: false,
    ndcVerified: false,
    pdmpChecked: false,
  });
  // Last successful save timestamp for the verify checklist. Drives the
  // "Last saved at..." indicator next to the panel title so the pharmacist
  // gets visual confirmation each toggle is being persisted.
  const [verifyLastSavedAt, setVerifyLastSavedAt] = useState<Date | null>(null);

  // Pickup checklist — gates waiting_bin → sold. Counsel offer (OBRA-90),
  // patient signature / HIPAA ack, and payment must be attested before
  // dispense. Notify-patient-ready is tracked separately because it can fire
  // before the patient arrives.
  const [pickup, setPickup] = useState({
    counselOffered: false,
    // Patients accept counseling more often than they decline, so default to
    // accepted. The cashier unchecks only when the patient declines.
    counselAccepted: true,
    signatureCaptured: false,
    paymentReceived: false,
    pickupNotes: "",
  });
  const [savingPickup, setSavingPickup] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);

  // DUR (Drug Utilization Review) — auto-fired when entering Verify so the
  // pharmacist sees interactions / allergies / duplications inline. Each
  // alert can be overridden via the engine's reason-code dropdown.
  const [durAlerts, setDurAlerts] = useState<DURAlert[]>([]);
  const [durLoading, setDurLoading] = useState(false);
  const [durLastRunAt, setDurLastRunAt] = useState<Date | null>(null);
  const [overriding, setOverriding] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState<Record<string, string>>({});
  const [overrideNotes, setOverrideNotes] = useState<Record<string, string>>({});

  // Adjudication — submit / re-submit the insurance claim from the
  // Adjudicating stage so the tech doesn't have to bounce to /billing.
  // overrideCodes lets the user pass NCPDP override codes for prior auth /
  // step therapy / refill-too-soon bypasses.
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [overrideCodesInput, setOverrideCodesInput] = useState("");
  const [selectedInsuranceId, setSelectedInsuranceId] = useState<string>("");

  const loadFill = useCallback(async () => {
    try {
      const data = await getFillDetail(fillId);
      setFill(data);
      if (!data) setError("Fill not found");
      else {
        // Hydrate the metadata drafts from the saved fill so each input
        // shows the current value, not a stale empty string.
        setBinDraft(data.binLocation || "");
        setCopayDraft(data.copayAmount != null ? String(data.copayAmount) : "");
        setTotalDraft(data.totalPrice != null ? String(data.totalPrice) : "");
        setQtyDraft(String(data.quantity || ""));
        // Restore checklist from fill.metadata if present
        const stored = (data.metadata?.verifyChecklist as Record<string, boolean>) || null;
        if (stored) {
          setChecklist({
            drugCorrect: !!stored.drugCorrect,
            quantityCorrect: !!stored.quantityCorrect,
            sigCorrect: !!stored.sigCorrect,
            noInteractions: !!stored.noInteractions,
            ndcVerified: !!stored.ndcVerified,
            pdmpChecked: !!stored.pdmpChecked,
          });
        }
        // Restore pickup checklist from metadata so a half-completed pickup
        // doesn't reset state if the cashier reloads the page.
        const storedPickup =
          (data.metadata?.pickupChecklist as Record<string, unknown>) || null;
        if (storedPickup) {
          setPickup({
            counselOffered: !!storedPickup.counselOffered,
            counselAccepted: !!storedPickup.counselAccepted,
            signatureCaptured: !!storedPickup.signatureCaptured,
            paymentReceived: !!storedPickup.paymentReceived,
            pickupNotes: (storedPickup.pickupNotes as string) || "",
          });
        }
        // Hydrate any DUR alerts that were already saved for this fill so the
        // pharmacist sees prior overrides on reload without having to re-run.
        try {
          const alerts = await getDurAlertsForCurrentFill(fillId);
          setDurAlerts(alerts);
        } catch {
          // Non-critical — DUR engine errors shouldn't block the page
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fill");
    } finally {
      setLoading(false);
    }
  }, [fillId]);

  useEffect(() => { loadFill(); }, [loadFill]);

  // Auto-fire the DUR engine the first time we land on Verify. Subsequent
  // re-runs happen via the manual "Re-run DUR" button so we don't spam the
  // engine on every state update.
  useEffect(() => {
    if (!fill) return;
    if (fill.status !== "verify") return;
    if (durLastRunAt) return;
    let cancelled = false;
    setDurLoading(true);
    runDurForFill(fill.id)
      .then((alerts) => {
        if (cancelled) return;
        setDurAlerts(alerts);
        setDurLastRunAt(new Date());
      })
      .catch((e) => {
        console.warn("DUR run failed:", e);
      })
      .finally(() => {
        if (!cancelled) setDurLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fill, durLastRunAt]);

  const handleAdvance = async (newStatus: string) => {
    if (!fill) return;
    setProcessing(true);
    setError(null);
    try {
      // If the pharmacist is moving from Verify → Waiting Bin, persist the
      // checklist first so the audit trail records who attested to each item.
      if (newStatus === "waiting_bin" && fill.status === "verify") {
        await recordVerifyChecklist(fill.id, checklist);
      }
      // For waiting_bin → sold, persist the pickup checklist (counsel /
      // signature / payment) before the workflow guard checks for it.
      if (newStatus === "sold" && fill.status === "waiting_bin") {
        await recordPickupChecklist(fill.id, pickup);
      }
      await processFill(fill.id, newStatus, actionNotes || undefined);
      setActionNotes("");
      await loadFill();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  const sendPickupSms = async () => {
    if (!fill) return;
    setNotifying(true);
    setNotifyMessage(null);
    setError(null);
    try {
      const result = await notifyPatientReady(fill.id);
      setNotifyMessage(`SMS sent to ${result.phone}`);
      await loadFill();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send SMS");
    } finally {
      setNotifying(false);
    }
  };

  const savePickupChecklist = async () => {
    if (!fill) return;
    setSavingPickup(true);
    setError(null);
    try {
      await recordPickupChecklist(fill.id, pickup);
      await loadFill();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save pickup checklist");
    } finally {
      setSavingPickup(false);
    }
  };

  // Manual re-run for the DUR engine — used after the pharmacist updates
  // allergies, doses, or refill counts and wants a fresh check.
  const runDurNow = async () => {
    if (!fill) return;
    setDurLoading(true);
    setError(null);
    try {
      const alerts = await runDurForFill(fill.id);
      setDurAlerts(alerts);
      setDurLastRunAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "DUR run failed");
    } finally {
      setDurLoading(false);
    }
  };

  // Submit (or re-submit) the insurance claim. Surfaces the response inline
  // so the tech sees rejection codes / paid amount without leaving the page.
  // After paid claims the workflow guard advances naturally to print.
  const submitInsuranceClaim = async () => {
    if (!fill) return;
    setSubmittingClaim(true);
    setClaimMessage(null);
    setError(null);
    try {
      const codes = overrideCodesInput
        .split(/[\s,]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      const result = await submitAdjudicationForFill(fill.id, {
        insuranceId: selectedInsuranceId || undefined,
        overrideCodes: codes.length > 0 ? codes : undefined,
      });
      if (!result.success) {
        setError(result.error || "Claim submission failed");
        return;
      }
      if (result.status === "paid") {
        setClaimMessage(
          `Paid. Plan paid $${result.paidAmount?.toFixed(2) ?? "0.00"}, copay $${
            result.copayAmount?.toFixed(2) ?? "0.00"
          }.`
        );
      } else if (result.status === "rejected") {
        const codes = result.rejectionCodes?.join(", ") || "—";
        setClaimMessage(`Rejected (${codes}). See details below.`);
      } else {
        setClaimMessage(`Status: ${result.status}`);
      }
      setOverrideCodesInput("");
      await loadFill();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim submission failed");
    } finally {
      setSubmittingClaim(false);
    }
  };

  // Submit an override for a single alert. Reason code is required (regulatory).
  // Notes are optional but encouraged.
  const submitOverride = async (alertId: string) => {
    if (!fill) return;
    const reason = overrideReason[alertId];
    if (!reason) {
      setError("Select an override reason code first");
      return;
    }
    setOverriding(alertId);
    setError(null);
    try {
      const result = await overrideDurAlertOnFill(
        fill.id,
        alertId,
        reason,
        overrideNotes[alertId]?.trim() || undefined
      );
      if (!result.success) {
        setError(result.error || "Override failed");
        return;
      }
      if (result.alerts) setDurAlerts(result.alerts);
      // Clear the per-alert form state once the override is recorded.
      setOverrideReason((prev) => {
        const next = { ...prev };
        delete next[alertId];
        return next;
      });
      setOverrideNotes((prev) => {
        const next = { ...prev };
        delete next[alertId];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Override failed");
    } finally {
      setOverriding(null);
    }
  };

  // Toggle one item on the verify checklist and persist a draft so the
  // pharmacist's progress is never lost. Drives the "Last saved at..."
  // indicator. The immutable all-checked attestation still happens at
  // advance time via recordVerifyChecklist().
  const toggleChecklistItem = (
    key: keyof typeof checklist,
    value: boolean
  ) => {
    const next = { ...checklist, [key]: value };
    setChecklist(next);
    if (!fill) return;
    saveVerifyChecklistDraft(fill.id, next)
      .then((res) => {
        setVerifyLastSavedAt(new Date(res.savedAt));
      })
      .catch((e) => {
        console.warn("Verify checklist draft save failed:", e);
      });
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

  const saveQty = async () => {
    if (!fill) return;
    const qty = parseFloat(qtyDraft);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Enter a positive quantity");
      return;
    }
    setSavingMeta(true);
    setError(null);
    try {
      await setFillFinancials(fill.id, { quantity: qty }, "Set dispense quantity");
      await loadFill();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save quantity");
    } finally {
      setSavingMeta(false);
    }
  };

  const saveBin = async () => {
    if (!fill) return;
    setSavingMeta(true);
    setError(null);
    try {
      await setFillFinancials(
        fill.id,
        { binLocation: binDraft.trim() || null },
        "Set bin location"
      );
      await loadFill();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save bin");
    } finally {
      setSavingMeta(false);
    }
  };

  const saveCopayTotal = async () => {
    if (!fill) return;
    const copay = copayDraft.trim() === "" ? null : parseFloat(copayDraft);
    const total = totalDraft.trim() === "" ? null : parseFloat(totalDraft);
    if (copay !== null && !Number.isFinite(copay)) {
      setError("Copay must be a number");
      return;
    }
    if (total !== null && !Number.isFinite(total)) {
      setError("Total must be a number");
      return;
    }
    setSavingMeta(true);
    setError(null);
    try {
      await setFillFinancials(
        fill.id,
        { copayAmount: copay, totalPrice: total },
        "Set copay/total at POS"
      );
      await loadFill();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save copay/total");
    } finally {
      setSavingMeta(false);
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

            {/* ── Adjudication panel (Adjudicating / Reject / Prepay stages) ──
                Shows the latest claim status inline so the tech can resubmit,
                add NCPDP override codes, or read rejection reasons without
                bouncing to the /billing page. Visible whenever the fill is
                stuck in a payer-related state. */}
            {(fill.status === "adjudicating" ||
              fill.status === "rejected" ||
              fill.status === "prepay" ||
              fill.status === "decline" ||
              fill.status === "price_check") && (
              <div className="bg-white rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <DollarSign className="w-3.5 h-3.5" /> Insurance Adjudication
                </h3>

                {/* Current claim status — paid / rejected / pending */}
                {fill.latestClaim ? (
                  <div
                    className={`mb-3 rounded border p-3 ${
                      fill.latestClaim.status === "paid"
                        ? "bg-green-50 border-green-200"
                        : fill.latestClaim.status === "rejected"
                        ? "bg-red-50 border-red-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold uppercase ${
                          fill.latestClaim.status === "paid"
                            ? "text-green-700"
                            : fill.latestClaim.status === "rejected"
                            ? "text-red-700"
                            : "text-amber-700"
                        }`}
                      >
                        Claim {fill.latestClaim.status}
                      </span>
                      {fill.latestClaim.adjudicatedAt && (
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {new Date(fill.latestClaim.adjudicatedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {fill.latestClaim.status === "paid" && (
                      <div className="text-xs text-green-700 font-tabular">
                        Plan paid <strong>${fill.latestClaim.amountPaid?.toFixed(2) ?? "0.00"}</strong>
                        {" · "}Patient copay <strong>${fill.latestClaim.patientCopay?.toFixed(2) ?? "0.00"}</strong>
                      </div>
                    )}
                    {fill.latestClaim.status === "rejected" && fill.latestClaim.rejectionCodes.length > 0 && (
                      <div className="text-xs text-red-700">
                        <div className="font-semibold mb-0.5">Rejection codes:</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {fill.latestClaim.rejectionCodes.map((code) => (
                            <li key={code}>
                              <span className="font-mono font-bold">{code}</span>
                              {fill.latestClaim?.rejectionMessages[code] &&
                                ` — ${fill.latestClaim.rejectionMessages[code]}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fill.latestClaim.claimNumber && (
                      <div className="text-[11px] mt-1.5 font-mono" style={{ color: "var(--text-muted)" }}>
                        Txn: {fill.latestClaim.claimNumber}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3 text-xs italic" style={{ color: "var(--text-muted)" }}>
                    No claim submitted yet for this fill.
                  </div>
                )}

                {/* Insurance plan picker — defaults to primary */}
                {fill.patient.insurance.length > 0 && (
                  <div className="mb-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                      Insurance Plan
                    </label>
                    <select
                      value={selectedInsuranceId || fill.patient.insurance[0]?.id || ""}
                      onChange={(e) => setSelectedInsuranceId(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-2"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {fill.patient.insurance.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.priority} · {ins.planName || "Unknown plan"}
                          {ins.memberId ? ` (${ins.memberId})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* NCPDP override codes (DUR override / prior auth bypass / etc.) */}
                <div className="mb-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                    Override Codes (optional)
                  </label>
                  <input
                    type="text"
                    value={overrideCodesInput}
                    onChange={(e) => setOverrideCodesInput(e.target.value)}
                    placeholder="e.g. DUR override (1G), prior auth (1)"
                    className="w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Comma- or space-separated NCPDP override codes. Use after a payer rejection that allows override.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    onClick={submitInsuranceClaim}
                    disabled={submittingClaim || fill.patient.insurance.length === 0}
                    className="px-3 py-2 text-xs font-semibold text-white rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
                    style={{ backgroundColor: "var(--green-700)" }}
                  >
                    {submittingClaim ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <DollarSign className="w-3 h-3" />
                    )}
                    {fill.latestClaim
                      ? submittingClaim
                        ? "Re-submitting..."
                        : "Re-submit Claim"
                      : submittingClaim
                      ? "Submitting..."
                      : "Submit Claim"}
                  </button>
                  {fill.patient.insurance.length === 0 && (
                    <p className="text-[11px] text-amber-700">
                      No active insurance on file — add a plan or send to Prepay.
                    </p>
                  )}
                </div>
                {claimMessage && (
                  <p className="text-xs mt-2 font-medium" style={{ color: "var(--text-secondary)" }}>
                    {claimMessage}
                  </p>
                )}
              </div>
            )}

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

                  {/* Interactive Pharmacist Review Checklist.
                      Each item must be explicitly checked before the pharmacist
                      can advance the fill out of Verify. The state is persisted
                      via recordVerifyChecklist() in the advance handler so we
                      have an audit trail showing who attested to what. */}
                  <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mt-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-blue-700">Pharmacist Review Checklist:</span>
                      {/* Per-toggle save feedback. Each checkbox change fires
                          saveVerifyChecklistDraft, which stamps this timestamp
                          on success — so the pharmacist sees their progress is
                          persisted without leaving the page. */}
                      {verifyLastSavedAt && (
                        <span className="text-[10px] italic text-blue-600">
                          Last saved at {verifyLastSavedAt.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {[
                        { key: "drugCorrect", label: "Drug, strength, and dosage form correct" },
                        { key: "quantityCorrect", label: "Quantity and days supply appropriate" },
                        { key: "sigCorrect", label: "SIG directions match prescription" },
                        { key: "noInteractions", label: "No drug interactions or allergy conflicts" },
                        { key: "ndcVerified", label: "NDC / lot verified during scan step" },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 text-xs text-blue-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={(checklist as Record<string, boolean>)[item.key] || false}
                            onChange={(e) =>
                              toggleChecklistItem(
                                item.key as keyof typeof checklist,
                                e.target.checked
                              )
                            }
                            className="rounded border-blue-300 text-blue-700 focus:ring-blue-500 w-4 h-4"
                          />
                          {item.label}
                        </label>
                      ))}
                      {isControlled && (
                        <label className="flex items-center gap-2 text-xs text-red-700 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checklist.pdmpChecked}
                            onChange={(e) =>
                              toggleChecklistItem("pdmpChecked", e.target.checked)
                            }
                            className="rounded border-red-300 text-red-700 focus:ring-red-500 w-4 h-4"
                          />
                          CONTROLLED SUBSTANCE — verify PDMP check
                        </label>
                      )}
                    </div>
                  </div>

                  {/* DUR (Drug Utilization Review) results panel.
                      Auto-fired when the pharmacist lands on Verify and
                      blocking criticals must be overridden before advancing
                      to Waiting Bin (enforced by the workflow guard in
                      fill-status.ts). Each alert exposes a reason-code
                      dropdown so the override is regulatory-compliant. */}
                  <div className="bg-white border rounded mt-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
                      <h4 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                        <ShieldCheck className="w-3.5 h-3.5" /> DUR Alerts
                        {durAlerts.length > 0 && (
                          <span className="ml-1 inline-flex items-center justify-center text-[10px] font-bold w-5 h-5 rounded-full bg-amber-100 text-amber-700">
                            {durAlerts.filter((a) => !a.overridden).length}
                          </span>
                        )}
                      </h4>
                      <button
                        onClick={runDurNow}
                        disabled={durLoading}
                        className="text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
                        style={{ color: "var(--green-700)" }}
                      >
                        {durLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCw className="w-3 h-3" />
                        )}
                        {durLoading ? "Running..." : "Re-run DUR"}
                      </button>
                    </div>

                    {durLoading && durAlerts.length === 0 && (
                      <div className="px-3 py-3 text-xs italic" style={{ color: "var(--text-muted)" }}>
                        Running drug utilization review...
                      </div>
                    )}

                    {!durLoading && durAlerts.length === 0 && (
                      <div className="px-3 py-3 text-xs flex items-center gap-1.5 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        No interactions, allergies, or duplications detected.
                        {durLastRunAt && (
                          <span className="ml-1" style={{ color: "var(--text-muted)" }}>
                            (run {durLastRunAt.toLocaleTimeString()})
                          </span>
                        )}
                      </div>
                    )}

                    {durAlerts.length > 0 && (
                      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {durAlerts.map((alert) => {
                          const sevColor =
                            alert.severity === "critical"
                              ? { bg: "bg-red-50", border: "border-l-red-600", text: "text-red-700", chip: "bg-red-100 text-red-700" }
                              : alert.severity === "major"
                              ? { bg: "bg-amber-50", border: "border-l-amber-500", text: "text-amber-700", chip: "bg-amber-100 text-amber-700" }
                              : alert.severity === "moderate"
                              ? { bg: "bg-yellow-50", border: "border-l-yellow-500", text: "text-yellow-700", chip: "bg-yellow-100 text-yellow-700" }
                              : { bg: "bg-blue-50", border: "border-l-blue-500", text: "text-blue-700", chip: "bg-blue-100 text-blue-700" };
                          return (
                            <div
                              key={alert.id}
                              className={`px-3 py-2.5 border-l-[3px] ${alert.overridden ? "bg-gray-50 border-l-gray-400" : `${sevColor.bg} ${sevColor.border}`}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${alert.overridden ? "bg-gray-200 text-gray-600" : sevColor.chip}`}>
                                    {alert.severity}
                                  </span>
                                  <span className={`text-[10px] font-semibold uppercase ${alert.overridden ? "text-gray-500" : "text-gray-600"}`}>
                                    {alert.alertType.replace(/_/g, " ")}
                                  </span>
                                  <span className={`text-xs font-semibold ${alert.overridden ? "text-gray-500 line-through" : sevColor.text}`}>
                                    {alert.drugA}
                                    {alert.drugB ? ` + ${alert.drugB}` : ""}
                                  </span>
                                </div>
                              </div>
                              <p className={`text-xs mb-1 ${alert.overridden ? "text-gray-500" : "text-gray-700"}`}>
                                {alert.description}
                              </p>
                              {alert.clinicalEffect && !alert.overridden && (
                                <p className="text-[11px] italic mb-1" style={{ color: "var(--text-secondary)" }}>
                                  Effect: {alert.clinicalEffect}
                                </p>
                              )}
                              {alert.recommendation && !alert.overridden && (
                                <p className="text-[11px] mb-1.5" style={{ color: "var(--text-secondary)" }}>
                                  <strong>Recommend:</strong> {alert.recommendation}
                                </p>
                              )}

                              {alert.overridden ? (
                                <div className="text-[11px] mt-1 p-1.5 rounded bg-gray-100" style={{ color: "var(--text-muted)" }}>
                                  {/* Prefer the stored display name; fall back to the
                                      UUID for legacy overrides recorded before the
                                      name was being persisted. */}
                                  Overridden
                                  {alert.overriddenByName
                                    ? ` by ${alert.overriddenByName}`
                                    : alert.overriddenBy
                                    ? ` by ${alert.overriddenBy}`
                                    : ""}
                                  {alert.overriddenAt ? ` on ${new Date(alert.overriddenAt).toLocaleString()}` : ""}
                                  {alert.overrideReasonCode && (
                                    <>
                                      {" "}&middot; Reason:{" "}
                                      <span className="font-mono">{alert.overrideReasonCode}</span>
                                      {/* Render the full NCPDP label when we have it
                                          (new overrides). Older alerts only carry the
                                          code — look it up against the canonical list
                                          so the audit string stays human-readable. */}
                                      {(() => {
                                        const label =
                                          alert.overrideReasonLabel ||
                                          DUR_OVERRIDE_REASON_CODES.find(
                                            (r) => r.code === alert.overrideReasonCode
                                          )?.label;
                                        return label ? ` — ${label}` : null;
                                      })()}
                                    </>
                                  )}
                                  {alert.overrideNotes && <> &middot; {alert.overrideNotes}</>}
                                </div>
                              ) : (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <select
                                    value={overrideReason[alert.id] || ""}
                                    onChange={(e) =>
                                      setOverrideReason((prev) => ({
                                        ...prev,
                                        [alert.id]: e.target.value,
                                      }))
                                    }
                                    className="text-[11px] px-2 py-1 border rounded focus:outline-none focus:ring-1"
                                    style={{ borderColor: "var(--border)" }}
                                  >
                                    <option value="">Select override reason...</option>
                                    {DUR_OVERRIDE_REASON_CODES.map((c) => (
                                      <option key={c.code} value={c.code}>
                                        {c.code} — {c.label}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    value={overrideNotes[alert.id] || ""}
                                    onChange={(e) =>
                                      setOverrideNotes((prev) => ({
                                        ...prev,
                                        [alert.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Notes (optional)"
                                    className="flex-1 min-w-[120px] text-[11px] px-2 py-1 border rounded focus:outline-none focus:ring-1"
                                    style={{ borderColor: "var(--border)" }}
                                  />
                                  <button
                                    onClick={() => submitOverride(alert.id)}
                                    disabled={overriding === alert.id || !overrideReason[alert.id]}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded text-white disabled:opacity-50 inline-flex items-center gap-1"
                                    style={{ backgroundColor: "#dc2626" }}
                                  >
                                    {overriding === alert.id && (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                    Override
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {durAlerts.some((a) => a.severity === "critical" && !a.overridden) && (
                      <div className="px-3 py-2 border-t bg-red-50 text-[11px] font-semibold text-red-700 flex items-center gap-1.5" style={{ borderColor: "var(--border)" }}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Critical alerts must be overridden before advancing to Waiting Bin.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Quantity-fix banner ──
                A fill with qty=0 cannot be advanced (the workflow guards against
                dispensing zero pills). Surface a fix UI right at the top so the
                tech can correct it without bouncing back to the prescription page. */}
            {fill.quantity === 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" /> Dispense Quantity Required
                </h3>
                <p className="text-xs text-amber-700 mb-2">
                  This fill has no quantity set, so it can&apos;t advance through the workflow. Enter the quantity to dispense.
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={qtyDraft}
                    onChange={(e) => setQtyDraft(e.target.value)}
                    placeholder="e.g. 30"
                    className="px-3 py-2 border border-amber-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-32"
                  />
                  <button
                    onClick={saveQty}
                    disabled={savingMeta}
                    className="px-3 py-2 text-xs font-semibold text-white rounded-md disabled:opacity-50"
                    style={{ backgroundColor: "#b45309" }}
                  >
                    {savingMeta ? "Saving..." : "Set Quantity"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Bin Location panel (Waiting Bin stage) ──
                After verify the bottle goes into a physical bin in the pharmacy.
                The tech needs to record which bin so the cashier can find it
                when the patient arrives. */}
            {fill.status === "waiting_bin" && (
              <div className="bg-white rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <MapPin className="w-3.5 h-3.5" /> Bin Location
                </h3>
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                  Record which physical bin this fill is in. This is shown to the cashier at pickup.
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={binDraft}
                    onChange={(e) => setBinDraft(e.target.value)}
                    placeholder="e.g. A12, Will-Call 3, Drive-Thru"
                    className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <button
                    onClick={saveBin}
                    disabled={savingMeta}
                    className="px-3 py-2 text-xs font-semibold text-white rounded-md disabled:opacity-50"
                    style={{ backgroundColor: "var(--green-700)" }}
                  >
                    {savingMeta ? "Saving..." : "Save Bin"}
                  </button>
                </div>

                {/* Copay / total price (captured at POS).
                    Pre-fillable so the cashier can confirm at the register. */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <DollarSign className="w-3.5 h-3.5" /> Copay / Total Price
                  </h4>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={copayDraft}
                      onChange={(e) => setCopayDraft(e.target.value)}
                      placeholder="Copay"
                      className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 w-28"
                      style={{ borderColor: "var(--border)" }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalDraft}
                      onChange={(e) => setTotalDraft(e.target.value)}
                      placeholder="Total"
                      className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 w-28"
                      style={{ borderColor: "var(--border)" }}
                    />
                    <button
                      onClick={saveCopayTotal}
                      disabled={savingMeta}
                      className="px-3 py-2 text-xs font-semibold text-white rounded-md disabled:opacity-50"
                      style={{ backgroundColor: "var(--green-700)" }}
                    >
                      {savingMeta ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Notify Patient Ready (SMS).
                    The cashier can fire this as soon as the bottle is in the
                    bin so the patient gets a heads-up before they arrive.
                    Idempotent — calling again resends. */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <Bell className="w-3.5 h-3.5" /> Patient Notification
                  </h4>
                  {(() => {
                    const notif = fill.metadata?.pickupNotification as
                      | { sentAt?: string; phone?: string }
                      | undefined;
                    if (notif?.sentAt) {
                      return (
                        <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                          Last sent {new Date(notif.sentAt).toLocaleString()} to {notif.phone || "patient"}.
                        </p>
                      );
                    }
                    return (
                      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                        Send a pickup-ready SMS to the patient&apos;s primary phone.
                      </p>
                    );
                  })()}
                  <button
                    onClick={sendPickupSms}
                    disabled={notifying || !fill.patient.phoneNumbers[0]?.number}
                    className="px-3 py-2 text-xs font-semibold text-white rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
                    style={{ backgroundColor: "#0ea5e9" }}
                  >
                    {notifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                    {notifying ? "Sending..." : "Send Pickup SMS"}
                  </button>
                  {!fill.patient.phoneNumbers[0]?.number && (
                    <p className="text-xs mt-1 text-amber-600">No primary phone on file.</p>
                  )}
                  {notifyMessage && (
                    <p className="text-xs mt-1 text-sky-700">{notifyMessage}</p>
                  )}
                </div>

                {/* Pickup Checklist — required gate for waiting_bin → sold.
                    Captures OBRA-90 counsel offer, signature/HIPAA ack, and
                    payment received. Persisted to metadata + FillEvent for
                    the audit trail. */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                    <PenLine className="w-3.5 h-3.5" /> Pickup Checklist
                  </h4>
                  <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                    Must be completed at the register before dispense.
                  </p>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                      <input
                        type="checkbox"
                        checked={pickup.counselOffered}
                        onChange={(e) => setPickup((p) => ({ ...p, counselOffered: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      Counseling offered (OBRA-90)
                    </label>
                    {pickup.counselOffered && (
                      <label className="flex items-center gap-2 text-xs cursor-pointer ml-6" style={{ color: "var(--text-secondary)" }}>
                        <input
                          type="checkbox"
                          checked={pickup.counselAccepted}
                          onChange={(e) => setPickup((p) => ({ ...p, counselAccepted: e.target.checked }))}
                          className="w-4 h-4"
                        />
                        Patient accepted counseling (uncheck if declined)
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                      <input
                        type="checkbox"
                        checked={pickup.signatureCaptured}
                        onChange={(e) => setPickup((p) => ({ ...p, signatureCaptured: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      Patient signature / HIPAA acknowledgement captured
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                      <input
                        type="checkbox"
                        checked={pickup.paymentReceived}
                        onChange={(e) => setPickup((p) => ({ ...p, paymentReceived: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      Payment received
                    </label>
                  </div>
                  <input
                    type="text"
                    value={pickup.pickupNotes}
                    onChange={(e) => setPickup((p) => ({ ...p, pickupNotes: e.target.value }))}
                    placeholder="Pickup notes (e.g. 'signature on file', 'counsel declined')..."
                    className="w-full mt-2 px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-2"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <button
                    onClick={savePickupChecklist}
                    disabled={savingPickup}
                    className="mt-2 px-3 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-50"
                    style={{ backgroundColor: "var(--green-700)" }}
                  >
                    {savingPickup ? "Saving..." : "Save Pickup Checklist"}
                  </button>
                  {(() => {
                    const stored = fill.metadata?.pickupChecklist as
                      | { performedAt?: string }
                      | undefined;
                    if (stored?.performedAt) {
                      return (
                        <p className="text-xs mt-1 text-green-700">
                          Last saved {new Date(stored.performedAt).toLocaleString()}.
                        </p>
                      );
                    }
                    return null;
                  })()}
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
