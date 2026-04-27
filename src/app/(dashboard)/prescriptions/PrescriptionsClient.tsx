"use client";

/**
 * PrescriptionsClient — interactive wrapper for /prescriptions.
 *
 * Renders the redesigned list UI but with real rows fetched by the parent
 * server component. Tab changes / pagination / search push to ?tab=&page=
 * so the server can refetch with the right slice. Each row is a Link into
 * /prescriptions/[id] — the pre-existing detail/fill page.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DesignPage, I, StatusPill, Toolbar } from "@/components/design";

export interface PrescriptionRow {
  id: string;
  rxNumber: string;
  drug: string;
  patient: string;
  patientId: string | null;
  prescriber: string;
  quantity: number;
  daysSupply: number | null;
  refillsAuthorized: number;
  refillsRemaining: number;
  filled: number;
  lastFilled: string | null;
  status: string;
}

interface Counts {
  all: number;
  active: number;
  completed: number;
  transferred: number;
  expired: number;
}

// Map raw status values into the four user-facing buckets, then to a tone +
// label for the redesigned StatusPill component.
function statusToTone(status: string): "ok" | "mute" | "info" | "warn" {
  if (["dispensed", "delivered"].includes(status)) return "mute";
  if (["transferred"].includes(status)) return "info";
  if (["expired", "cancelled", "on_hold"].includes(status)) return "warn";
  return "ok";
}

function statusToLabel(status: string): string {
  const map: Record<string, string> = {
    intake: "Intake",
    pending_review: "Pending review",
    in_progress: "In progress",
    ready_to_fill: "Ready to fill",
    compounding: "Compounding",
    ready_for_verification: "Ready to verify",
    verified: "Verified",
    ready: "Ready",
    filling: "Filling",
    pending_fill: "Pending fill",
    dispensed: "Dispensed",
    delivered: "Delivered",
    transferred: "Transferred",
    expired: "Expired",
    cancelled: "Cancelled",
    on_hold: "On hold",
  };
  return map[status] ?? status;
}

export default function PrescriptionsClient({
  rows,
  counts,
  activeTab,
  currentPage,
  totalPages,
  total,
  search,
}: {
  rows: PrescriptionRow[];
  counts: Counts;
  activeTab: string;
  currentPage: number;
  totalPages: number;
  total: number;
  search: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(search);

  const updateUrl = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(sp?.toString() ?? "");
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.push(`/prescriptions?${params.toString()}`);
  };

  // Debounced search — push ?search= back up to the server after 300ms idle.
  React.useEffect(() => {
    const id = setTimeout(() => {
      if (searchInput !== search) {
        updateUrl({ search: searchInput || null, page: "1" });
      }
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const tabs = [
    { id: "active", label: "Active", count: counts.active },
    { id: "completed", label: "Completed", count: counts.completed },
    { id: "transferred", label: "Transferred", count: counts.transferred },
    { id: "expired", label: "Expired", count: counts.expired },
    { id: "all", label: "All", count: counts.all },
  ];

  return (
    <DesignPage
      sublabel="Pharmacy"
      title="Prescriptions"
      subtitle="All filled prescriptions · for the active fill queue, see the Workflow Queue"
      actions={
        <>
          <button className="btn btn-secondary btn-sm">
            <I.Download className="ic-sm" /> Export
          </button>
          <Link href="/queue" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Open Workflow Queue →
          </Link>
          <Link href="/prescriptions/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
            <I.Plus /> New Rx
          </Link>
        </>
      }
    >
      <Toolbar
        tabs={tabs}
        active={activeTab}
        onChange={(id) => updateUrl({ tab: id, page: "1" })}
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search Rx#, drug, patient, prescriber…"
        filters={[
          { label: "Drug class", value: "Any" },
          { label: "Prescriber", value: "Any" },
          { label: "Date", value: "Last 30 days" },
        ]}
      />

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Rx #</th>
              <th>Drug</th>
              <th>Patient</th>
              <th>Prescriber</th>
              <th className="t-num" style={{ textAlign: "right" }}>
                Qty
              </th>
              <th className="t-num" style={{ textAlign: "right" }}>
                Days
              </th>
              <th>Refills</th>
              <th>Last filled</th>
              <th>Status</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 60, textAlign: "center", color: "var(--ink-3)" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No prescriptions match</div>
                  <div className="t-xs">Try a different tab or clear the search.</div>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/prescriptions/${r.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="bnds-mono" style={{ fontSize: 12, fontWeight: 500, color: "var(--bnds-forest)" }}>
                    {r.rxNumber}
                  </td>
                  <td style={{ fontWeight: 500 }}>{r.drug}</td>
                  <td>{r.patient}</td>
                  <td className="t-xs">{r.prescriber}</td>
                  <td className="t-num" style={{ textAlign: "right" }}>
                    {r.quantity}
                  </td>
                  <td className="t-num" style={{ textAlign: "right" }}>
                    {r.daysSupply ?? "—"}
                  </td>
                  <td className="t-xs">
                    {r.refillsRemaining} of {r.refillsAuthorized}
                  </td>
                  <td className="t-xs">{r.lastFilled ?? "—"}</td>
                  <td>
                    <StatusPill tone={statusToTone(r.status)} label={statusToLabel(r.status)} />
                  </td>
                  <td>
                    <Link
                      href={`/prescriptions/${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Open prescription"
                      style={{ display: "inline-flex", color: "var(--ink-4)" }}
                    >
                      <I.ChevR />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid var(--line)",
            fontSize: 12,
            color: "var(--ink-3)",
          }}
        >
          <div>
            Showing {rows.length} of {total.toLocaleString()}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => updateUrl({ page: String(Math.max(1, currentPage - 1)) })}
              disabled={currentPage <= 1}
            >
              Prev
            </button>
            <span className="t-xs" style={{ alignSelf: "center" }}>
              Page {currentPage} / {totalPages || 1}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => updateUrl({ page: String(Math.min(totalPages || 1, currentPage + 1)) })}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DesignPage>
  );
}
