import Link from "next/link";
import { Plus, Search, Filter, ChevronRight } from "lucide-react";
import {
  getPrescriptions,
  getPrescriptionCounts,
  type PrescriptionFilter,
} from "./actions";
import { formatDate } from "@/lib/utils";
import {
  formatPatientName,
  formatPrescriberName,
  formatDrugName,
  formatTimeAgo,
} from "@/lib/utils/formatters";
import SearchBarPlain from "@/components/ui/SearchBarPlain";
import ExportButton from "@/components/ui/ExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import { Suspense } from "react";

// BNDS PMS Redesign — Prescriptions list mirrors the design in
// `design-reference/screens/lists.jsx::PrescriptionsList`. Tabs map several
// granular status values to the buckets the design surfaces (Active, Completed,
// Transferred, Expired, All); the bucket → status mapping lives in actions.ts
// so a future status migration only updates the one table.
const TABS: ReadonlyArray<{ value: PrescriptionFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "transferred", label: "Transferred" },
  { value: "expired", label: "Expired" },
  { value: "all", label: "All" },
];

function isPrescriptionFilter(
  value: string | undefined,
): value is PrescriptionFilter {
  return (
    value === "active" ||
    value === "completed" ||
    value === "transferred" ||
    value === "expired" ||
    value === "all"
  );
}

// Map raw status string → StatusPill tone+label per the design's
// `statusTone` / `statusLabel` lookup. Unknown statuses fall back to mute.
function statusDisplay(status: string): {
  tone: "ok" | "warn" | "danger" | "info" | "mute";
  label: string;
} {
  const TONE: Record<
    string,
    { tone: "ok" | "warn" | "danger" | "info" | "mute"; label: string }
  > = {
    intake: { tone: "mute", label: "Intake" },
    pending_review: { tone: "warn", label: "Pending Review" },
    in_progress: { tone: "info", label: "In Progress" },
    compounding: { tone: "info", label: "Compounding" },
    pending_fill: { tone: "info", label: "Pending Fill" },
    ready_to_fill: { tone: "info", label: "Ready to Fill" },
    filling: { tone: "info", label: "Filling" },
    ready_for_verification: { tone: "warn", label: "Needs Verification" },
    verified: { tone: "ok", label: "Verified" },
    ready: { tone: "ok", label: "Ready" },
    on_hold: { tone: "danger", label: "On Hold" },
    dispensed: { tone: "ok", label: "Dispensed" },
    shipped: { tone: "info", label: "Shipped" },
    delivered: { tone: "ok", label: "Delivered" },
    cancelled: { tone: "mute", label: "Cancelled" },
    transferred: { tone: "info", label: "Transferred" },
    expired: { tone: "warn", label: "Expired" },
    active: { tone: "ok", label: "Active" },
    completed: { tone: "mute", label: "Completed" },
  };
  return TONE[status] ?? { tone: "mute", label: status };
}

async function PrescriptionsContent({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
    status?: string;
    filter?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const filter: PrescriptionFilter = isPrescriptionFilter(params.filter)
    ? params.filter
    : "active";
  const legacyStatus = params.status;

  const [{ prescriptions, total, pages }, counts] = await Promise.all([
    getPrescriptions({ search, filter, status: legacyStatus, page }),
    getPrescriptionCounts(),
  ]);

  const showingFrom = total === 0 ? 0 : (page - 1) * 25 + 1;
  const showingTo = Math.min(page * 25, total);

  function buildHref(next: { filter?: PrescriptionFilter; page?: number }): string {
    const qs = new URLSearchParams();
    const f = next.filter ?? filter;
    if (f !== "active") qs.set("filter", f);
    if (search) qs.set("search", search);
    const p = next.page ?? page;
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/prescriptions?${s}` : "/prescriptions";
  }

  return (
    <PageShell
      eyebrow="Pharmacy"
      title="Prescriptions"
      subtitle="All filled prescriptions · for the active fill queue, see the Workflow Queue"
      actions={
        <>
          <ExportButton
            endpoint="/api/export/prescriptions"
            filename={`prescriptions_${new Date().toISOString().split("T")[0]}`}
            sheetName="Prescriptions"
            params={{ filter, search }}
          />
          <Link
            href="/queue"
            className="inline-flex items-center rounded-md no-underline transition-colors"
            style={{
              gap: 8,
              padding: "6px 10px",
              fontSize: 12.5,
              fontWeight: 500,
              color: "#14201a",
              backgroundColor: "#ffffff",
              border: "1px solid #d8d1c2",
            }}
          >
            Open Workflow Queue →
          </Link>
          <Link
            href="/prescriptions/new"
            className="inline-flex items-center gap-1.5 rounded-md font-medium no-underline transition-colors"
            style={{
              backgroundColor: "#1f5a3a",
              color: "#ffffff",
              border: "1px solid #1f5a3a",
              padding: "6px 10px",
              fontSize: 12.5,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 0 rgba(0,0,0,0.04)",
            }}
          >
            <Plus size={13} strokeWidth={2} /> New Rx
          </Link>
        </>
      }
      toolbar={
        <div className="flex items-center flex-wrap" style={{ gap: 12 }}>
          {/* Segmented tabs */}
          <div
            className="inline-flex items-center"
            style={{
              gap: 2,
              padding: 3,
              backgroundColor: "#f3efe7",
              borderRadius: 8,
              border: "1px solid #e3ddd1",
            }}
          >
            {TABS.map((tab) => {
              const isActive = filter === tab.value;
              const count = counts[tab.value];
              return (
                <Link
                  key={tab.value}
                  href={buildHref({ filter: tab.value, page: 1 })}
                  className="inline-flex items-center no-underline transition-all"
                  style={{
                    gap: 6,
                    padding: "6px 12px",
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#14201a" : "#6b7a72",
                    backgroundColor: isActive ? "#ffffff" : "transparent",
                    borderRadius: 6,
                    boxShadow: isActive
                      ? "0 1px 0 rgba(20,32,26,0.04), 0 1px 2px rgba(20,32,26,0.04)"
                      : "none",
                  }}
                >
                  {tab.label}
                  <span
                    style={{
                      fontSize: 11,
                      padding: "0 5px",
                      borderRadius: 999,
                      backgroundColor: isActive ? "#f3efe7" : "transparent",
                      color: "#6b7a72",
                      fontWeight: 500,
                    }}
                  >
                    {count.toLocaleString()}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Search */}
          <div
            className="inline-flex items-center"
            style={{
              gap: 7,
              padding: "6px 11px",
              backgroundColor: "#ffffff",
              border: "1px solid #e3ddd1",
              borderRadius: 6,
              minWidth: 220,
              flex: "0 1 320px",
            }}
          >
            <Search size={13} style={{ color: "#6b7a72" }} strokeWidth={2} />
            <Suspense fallback={null}>
              <SearchBarPlain
                placeholder="Search Rx#, drug, patient, prescriber…"
                basePath="/prescriptions"
              />
            </Suspense>
          </div>

          <FilterPill label="Drug class" value="Any" />
          <FilterPill label="Prescriber" value="Any" />
          <FilterPill label="Date" value="Last 30 days" />

          <div style={{ flex: 1 }} />
        </div>
      }
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e3ddd1",
          boxShadow: "0 1px 0 rgba(20,32,26,0.04), 0 1px 2px rgba(20,32,26,0.04)",
        }}
      >
        {prescriptions.length === 0 ? (
          <div className="p-12 text-center">
            <p style={{ color: "#6b7a72", fontSize: 14 }}>
              {search ? "No prescriptions match your search" : "No prescriptions yet"}
            </p>
            {!search && (
              <Link
                href="/prescriptions/new"
                className="inline-block mt-2 hover:underline"
                style={{ color: "#1f5a3a", fontSize: 13, fontWeight: 600 }}
              >
                Create the first prescription
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full"
              style={{ fontSize: 13, borderCollapse: "collapse" }}
            >
              <thead>
                <tr style={{ backgroundColor: "#faf8f4" }}>
                  <th style={th()}>Rx #</th>
                  <th style={th()}>Drug</th>
                  <th style={th()}>Patient</th>
                  <th style={th()}>Prescriber</th>
                  <th style={th({ textAlign: "right", numeric: true })}>Qty</th>
                  <th style={th({ textAlign: "right", numeric: true })}>Days</th>
                  <th style={th()}>Refills</th>
                  <th style={th()}>Filled</th>
                  <th style={th()}>Status</th>
                  <th style={th({ width: 36 })}></th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => {
                  const drugName = rx.item?.name
                    ? formatDrugName(rx.item.name)
                    : rx.formula?.name
                      ? formatDrugName(rx.formula.name)
                      : "—";
                  const strength = rx.item?.strength;
                  const refillsLabel =
                    rx.refillsAuthorized > 0
                      ? `${rx.refillsRemaining} of ${rx.refillsAuthorized}`
                      : "None";
                  const filledLabel = rx.dateFilled
                    ? formatTimeAgo(rx.dateFilled)
                    : formatDate(rx.createdAt);
                  const display = statusDisplay(rx.status);

                  return (
                    <tr key={rx.id}>
                      <td style={td()}>
                        <Link
                          href={`/prescriptions/${rx.id}`}
                          className="hover:underline"
                          style={{
                            color: "#1f5a3a",
                            fontWeight: 500,
                            fontFamily:
                              "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace",
                            fontSize: 12,
                          }}
                        >
                          {rx.rxNumber}
                        </Link>
                      </td>
                      <td style={td()}>
                        <div style={{ fontWeight: 500, color: "#14201a" }}>
                          {drugName}
                          {strength ? ` ${strength}` : ""}
                        </div>
                      </td>
                      <td style={td()}>
                        <Link
                          href={`/patients/${rx.patient.id}`}
                          className="no-underline"
                          style={{ color: "#14201a" }}
                        >
                          {formatPatientName({
                            firstName: rx.patient.firstName,
                            lastName: rx.patient.lastName,
                          })}
                        </Link>
                      </td>
                      <td style={td()}>
                        <span style={{ fontSize: 11.5, color: "#6b7a72" }}>
                          {formatPrescriberName({
                            firstName: rx.prescriber.firstName,
                            lastName: rx.prescriber.lastName,
                          })}
                          {rx.prescriber.suffix ? `, ${rx.prescriber.suffix}` : ""}
                        </span>
                      </td>
                      <td style={td({ textAlign: "right", numeric: true })}>
                        {rx.quantityPrescribed
                          ? Number(rx.quantityPrescribed).toString()
                          : "—"}
                      </td>
                      <td style={td({ textAlign: "right", numeric: true })}>
                        {rx.daysSupply ?? "—"}
                      </td>
                      <td style={td()}>
                        <span style={{ fontSize: 11.5, color: "#6b7a72" }}>
                          {refillsLabel}
                        </span>
                      </td>
                      <td style={td()}>
                        <span style={{ fontSize: 11.5, color: "#6b7a72" }}>
                          {filledLabel}
                        </span>
                      </td>
                      <td style={td()}>
                        <StatusPill tone={display.tone} label={display.label} />
                      </td>
                      <td style={td({ width: 36 })}>
                        <Link
                          href={`/prescriptions/${rx.id}`}
                          className="inline-flex items-center"
                          style={{ color: "#a3aea7" }}
                          aria-label="Open prescription"
                        >
                          <ChevronRight size={16} strokeWidth={2} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Footer — Showing X of N + Prev/Next */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "10px 14px",
            borderTop: "1px solid #e3ddd1",
            fontSize: 12,
            color: "#6b7a72",
          }}
        >
          <div>
            {total === 0
              ? "No prescriptions"
              : `Showing ${showingFrom}–${showingTo} of ${total.toLocaleString()}`}
          </div>
          <div className="flex" style={{ gap: 6 }}>
            {page > 1 ? (
              <Link
                href={buildHref({ page: page - 1 })}
                className="inline-flex items-center no-underline"
                style={paginationGhost}
              >
                Prev
              </Link>
            ) : (
              <span style={{ ...paginationGhost, color: "#a3aea7" }}>Prev</span>
            )}
            {page < pages ? (
              <Link
                href={buildHref({ page: page + 1 })}
                className="inline-flex items-center no-underline"
                style={paginationActive}
              >
                Next
              </Link>
            ) : (
              <span
                style={{
                  ...paginationActive,
                  color: "#a3aea7",
                  backgroundColor: "#faf8f4",
                }}
              >
                Next
              </span>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
    status?: string;
    filter?: string;
  }>;
}) {
  return (
    <PermissionGuard resource="prescriptions" action="read">
      <PrescriptionsContent searchParams={searchParams} />
    </PermissionGuard>
  );
}

// ─── Inline helpers (shared with patients/page.tsx style) ─────────────────

function th({
  width,
  textAlign = "left",
  numeric = false,
}: {
  width?: number;
  textAlign?: "left" | "right" | "center";
  numeric?: boolean;
} = {}): React.CSSProperties {
  return {
    width,
    textAlign,
    padding: "10px 12px",
    fontSize: 11.5,
    fontWeight: 500,
    color: "#6b7a72",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderBottom: "1px solid #e3ddd1",
    backgroundColor: "#faf8f4",
    fontVariantNumeric: numeric ? "tabular-nums" : undefined,
  };
}

function td({
  width,
  textAlign = "left",
  numeric = false,
  fontWeight,
}: {
  width?: number;
  textAlign?: "left" | "right" | "center";
  numeric?: boolean;
  fontWeight?: number;
} = {}): React.CSSProperties {
  return {
    width,
    textAlign,
    padding: "12px",
    borderBottom: "1px solid #e3ddd1",
    verticalAlign: "middle",
    fontWeight,
    fontVariantNumeric: numeric ? "tabular-nums" : undefined,
  };
}

const paginationGhost: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 12.5,
  fontWeight: 500,
  color: "#3a4a42",
  backgroundColor: "transparent",
  border: "1px solid transparent",
  borderRadius: 6,
};

const paginationActive: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 12.5,
  fontWeight: 500,
  color: "#14201a",
  backgroundColor: "#ffffff",
  border: "1px solid #d8d1c2",
  borderRadius: 6,
};

function StatusPill({
  tone,
  label,
  dot = true,
}: {
  tone: "ok" | "warn" | "danger" | "info" | "mute";
  label: string;
  dot?: boolean;
}) {
  const palette = {
    ok: { bg: "#e8f3e2", fg: "#174530", border: "rgba(90,168,69,0.2)", dot: "#2f8f56" },
    warn: { bg: "#fdf3dc", fg: "#7a5408", border: "#f1d99c", dot: "#c98a14" },
    danger: { bg: "#fbe6e0", fg: "#7a2818", border: "#f0bdaf", dot: "#b8442e" },
    info: { bg: "#e0eef9", fg: "#19476b", border: "#b6d4ec", dot: "#2b6c9b" },
    mute: { bg: "#f3efe7", fg: "#6b7a72", border: "#e3ddd1", dot: "#a3aea7" },
  }[tone];
  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: 5,
        padding: "3px 8px",
        borderRadius: 999,
        backgroundColor: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        fontSize: 11.5,
        fontWeight: 500,
        lineHeight: 1.3,
      }}
    >
      {dot && (
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            backgroundColor: palette.dot,
            display: "inline-block",
          }}
        />
      )}
      {label}
    </span>
  );
}

function FilterPill({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center transition-colors"
      style={{
        gap: 8,
        padding: "6px 10px",
        fontSize: 12.5,
        fontWeight: 500,
        color: "#3a4a42",
        backgroundColor: "#ffffff",
        border: "1px dashed #d8d1c2",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      <Filter size={13} strokeWidth={2} style={{ color: "#6b7a72" }} />
      {label}
      <span style={{ color: "#6b7a72", marginLeft: 2 }}>· {value}</span>
    </button>
  );
}
