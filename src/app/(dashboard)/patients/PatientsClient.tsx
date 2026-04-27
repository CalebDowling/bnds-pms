"use client";

/**
 * PatientsClient — interactive shell for /patients.
 *
 * Renders the redesigned list UI, but each row routes to /patients/[id]
 * (the existing detail page). Tabs/pagination/search push back to the
 * server via searchParams.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DesignPage, I, Toolbar } from "@/components/design";

export interface PatientRow {
  id: string;
  mrn: string;
  name: string;
  dob: string;
  phone: string | null;
  insurance: string;
  hasAllergy: boolean;
  hasDur: boolean;
  activeRx: number;
  lastFill: string;
  status: string;
}

interface Counts {
  all: number;
  recent: number;
  flagged: number;
  birthdays: number;
}

function formatPhone(raw: string | null): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

export default function PatientsClient({
  rows,
  counts,
  activeTab,
  currentPage,
  totalPages,
  total,
  search,
}: {
  rows: PatientRow[];
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
    router.push(`/patients?${params.toString()}`);
  };

  // Debounced search → server refetch.
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
    { id: "all", label: "All", count: counts.all },
    { id: "recent", label: "Recent", count: counts.recent },
    { id: "flagged", label: "Flagged", count: counts.flagged },
    { id: "birthdays", label: "Birthdays this week", count: counts.birthdays },
  ];

  return (
    <DesignPage
      sublabel="People"
      title="Patients"
      subtitle={`${total.toLocaleString()} active patient${total === 1 ? "" : "s"} · click any row to open the chart`}
      actions={
        <>
          <button className="btn btn-secondary btn-sm">
            <I.Download className="ic-sm" /> Export
          </button>
          <Link href="/patients/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
            <I.Plus /> Add patient
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
        searchPlaceholder="Search by name, phone, DOB, MRN…"
        filters={[
          { label: "Plan", value: "Any" },
          { label: "Sort: Last name" },
        ]}
      />

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Patient</th>
              <th>DOB</th>
              <th>Phone</th>
              <th>Insurance</th>
              <th>Flags</th>
              <th className="t-num" style={{ textAlign: "right" }}>
                Active Rx
              </th>
              <th>Last fill</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 60, textAlign: "center", color: "var(--ink-3)" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No patients match</div>
                  <div className="t-xs">Try a different tab or clear the search.</div>
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/patients/${p.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div className="t-xs bnds-mono">{p.mrn}</div>
                  </td>
                  <td className="t-xs">{p.dob}</td>
                  <td className="t-xs bnds-mono">{formatPhone(p.phone)}</td>
                  <td className="t-xs">{p.insurance}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {p.hasAllergy && (
                        <span className="pill pill-danger" style={{ padding: "2px 6px" }}>
                          Allergy
                        </span>
                      )}
                      {p.hasDur && (
                        <span className="pill pill-warn" style={{ padding: "2px 6px" }}>
                          DUR
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="t-num" style={{ textAlign: "right", fontWeight: 500 }}>
                    {p.activeRx}
                  </td>
                  <td
                    className="t-xs"
                    style={{ color: p.lastFill === "Today" ? "var(--bnds-forest)" : "var(--ink-3)" }}
                  >
                    {p.lastFill}
                  </td>
                  <td>
                    <Link
                      href={`/patients/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Open patient chart"
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
