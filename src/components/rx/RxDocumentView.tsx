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
 * Defensive fallbacks: when a prescription has no recognized source
 * payload (e.g. legacy DRX-imported Rx with no metadata), we still
 * render a small "Source not available" notice with whatever
 * structured fields we have — never blank.
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
   * Display flag — when true, the panel renders pre-expanded. When
   * false (default) it shows a one-line summary header with a chevron
   * to expand. The fill-process page uses collapsed-by-default to
   * keep the busy 2-col workflow dense; a dedicated /rx/[id]/source
   * route would pass `defaultOpen`.
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

  const headerLabel = headline ?? meta.label;

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
              {hasPayload ? meta.description : "Source document not attached"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {!hasPayload && (
            <span
              className="text-[11px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded"
              style={{
                backgroundColor: "#fef3c7",
                color: "#92400e",
              }}
            >
              No source
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
          {!hasPayload && <MissingSourceView source={source} />}
        </div>
      )}
    </div>
  );
}
