"use client";

/**
 * RxDocumentView — renders the *original* prescription document so a
 * pharmacist can verify what the prescriber sent us against the
 * structured fill data we're about to dispense.
 *
 * The component is intentionally polymorphic: pharmacy Rxs arrive via
 * four very different channels and each has its own "source of truth"
 * we should show:
 *
 *   electronic  → the parsed NCPDP SCRIPT NEWRX payload (ParsedNewRx
 *                 from src/lib/erx/parser.ts), stashed at intake on
 *                 Prescription.metadata.erxSource. Renders as a
 *                 structured patient / prescriber / medication view
 *                 with all of the fields we received.
 *   fax         → an inbound fax (Keragon webhook → Phase 2). When the
 *                 raw fax PDF is attached we render it inline; until
 *                 then we fall back to the metadata stub
 *                 (received-at + sender) so the panel is still useful.
 *   paper       → a paper Rx scanned at the front counter (Phase 3).
 *                 Same rules as fax — PDF if available, otherwise
 *                 metadata stub.
 *   phone       → a phoned-in Rx transcribed by a tech (Phase 4).
 *                 The transcript is the document — we render it as
 *                 a quoted block alongside call metadata.
 *
 * The component takes a single prescription-shaped prop so it can be
 * dropped onto either /queue/process/[fillId] or /prescriptions/[id]
 * without coupling to either page's data model. Callers feed it the
 * prescription metadata blob and let the component decide which
 * source-specific renderer to use.
 *
 * Reconstructed-Rx fallback (DRX parity): when a prescription has no
 * source-channel payload — e.g. legacy DRX-imported Rxs, prescriptions
 * created before the metadata.erxSource shape existed, or any Rx whose
 * original document was lost in migration — we synthesize a "pictured"
 * Rx document from the structured Prescription/Patient/Prescriber/Item
 * fields. This mirrors how DRX renders every Rx as a printable-looking
 * document so the pharmacist always has something to verify against,
 * even when no original document is on file. A persistent banner at the
 * top of the reconstructed view makes it clear this is rebuilt from the
 * Rx record rather than the original prescriber-sent document.
 */

import { useState } from "react";
import {
  FileText,
  Mail,
  Printer,
  Phone,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  User,
  Stethoscope,
  Pill,
  Calendar,
  Hash,
  MapPin,
  Building2,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils/formatters";
import { formatPhone } from "@/lib/utils";

// ─── Source-payload types ──────────────────────────────────────────────
//
// Each shape mirrors what we stash on Prescription.metadata at intake.
// The seed-test-fixtures script and the live processIncomingErx() flow
// both write into these shapes, so the component is the single
// reader for the format.

export interface ErxSourcePayload {
  messageId?: string;
  messageType?: string;
  sentAt?: string;
  patient?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: { line1?: string; line2?: string; city?: string; state?: string; zip?: string };
    phone?: string;
  };
  prescriber?: {
    firstName?: string;
    lastName?: string;
    suffix?: string;
    npi?: string;
    deaNumber?: string;
    phone?: string;
    fax?: string;
    address?: { line1?: string; line2?: string; city?: string; state?: string; zip?: string };
    specialty?: string;
  };
  medication?: {
    drugName?: string;
    ndc?: string;
    strength?: string;
    dosageForm?: string;
    route?: string;
    quantity?: number;
    daysSupply?: number;
    directions?: string;
    refillsAuthorized?: number;
    dawCode?: string;
    deaSchedule?: string;
    isCompound?: boolean;
  };
  dateWritten?: string;
  effectiveDate?: string;
  prescriberNotes?: string;
  pharmacyNotes?: string;
}

export interface FaxSourcePayload {
  receivedAt?: string;
  faxNumber?: string;
  pageCount?: number;
  senderName?: string;
  documentId?: string | null;       // populated by Phase 2
  documentUrl?: string | null;
}

export interface PaperSourcePayload {
  scannedAt?: string;
  scannedByLabel?: string;
  documentId?: string | null;       // populated by Phase 3
  documentUrl?: string | null;
}

export interface PhoneSourcePayload {
  calledAt?: string;
  callerName?: string;
  prescriberConfirmed?: boolean;
  prescriberPhone?: string;
  transcript?: string;
  transcribedByLabel?: string;
}

// ─── Component contract ────────────────────────────────────────────────

/**
 * Structured Rx data used to render the "reconstructed" pictured-Rx view
 * when no source-channel payload is on file. Callers pass whatever fields
 * they have access to; the renderer suppresses any rows that come back
 * undefined/null/empty so the result stays clean even when the data is
 * sparse (e.g. a DRX-imported Rx with no prescriber address).
 */
export interface PrescriptionFallback {
  rxNumber?: string | null;
  dateWritten?: string | Date | null;
  expirationDate?: string | Date | null;
  isCompound?: boolean;
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
    dateOfBirth?: string | Date | null;
    gender?: string | null;
    phone?: string | null;
    mrn?: string | null;
    address?: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; zip?: string | null } | null;
  };
  prescriber?: {
    firstName?: string | null;
    lastName?: string | null;
    suffix?: string | null;
    npi?: string | null;
    deaNumber?: string | null;
    phone?: string | null;
    fax?: string | null;
    specialty?: string | null;
    address?: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; zip?: string | null } | null;
  };
  medication?: {
    drugName?: string | null;
    genericName?: string | null;
    strength?: string | null;
    dosageForm?: string | null;
    route?: string | null;
    ndc?: string | null;
    deaSchedule?: string | number | null;
    quantity?: number | null;
    daysSupply?: number | null;
    refillsAuthorized?: number | null;
    refillsRemaining?: number | null;
    dawCode?: string | null;
    isCompound?: boolean;
    directions?: string | null;
  };
  prescriberNotes?: string | null;
}

export interface RxDocumentViewProps {
  /**
   * Prescription source channel — `prescription.source` from the DB.
   * Common values: "electronic", "fax", "paper", "phone", "drx_import".
   * Unknown values render the metadata-fallback view.
   */
  source: string | null;
  /** `Prescription.metadata` JSON — we read erxSource/faxSource/etc. */
  metadata: Record<string, unknown> | null | undefined;
  /**
   * Structured Rx data used to render the "reconstructed" pictured-Rx
   * view when no source-channel payload is on file. When this is
   * provided AND the source-channel payload is missing, the body
   * renders a DRX-style structured Rx document instead of the bare
   * "Source document not attached" notice. Highly recommended on
   * /queue/process and /prescriptions/[id] so the pharmacist always
   * has a pictured Rx to verify against.
   */
  prescriptionFallback?: PrescriptionFallback;
  /**
   * Display flag — when true, the panel renders pre-expanded. When
   * false (default) it shows a one-line summary header with a chevron
   * to expand. The fill-process page passes `defaultOpen` so the
   * pharmacist sees the pictured Rx without an extra click.
   */
  defaultOpen?: boolean;
  /**
   * Optional headline (e.g. "Original Prescription") that overrides
   * the source-channel auto-label. Useful when this view is embedded
   * alongside other "source" panels (refill request log, transfer log).
   */
  headline?: string;
}

// ─── Source-channel meta helpers ──────────────────────────────────────

interface SourceMeta {
  label: string;
  // The lucide icons accept both className and style — typing the
  // component as accepting both keeps the call-site `<Icon className=…
  // style={…} />` legal under strict TS.
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  description: string;
}

function sourceMeta(source: string | null): SourceMeta {
  switch ((source || "").toLowerCase()) {
    case "electronic":
    case "erx":
    case "surescripts":
      return {
        label: "Electronic Prescription (eRx)",
        icon: FileText,
        color: "#0ea5e9",
        description: "Received via SureScripts / NCPDP SCRIPT",
      };
    case "fax":
      return {
        label: "Inbound Fax",
        icon: Mail,
        color: "#8b5cf6",
        description: "Fax received from prescriber's office",
      };
    case "paper":
    case "scan":
    case "written":
      return {
        label: "Paper Prescription",
        icon: Printer,
        color: "#64748b",
        description: "Hard-copy Rx scanned at intake",
      };
    case "phone":
    case "verbal":
      return {
        label: "Phoned-in Prescription",
        icon: Phone,
        color: "#f59e0b",
        description: "Verbal Rx — transcribed by pharmacy staff",
      };
    case "drx_import":
    case "drx":
      return {
        label: "Imported from DRX",
        icon: FileText,
        color: "#94a3b8",
        description: "Migrated from legacy DRX dataset — original document not available",
      };
    default:
      return {
        label: source ? `Source: ${source}` : "Source unknown",
        icon: FileText,
        color: "#94a3b8",
        description: "Original document not on file",
      };
  }
}

// ─── Field row helpers ─────────────────────────────────────────────────

function FieldRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline gap-2 py-1 text-xs">
      <span
        className="flex-shrink-0 uppercase tracking-wide font-semibold"
        style={{ color: "var(--text-muted)", minWidth: "5.5rem" }}
      >
        {label}
      </span>
      <span
        className={mono ? "font-mono" : ""}
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b text-xs font-semibold uppercase tracking-wide"
      style={{
        color: "var(--text-muted)",
        borderColor: "var(--border)",
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {title}
    </div>
  );
}

function formatAddress(addr?: {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
}) {
  if (!addr) return null;
  const lines: string[] = [];
  if (addr.line1) lines.push(addr.line1);
  if (addr.line2) lines.push(addr.line2);
  const cityLine = [addr.city, addr.state].filter(Boolean).join(", ");
  if (cityLine || addr.zip) {
    lines.push([cityLine, addr.zip].filter(Boolean).join(" "));
  }
  return lines.join("\n");
}

// ─── Source-specific renderers ────────────────────────────────────────

function ErxSourceView({ payload }: { payload: ErxSourcePayload }) {
  const p = payload.patient;
  const pr = payload.prescriber;
  const m = payload.medication;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      {/* Patient */}
      <div>
        <SectionHeader icon={User} title="Patient" />
        <FieldRow
          label="Name"
          value={[p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(" ") || null}
        />
        <FieldRow
          label="DOB"
          value={p?.dateOfBirth ? formatDate(p.dateOfBirth) : null}
        />
        <FieldRow label="Gender" value={p?.gender} />
        <FieldRow
          label="Phone"
          value={p?.phone ? formatPhone(p.phone) : null}
        />
        {formatAddress(p?.address) && (
          <div className="flex items-start gap-2 py-1 text-xs">
            <span
              className="flex-shrink-0 uppercase tracking-wide font-semibold"
              style={{ color: "var(--text-muted)", minWidth: "5.5rem" }}
            >
              Address
            </span>
            <span className="whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
              {formatAddress(p?.address)}
            </span>
          </div>
        )}
      </div>

      {/* Prescriber */}
      <div>
        <SectionHeader icon={Stethoscope} title="Prescriber" />
        <FieldRow
          label="Name"
          value={
            [pr?.firstName, pr?.lastName].filter(Boolean).join(" ") +
              (pr?.suffix ? `, ${pr.suffix}` : "") || null
          }
        />
        <FieldRow label="Specialty" value={pr?.specialty} />
        <FieldRow label="NPI" value={pr?.npi} mono />
        <FieldRow label="DEA" value={pr?.deaNumber} mono />
        <FieldRow
          label="Phone"
          value={pr?.phone ? formatPhone(pr.phone) : null}
        />
        <FieldRow
          label="Fax"
          value={pr?.fax ? formatPhone(pr.fax) : null}
        />
      </div>

      {/* Medication */}
      <div className="col-span-2">
        <SectionHeader icon={Pill} title="Medication" />
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <FieldRow label="Drug" value={m?.drugName} />
            <FieldRow label="Strength" value={m?.strength} />
            <FieldRow label="Form" value={m?.dosageForm} />
            <FieldRow label="Route" value={m?.route} />
            <FieldRow label="NDC" value={m?.ndc} mono />
            {m?.deaSchedule && <FieldRow label="DEA Sched" value={m.deaSchedule} />}
          </div>
          <div>
            <FieldRow label="Quantity" value={m?.quantity} />
            <FieldRow label="Days Supply" value={m?.daysSupply} />
            <FieldRow label="Refills" value={m?.refillsAuthorized} />
            <FieldRow label="DAW" value={m?.dawCode} />
            {m?.isCompound && (
              <FieldRow label="Compound" value="Yes" />
            )}
          </div>
        </div>
        {m?.directions && (
          <div className="mt-2 rounded border-l-4 px-3 py-2 text-xs" style={{ borderColor: "#0ea5e9", backgroundColor: "var(--surface-2, #f1f5f9)" }}>
            <div
              className="uppercase tracking-wide font-semibold mb-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              SIG / Directions
            </div>
            <div style={{ color: "var(--text-primary)" }}>{m.directions}</div>
          </div>
        )}
      </div>

      {/* Notes + audit */}
      <div className="col-span-2">
        <SectionHeader icon={Calendar} title="Audit" />
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <FieldRow
              label="Date Written"
              value={payload.dateWritten ? formatDate(payload.dateWritten) : null}
            />
            <FieldRow
              label="Sent At"
              value={payload.sentAt ? formatDateTime(payload.sentAt) : null}
            />
          </div>
          <div>
            <FieldRow label="Message ID" value={payload.messageId} mono />
            <FieldRow label="Message Type" value={payload.messageType} />
          </div>
        </div>
        {payload.prescriberNotes && (
          <div className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span
              className="uppercase tracking-wide font-semibold mr-2"
              style={{ color: "var(--text-muted)" }}
            >
              Prescriber notes:
            </span>
            {payload.prescriberNotes}
          </div>
        )}
        {payload.pharmacyNotes && (
          <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span
              className="uppercase tracking-wide font-semibold mr-2"
              style={{ color: "var(--text-muted)" }}
            >
              Pharmacy notes:
            </span>
            {payload.pharmacyNotes}
          </div>
        )}
      </div>
    </div>
  );
}

function FaxSourceView({ payload }: { payload: FaxSourcePayload }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-3">
        <FieldRow
          label="Received"
          value={payload.receivedAt ? formatDateTime(payload.receivedAt) : null}
        />
        <FieldRow
          label="Fax #"
          value={payload.faxNumber ? formatPhone(payload.faxNumber) : null}
        />
        <FieldRow label="Sender" value={payload.senderName} />
        <FieldRow
          label="Pages"
          value={payload.pageCount ? `${payload.pageCount}` : null}
        />
      </div>
      {payload.documentUrl ? (
        <DocumentEmbed url={payload.documentUrl} label="View fax PDF" />
      ) : (
        <DocumentPlaceholder
          message="Fax document not yet attached"
          subtext="The Keragon fax intake handler attaches the PDF when it processes the incoming fax. (Phase 2)"
        />
      )}
    </div>
  );
}

function PaperSourceView({ payload }: { payload: PaperSourcePayload }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-3">
        <FieldRow
          label="Scanned"
          value={payload.scannedAt ? formatDateTime(payload.scannedAt) : null}
        />
        <FieldRow label="By" value={payload.scannedByLabel} />
      </div>
      {payload.documentUrl ? (
        <DocumentEmbed url={payload.documentUrl} label="View scanned Rx" />
      ) : (
        <DocumentPlaceholder
          message="Scan not yet attached"
          subtext="The intake-tech upload control on /prescriptions/new attaches the scan. (Phase 3)"
        />
      )}
    </div>
  );
}

function PhoneSourceView({ payload }: { payload: PhoneSourcePayload }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-3">
        <FieldRow
          label="Call time"
          value={payload.calledAt ? formatDateTime(payload.calledAt) : null}
        />
        <FieldRow label="Caller" value={payload.callerName} />
        <FieldRow
          label="Callback #"
          value={payload.prescriberPhone ? formatPhone(payload.prescriberPhone) : null}
        />
        <FieldRow
          label="Verified"
          value={payload.prescriberConfirmed ? "Yes \u2014 caller confirmed via callback" : "No"}
        />
        <FieldRow label="Transcribed by" value={payload.transcribedByLabel} />
      </div>
      {payload.transcript && (
        <div
          className="rounded border-l-4 px-3 py-2 text-xs leading-relaxed whitespace-pre-line"
          style={{
            borderColor: "#f59e0b",
            backgroundColor: "var(--surface-2, #fef3c7)",
            color: "var(--text-primary)",
          }}
        >
          <div
            className="uppercase tracking-wide font-semibold mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            Transcript
          </div>
          {payload.transcript}
        </div>
      )}
    </div>
  );
}

function MissingSourceView({ source }: { source: string | null }) {
  return (
    <div
      className="text-xs px-3 py-3 rounded border"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-2, #f8fafc)",
        color: "var(--text-secondary)",
      }}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
        <div>
          <div className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Original document not on file
          </div>
          <div>
            {source === "drx_import" || source === "drx" ? (
              <>This Rx was imported from DRX. The original prescription
              document was not migrated as part of the import — it lives in
              the DRX system. Use the prescription details captured below
              to verify against the source.</>
            ) : (
              <>This prescription has no source document attached.
              Future intakes via SureScripts (eRx), Keragon (fax),
              the front-counter scan workflow, and the phone-Rx
              transcription form will attach the original
              source automatically.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reconstructed-Rx (pictured) view ────────────────────────────────
//
// Renders a DRX-style structured Rx document built from the fields we
// already captured on the Prescription / Patient / Prescriber / Item
// records. Used when no source-channel payload (erxSource / faxSource /
// paperSource / phoneSource) is on file, which is the case for:
//   • DRX-imported prescriptions (the original lives in DRX)
//   • prescriptions written before metadata.erxSource existed
//   • any other Rx whose source document was lost or never attached
//
// The layout mirrors a paper Rx: header band with RX# and date written,
// patient demographics block, prescriber block with NPI/DEA, then the
// medication panel with SIG, refills, DAW, and quantity. A persistent
// banner at the top makes it clear this is a reconstruction so the
// pharmacist isn't misled into thinking it's the original document.

function ReconstructedRxView({ data, source }: { data: PrescriptionFallback; source: string | null }) {
  const p = data.patient || {};
  const pr = data.prescriber || {};
  const m = data.medication || {};

  const patientName = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  const prescriberName =
    [pr.firstName, pr.lastName].filter(Boolean).join(" ").trim() +
    (pr.suffix ? `, ${pr.suffix}` : "");
  const drugLabel = [m.drugName, m.strength, m.dosageForm].filter(Boolean).join(" ").trim();
  const isDrxImport = source === "drx_import" || source === "drx";

  // Refills can be either "remaining / authorized" (nice for active Rxs)
  // or just "authorized" (nice for newly-created intake views). Prefer
  // the richer form when both are present.
  const refillsLabel = (() => {
    if (m.refillsRemaining != null && m.refillsAuthorized != null) {
      return `${m.refillsRemaining} of ${m.refillsAuthorized}`;
    }
    if (m.refillsAuthorized != null) return String(m.refillsAuthorized);
    if (m.refillsRemaining != null) return String(m.refillsRemaining);
    return null;
  })();

  return (
    <div className="space-y-3">
      {/* Reconstruction banner — always visible inside the pictured Rx
          so the pharmacist knows this is a structured-data view, not
          the prescriber-sent document. */}
      <div
        className="text-[11px] px-3 py-2 rounded border flex items-start gap-2"
        style={{
          borderColor: "#fbbf24",
          backgroundColor: "#fffbeb",
          color: "#78350f",
        }}
      >
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Reconstructed from Rx record</span>
          {isDrxImport
            ? " — original DRX prescription document was not migrated."
            : " — original prescriber-sent document is not on file. Verify against the structured fields below."}
        </div>
      </div>

      {/* Document header: RX# + date written */}
      <div
        className="rounded border px-4 py-2 flex items-center justify-between"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-2, #f8fafc)",
        }}
      >
        <div className="flex items-center gap-3">
          <Hash className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <div>
            <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
              Rx Number
            </div>
            <div className="text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>
              {data.rxNumber || "—"}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-muted)" }}>
            Date Written
          </div>
          <div className="text-sm" style={{ color: "var(--text-primary)" }}>
            {data.dateWritten ? formatDate(data.dateWritten) : "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* Patient block — DRX styles patients in a red header band; we
            use a left red border + tinted background to match without
            committing to a full color block. */}
        <div
          className="rounded border-l-4 pl-3 pr-2 py-2"
          style={{ borderColor: "#dc2626", backgroundColor: "var(--surface-2, #fef2f2)" }}
        >
          <SectionHeader icon={User} title="Patient" />
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {patientName || "—"}
          </div>
          {p.mrn && (
            <div className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
              MRN: {p.mrn}
            </div>
          )}
          <FieldRow label="DOB" value={p.dateOfBirth ? formatDate(p.dateOfBirth) : null} />
          <FieldRow label="Gender" value={p.gender} />
          <FieldRow label="Phone" value={p.phone ? formatPhone(p.phone) : null} />
          {formatAddress(p.address ? {
            line1: p.address.line1 ?? undefined,
            line2: p.address.line2 ?? undefined,
            city: p.address.city ?? undefined,
            state: p.address.state ?? undefined,
            zip: p.address.zip ?? undefined,
          } : undefined) && (
            <div className="flex items-start gap-2 py-1 text-xs">
              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <span className="whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
                {formatAddress(p.address ? {
                  line1: p.address.line1 ?? undefined,
                  line2: p.address.line2 ?? undefined,
                  city: p.address.city ?? undefined,
                  state: p.address.state ?? undefined,
                  zip: p.address.zip ?? undefined,
                } : undefined)}
              </span>
            </div>
          )}
        </div>

        {/* Prescriber block — DRX uses blue. Same border-strip treatment
            as the patient panel but in blue. */}
        <div
          className="rounded border-l-4 pl-3 pr-2 py-2"
          style={{ borderColor: "#2563eb", backgroundColor: "var(--surface-2, #eff6ff)" }}
        >
          <SectionHeader icon={Stethoscope} title="Prescriber" />
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {prescriberName || "—"}
          </div>
          {pr.specialty && (
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {pr.specialty}
            </div>
          )}
          <FieldRow label="NPI" value={pr.npi} mono />
          <FieldRow label="DEA" value={pr.deaNumber} mono />
          <FieldRow label="Phone" value={pr.phone ? formatPhone(pr.phone) : null} />
          <FieldRow label="Fax" value={pr.fax ? formatPhone(pr.fax) : null} />
          {formatAddress(pr.address ? {
            line1: pr.address.line1 ?? undefined,
            line2: pr.address.line2 ?? undefined,
            city: pr.address.city ?? undefined,
            state: pr.address.state ?? undefined,
            zip: pr.address.zip ?? undefined,
          } : undefined) && (
            <div className="flex items-start gap-2 py-1 text-xs">
              <Building2 className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <span className="whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
                {formatAddress(pr.address ? {
                  line1: pr.address.line1 ?? undefined,
                  line2: pr.address.line2 ?? undefined,
                  city: pr.address.city ?? undefined,
                  state: pr.address.state ?? undefined,
                  zip: pr.address.zip ?? undefined,
                } : undefined)}
              </span>
            </div>
          )}
        </div>

        {/* Medication block — full-width, mimics the "Rx" big-block from
            a paper script. Drug name as the headline, then a 2-col grid
            of supporting fields. */}
        <div
          className="col-span-2 rounded border-l-4 pl-3 pr-2 py-2"
          style={{ borderColor: "#0ea5e9", backgroundColor: "var(--surface-2, #f0f9ff)" }}
        >
          <SectionHeader icon={Pill} title={data.isCompound || m.isCompound ? "Compound Medication" : "Medication"} />
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {drugLabel || m.drugName || "—"}
          </div>
          {m.genericName && m.genericName !== m.drugName && (
            <div className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>
              Generic: {m.genericName}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 mt-1">
            <div>
              <FieldRow label="NDC" value={m.ndc} mono />
              <FieldRow label="Route" value={m.route} />
              <FieldRow label="Quantity" value={m.quantity} />
              <FieldRow label="Days Supply" value={m.daysSupply} />
            </div>
            <div>
              <FieldRow label="Refills" value={refillsLabel} />
              <FieldRow label="DAW" value={m.dawCode} />
              {m.deaSchedule && <FieldRow label="DEA Sched" value={String(m.deaSchedule)} />}
              {(data.isCompound || m.isCompound) && <FieldRow label="Compound" value="Yes" />}
            </div>
          </div>
          {m.directions && (
            <div
              className="mt-2 rounded border-l-4 px-3 py-2 text-xs"
              style={{ borderColor: "#0ea5e9", backgroundColor: "white" }}
            >
              <div
                className="uppercase tracking-wide font-semibold mb-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                SIG / Directions
              </div>
              <div style={{ color: "var(--text-primary)" }}>{m.directions}</div>
            </div>
          )}
        </div>

        {/* Notes / audit footer */}
        {(data.prescriberNotes || data.expirationDate) && (
          <div className="col-span-2">
            <SectionHeader icon={Calendar} title="Notes & Audit" />
            <div className="grid grid-cols-2 gap-x-6">
              <FieldRow
                label="Expires"
                value={data.expirationDate ? formatDate(data.expirationDate) : null}
              />
              <div />
            </div>
            {data.prescriberNotes && (
              <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span
                  className="uppercase tracking-wide font-semibold mr-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Prescriber notes:
                </span>
                {data.prescriberNotes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Document embed + placeholder ────────────────────────────────────

function DocumentEmbed({ url, label }: { url: string; label: string }) {
  // Naive content-type detection from URL extension. For Supabase signed
  // URLs we'd want to pass the contentType through metadata in a future
  // pass — for now the heuristic is "embed PDFs inline, link everything
  // else as a download". Image source documents render as <img>.
  const lower = url.toLowerCase().split("?")[0];
  const isPdf = lower.endsWith(".pdf");
  const isImage = /\.(png|jpe?g|gif|webp|tiff?)$/.test(lower);

  if (isImage) {
    return (
      <div
        className="rounded border overflow-hidden"
        style={{ borderColor: "var(--border)", maxHeight: "70vh" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className="w-full h-auto"
          style={{ maxHeight: "70vh", objectFit: "contain" }}
        />
        <div className="text-[11px] px-3 py-1.5 border-t" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--green-700)" }}>
            Open in new tab
          </a>
        </div>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="rounded border" style={{ borderColor: "var(--border)" }}>
        <iframe
          src={url}
          title={label}
          className="w-full"
          style={{ height: "70vh", border: 0 }}
        />
        <div className="text-[11px] px-3 py-1.5 border-t" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--green-700)" }}>
            Open in new tab
          </a>
        </div>
      </div>
    );
  }

  // Unknown type — link only.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs"
      style={{ color: "var(--green-700)" }}
    >
      <FileText className="w-4 h-4" />
      {label}
    </a>
  );
}

function DocumentPlaceholder({ message, subtext }: { message: string; subtext: string }) {
  return (
    <div
      className="border-2 border-dashed rounded px-4 py-6 text-center text-xs"
      style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
    >
      <FileText className="w-6 h-6 mx-auto mb-1.5" style={{ color: "var(--text-muted)" }} />
      <div className="font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
        {message}
      </div>
      <div>{subtext}</div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export default function RxDocumentView({
  source,
  metadata,
  prescriptionFallback,
  defaultOpen = false,
  headline,
}: RxDocumentViewProps) {
  const [open, setOpen] = useState(defaultOpen);

  const meta = sourceMeta(source);
  const Icon = meta.icon;

  // Pluck the right payload off metadata so the renderer doesn't have
  // to dig. We accept either the canonical key (erxSource, faxSource,
  // …) or the legacy/short forms a few seed scripts and migrations
  // may have used (erx, fax, paper, phone). Future writers should use
  // the canonical form.
  const md = metadata || {};
  const erxPayload = (md.erxSource || md.erx) as ErxSourcePayload | undefined;
  const faxPayload = (md.faxSource || md.fax) as FaxSourcePayload | undefined;
  const paperPayload = (md.paperSource || md.paper) as PaperSourcePayload | undefined;
  const phonePayload = (md.phoneSource || md.phone) as PhoneSourcePayload | undefined;

  const lowSource = (source || "").toLowerCase();
  const hasPayload =
    (lowSource === "electronic" || lowSource === "erx" || lowSource === "surescripts") ? !!erxPayload :
    lowSource === "fax" ? !!faxPayload :
    (lowSource === "paper" || lowSource === "scan" || lowSource === "written") ? !!paperPayload :
    (lowSource === "phone" || lowSource === "verbal") ? !!phonePayload :
    false;

  // When no source-channel payload exists, we render the structured
  // "reconstructed" Rx view if the caller supplied fallback data. The
  // header description and the right-hand badge both reflect this so
  // the pharmacist can tell at a glance whether they're looking at the
  // original document or a rebuild.
  const hasFallback = !!prescriptionFallback;
  const showReconstructed = !hasPayload && hasFallback;

  const headerLabel = headline ?? meta.label;
  const headerDescription = hasPayload
    ? meta.description
    : showReconstructed
    ? "Pictured Rx reconstructed from structured fields"
    : "Source document not attached";

  return (
    <div
      className="bg-white rounded-lg border"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Collapsible header — click to expand/collapse */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left rounded-t-lg hover:bg-[var(--surface-2,#f8fafc)] transition-colors"
        style={{ borderColor: "var(--border)" }}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: meta.color + "20" }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
          </span>
          <div className="min-w-0">
            <div
              className="text-sm font-semibold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {headerLabel}
            </div>
            <div
              className="text-[11px] truncate"
              style={{ color: "var(--text-muted)" }}
            >
              {headerDescription}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {!hasPayload && (
            <span
              className="text-[11px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded"
              style={{
                backgroundColor: showReconstructed ? "#dbeafe" : "#fef3c7",
                color: showReconstructed ? "#1e40af" : "#92400e",
              }}
            >
              {showReconstructed ? "Reconstructed" : "No source"}
            </span>
          )}
          {open ? (
            <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          )}
        </div>
      </button>

      {/* Body — only mounted when open so closed Rx detail pages don't
          re-render expensive document iframes off-screen. */}
      {open && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          {(lowSource === "electronic" || lowSource === "erx" || lowSource === "surescripts") &&
            erxPayload && <ErxSourceView payload={erxPayload} />}
          {lowSource === "fax" && faxPayload && <FaxSourceView payload={faxPayload} />}
          {(lowSource === "paper" || lowSource === "scan" || lowSource === "written") && paperPayload && (
            <PaperSourceView payload={paperPayload} />
          )}
          {(lowSource === "phone" || lowSource === "verbal") && phonePayload && (
            <PhoneSourceView payload={phonePayload} />
          )}
          {!hasPayload && (
            showReconstructed && prescriptionFallback ? (
              <ReconstructedRxView data={prescriptionFallback} source={source} />
            ) : (
              <MissingSourceView source={source} />
            )
          )}
        </div>
      )}
    </div>
  );
}
