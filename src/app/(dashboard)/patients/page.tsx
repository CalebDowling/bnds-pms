import Link from "next/link";
import {
  Plus,
  AlertTriangle,
  Search,
  Filter,
  ChevronRight,
  Printer,
} from "lucide-react";
import {
  getPatients,
  findDuplicatePatients,
  getPatientCounts,
  type PatientFilter,
} from "./actions";
import { formatDate, formatPhone } from "@/lib/utils";
import { formatPatientName, formatTimeAgo } from "@/lib/utils/formatters";
import SearchBarPlain from "@/components/ui/SearchBarPlain";
import ExportButton from "@/components/ui/ExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import Avatar from "@/components/ui/bnds/Avatar";
import { Suspense } from "react";

// BNDS PMS Redesign — Patients tabs match the Claude Design:
//   All N · Recent N · Flagged N · Birthdays this week N
// Heritage segmented control: paper-2 container with white surface for the
// active tab. Built with <Link> so filter state lives in the URL and the
// page stays a server component.
const TABS: ReadonlyArray<{ value: PatientFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "recent", label: "Recent" },
  { value: "flagged", label: "Flagged" },
  { value: "birthdays", label: "Birthdays this week" },
];

function isPatientFilter(value: string | undefined): value is PatientFilter {
  return (
    value === "all" ||
    value === "recent" ||
    value === "flagged" ||
    value === "birthdays"
  );
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
    filter?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const filter: PatientFilter = isPatientFilter(params.filter)
    ? params.filter
    : "all";
  // Legacy `?status=` URLs (from older bookmarks / exports) still resolve.
  const legacyStatus = params.status;

  const [{ patients, total, pages }, counts, duplicateClusters] =
    await Promise.all([
      getPatients({ search, filter, status: legacyStatus, page }),
      getPatientCounts(),
      // Surface duplicate-patient clusters so an admin can review and merge.
      // Detection is non-destructive — we only flag, never auto-merge, since
      // each row may carry distinct prescription / claim history.
      // Round 9 found "Broussard-Walker, Greta x2" and "Chesson Walker x2".
      findDuplicatePatients(),
    ]);

  const subtitleCount = counts.all.toLocaleString();
  const showingFrom = total === 0 ? 0 : (page - 1) * 25 + 1;
  const showingTo = Math.min(page * 25, total);

  // Helper: rebuild the URL for the next/prev page or a tab change while
  // preserving the other params. Server-side so the bookmarkable URLs match
  // exactly what the user sees.
  function buildHref(next: { filter?: PatientFilter; page?: number }): string {
    const qs = new URLSearchParams();
    const f = next.filter ?? filter;
    if (f !== "all") qs.set("filter", f);
    if (search) qs.set("search", search);
    const p = next.page ?? page;
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/patients?${s}` : "/patients";
  }

  const content = (
    <PageShell
      eyebrow="People"
      title="Patients"
      subtitle={`${subtitleCount} active patient${counts.all === 1 ? "" : "s"} on file`}
      actions={
        <>
          <ExportButton
            endpoint="/api/export/patients"
            filename={`patients_${new Date().toISOString().split("T")[0]}`}
            sheetName="Patients"
            params={{ filter, search }}
          />
          <Link
            href="/patients/new"
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
            <Plus size={13} strokeWidth={2} /> Add patient
          </Link>
        </>
      }
      toolbar={
        <div
          className="flex items-center flex-wrap"
          style={{ gap: 12 }}
        >
          {/* Segmented tabs — paper-2 container with white surface for active tab */}
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

          {/* Search input — surface white with line border, fixed-flex width */}
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
              <SearchBarInline placeholder="Search by name, phone, DOB, Rx#..." />
            </Suspense>
          </div>

          {/* Filter pills — dashed border, ink-3 value text */}
          <FilterPill label="Plan" value="Any" />
          <FilterPill label="Location" value="Main St" />
          <FilterPill label="Sort" value="Recently filled" />

          <div style={{ flex: 1 }} />

          {/* Right slot — print ghost button */}
          <button
            type="button"
            className="inline-flex items-center transition-colors"
            style={{
              gap: 8,
              padding: "6px 10px",
              fontSize: 12.5,
              fontWeight: 500,
              color: "#3a4a42",
              backgroundColor: "transparent",
              border: "1px solid transparent",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <Printer size={13} strokeWidth={2} />
          </button>
        </div>
      }
    >
      {duplicateClusters.length > 0 && (
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: "#fdf3dc",
            border: "1px solid #f1d99c",
            color: "#7a5408",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              style={{ color: "#c98a14" }}
            />
            <div className="flex-1">
              <p className="text-xs font-semibold">
                {duplicateClusters.length} possible duplicate
                {duplicateClusters.length === 1 ? "" : "s"} on file
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#7a5408" }}>
                The following patients share the same name and date of birth.
                Review each pair and merge manually if they refer to the same
                person.
              </p>
              <ul className="mt-2 space-y-1.5">
                {duplicateClusters.slice(0, 5).map((cluster) => (
                  <li key={cluster.key} className="text-xs">
                    <span className="font-semibold">
                      {formatPatientName(
                        {
                          firstName: cluster.firstName,
                          lastName: cluster.lastName,
                        },
                        { format: "last-first" }
                      )}
                    </span>
                    <span> &middot; DOB {formatDate(cluster.dateOfBirth)} &middot; </span>
                    {cluster.patients.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ", "}
                        <Link
                          href={`/patients/${p.id}`}
                          className="underline"
                          style={{ color: "#7a5408" }}
                        >
                          {p.mrn}
                        </Link>
                      </span>
                    ))}
                  </li>
                ))}
                {duplicateClusters.length > 5 && (
                  <li className="text-xs italic">
                    +{duplicateClusters.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Patients table — heritage card surface, narrow row padding */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e3ddd1",
          boxShadow: "0 1px 0 rgba(20,32,26,0.04), 0 1px 2px rgba(20,32,26,0.04)",
        }}
      >
        {patients.length === 0 ? (
          <div className="p-12 text-center">
            <p style={{ color: "#6b7a72", fontSize: 14 }}>
              {search ? "No patients match your search" : "No patients yet"}
            </p>
            {!search && (
              <Link
                href="/patients/new"
                className="inline-block mt-2 hover:underline"
                style={{ color: "#1f5a3a", fontSize: 13, fontWeight: 600 }}
              >
                Add your first patient
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
                  <th style={th({ width: 36 })}></th>
                  <th style={th()}>Patient</th>
                  <th style={th()}>DOB</th>
                  <th style={th()}>Phone</th>
                  <th style={th()}>Insurance</th>
                  <th style={th()}>Flags</th>
                  <th style={th({ textAlign: "right", numeric: true })}>
                    Active Rx
                  </th>
                  <th style={th()}>Last fill</th>
                  <th style={th({ width: 36 })}></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => {
                  const primaryPhone =
                    patient.phoneNumbers.find((p) => p.isPrimary) ||
                    patient.phoneNumbers[0];
                  const fullName = formatPatientName(
                    {
                      firstName: patient.firstName,
                      lastName: patient.lastName,
                    },
                    { format: "last-first" }
                  );
                  const allergyCount = patient.allergies.length;
                  const hasSevereAllergy = patient.allergies.some(
                    (a) => a.severity === "severe" || a.severity === "anaphylactic"
                  );
                  const primaryInsurance =
                    patient.insurance.find((i) => i.priority === "primary") ||
                    patient.insurance[0];
                  const planName =
                    primaryInsurance?.thirdPartyPlan?.planName ?? null;
                  const activeRxCount = patient._count.prescriptions;
                  const lastFill = patient.prescriptions[0]?.dateFilled ?? null;
                  const lastFillLabel = lastFill ? formatTimeAgo(lastFill) : "—";
                  const lastFillIsToday = lastFillLabel === "Today";

                  return (
                    <tr key={patient.id} className="bnds-row group">
                      {/* Avatar */}
                      <td style={td({ width: 36 })}>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="block"
                        >
                          <Avatar name={fullName} size={30} />
                        </Link>
                      </td>
                      {/* Patient name + ID */}
                      <td style={td()}>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="block no-underline"
                          style={{ color: "inherit" }}
                        >
                          <div style={{ fontWeight: 500, color: "#14201a" }}>
                            {fullName}
                            {patient.suffix ? ` ${patient.suffix}` : ""}
                          </div>
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "#6b7a72",
                              fontFamily:
                                "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace",
                              lineHeight: 1.3,
                              marginTop: 1,
                            }}
                          >
                            {patient.mrn}
                          </div>
                        </Link>
                      </td>
                      {/* DOB */}
                      <td style={td()}>
                        <span style={{ fontSize: 11.5, color: "#6b7a72" }}>
                          {formatDate(patient.dateOfBirth)}
                        </span>
                      </td>
                      {/* Phone (mono) */}
                      <td style={td()}>
                        <span
                          style={{
                            fontSize: 11.5,
                            color: "#6b7a72",
                            fontFamily:
                              "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace",
                          }}
                        >
                          {primaryPhone ? formatPhone(primaryPhone.number) : "—"}
                        </span>
                      </td>
                      {/* Insurance plan */}
                      <td style={td()}>
                        <span style={{ fontSize: 11.5, color: "#6b7a72" }}>
                          {planName ?? (patient.insurance.length > 0 ? "Plan" : "Cash")}
                        </span>
                      </td>
                      {/* Flags */}
                      <td style={td()}>
                        <div className="flex gap-1 flex-wrap">
                          {allergyCount > 0 && (
                            <FlagPill
                              tone={hasSevereAllergy ? "danger" : "warn"}
                              label="Allergy"
                            />
                          )}
                          {/* C-II / DUR / Delivery / Minor would slot in here
                              once we wire prescription-level flags. */}
                        </div>
                      </td>
                      {/* Active Rx */}
                      <td
                        style={td({
                          textAlign: "right",
                          numeric: true,
                          fontWeight: 500,
                        })}
                      >
                        {activeRxCount}
                      </td>
                      {/* Last fill */}
                      <td style={td()}>
                        <span
                          style={{
                            fontSize: 11.5,
                            color: lastFillIsToday ? "#1f5a3a" : "#6b7a72",
                            fontWeight: lastFillIsToday ? 600 : 400,
                          }}
                        >
                          {lastFillLabel}
                        </span>
                      </td>
                      {/* Chevron */}
                      <td style={td({ width: 36 })}>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="inline-flex items-center"
                          style={{ color: "#a3aea7" }}
                          aria-label="Open patient"
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

        {/* Footer — Showing X of N + Prev/Next pattern from design */}
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
              ? "No patients"
              : `Showing ${showingFrom}–${showingTo} of ${total.toLocaleString()}`}
          </div>
          <div className="flex" style={{ gap: 6 }}>
            {page > 1 ? (
              <Link
                href={buildHref({ page: page - 1 })}
                className="inline-flex items-center no-underline transition-colors"
                style={{
                  padding: "6px 10px",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "#3a4a42",
                  backgroundColor: "transparent",
                  border: "1px solid transparent",
                  borderRadius: 6,
                }}
              >
                Prev
              </Link>
            ) : (
              <span
                aria-disabled
                className="inline-flex items-center"
                style={{
                  padding: "6px 10px",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "#a3aea7",
                  borderRadius: 6,
                }}
              >
                Prev
              </span>
            )}
            {page < pages ? (
              <Link
                href={buildHref({ page: page + 1 })}
                className="inline-flex items-center no-underline transition-colors"
                style={{
                  padding: "6px 10px",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "#14201a",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d8d1c2",
                  borderRadius: 6,
                }}
              >
                Next
              </Link>
            ) : (
              <span
                aria-disabled
                className="inline-flex items-center"
                style={{
                  padding: "6px 10px",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "#a3aea7",
                  backgroundColor: "#faf8f4",
                  border: "1px solid #e3ddd1",
                  borderRadius: 6,
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

  return (
    <PermissionGuard resource="patients" action="read">
      {content}
    </PermissionGuard>
  );
}

// ─── Inline helpers ─────────────────────────────────────

/** TH style — column header, ink-3, uppercase, narrow letter-spacing per .tbl. */
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

/** TD style — body cell, 12px vertical / 12px horizontal, ink line bottom. */
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

/** Heritage flag pill matching .pill / .pill-danger / .pill-warn styles. */
function FlagPill({
  tone,
  label,
}: {
  tone: "danger" | "warn" | "info" | "mute" | "default";
  label: string;
}) {
  const palette = {
    danger: { bg: "#fbe6e0", fg: "#7a2818", border: "#f0bdaf" },
    warn: { bg: "#fdf3dc", fg: "#7a5408", border: "#f1d99c" },
    info: { bg: "#e0eef9", fg: "#19476b", border: "#b6d4ec" },
    mute: { bg: "#f3efe7", fg: "#6b7a72", border: "#e3ddd1" },
    default: { bg: "#f3efe7", fg: "#3a4a42", border: "#e3ddd1" },
  }[tone];
  return (
    <span
      className="inline-flex items-center"
      style={{
        padding: "2px 6px",
        borderRadius: 999,
        backgroundColor: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        fontSize: 11.5,
        fontWeight: 500,
        lineHeight: 1.2,
      }}
    >
      {label}
    </span>
  );
}

/** Filter pill stub — dashed border, ink-3 value text. Stub for now; we'll
 * wire Plan / Location / Sort to URL params once those filters land. */
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

/** SearchBarInline wraps SearchBarPlain so the search field renders inline
 * inside the toolbar's surface chip (one cohesive surface — no nested border). */
function SearchBarInline({ placeholder }: { placeholder: string }) {
  return (
    <SearchBarPlain placeholder={placeholder} basePath="/patients" />
  );
}
