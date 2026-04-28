"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DesignPage, I, StatusPill, Toolbar } from "@/components/design";

export interface InsuranceClaimRow {
  id: string;
  claimNumber: string;
  rxNumber: string | null;
  patient: string;
  plan: string;
  drug: string;
  billed: number;
  paid: number;
  status: "paid" | "rejected" | "pending" | "partial";
  codeLabel: string;
  submitted: string;
}

const TONE: Record<InsuranceClaimRow["status"], "ok" | "danger" | "warn" | "info"> = {
  paid: "ok",
  rejected: "danger",
  pending: "warn",
  partial: "info",
};
const LBL: Record<InsuranceClaimRow["status"], string> = {
  paid: "Paid",
  rejected: "Rejected",
  pending: "Pending",
  partial: "Partial",
};

interface Props {
  rows: InsuranceClaimRow[];
  total: number;
  page: number;
  totalPages: number;
  tab: "rejected" | "pending" | "paid" | "all";
  search: string;
  tabCounts: { rejected: number; pending: number; paid: number };
}

export default function InsuranceClient({
  rows,
  total,
  page,
  totalPages,
  tab,
  search: initialSearch,
  tabCounts,
}: Props) {
  const router = useRouter();
  const [searchInput, setSearchInput] = React.useState(initialSearch);

  const TABS = [
    { id: "rejected", label: "Need action", count: tabCounts.rejected },
    { id: "pending", label: "Pending", count: tabCounts.pending },
    { id: "paid", label: "Paid", count: tabCounts.paid },
    { id: "all", label: "All" },
  ];

  const navigate = (next: { tab?: string; q?: string; page?: number }) => {
    const params = new URLSearchParams();
    const newTab = next.tab ?? tab;
    const newSearch = next.q ?? initialSearch;
    if (newTab !== "rejected") params.set("tab", newTab);
    if (newSearch) params.set("q", newSearch);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`/insurance${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <DesignPage
      sublabel="Financial"
      title="Insurance"
      subtitle={`${tabCounts.rejected} need attention · ${tabCounts.pending} pending · ${total.toLocaleString()} on this view`}
      actions={
        <>
          <a href="/insurance/plans" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Plan formulary
          </a>
          <a href="/insurance/eligibility" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Eligibility check
          </a>
        </>
      }
    >
      <Toolbar
        tabs={TABS}
        active={tab}
        onChange={(t) => navigate({ tab: t })}
        search={searchInput}
        onSearchChange={(v) => setSearchInput(v)}
        searchPlaceholder="Search claim, patient, plan, Rx#…"
      />

      <div className="card" style={{ overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            {initialSearch
              ? `No claims matching "${initialSearch}".`
              : tab === "rejected"
              ? "No claims need action right now."
              : "No claims in this view."}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Claim #</th>
                <th>Patient</th>
                <th>Plan</th>
                <th>Drug</th>
                <th className="t-num" style={{ textAlign: "right" }}>Billed</th>
                <th className="t-num" style={{ textAlign: "right" }}>Paid</th>
                <th>Status / Reason</th>
                <th>Submitted</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => c.rxNumber && router.push(`/prescriptions?q=${encodeURIComponent(c.rxNumber)}`)}
                >
                  <td className="bnds-mono" style={{ fontSize: 12, color: "var(--bnds-forest)", fontWeight: 500 }}>
                    {c.claimNumber}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {c.patient}
                    {c.rxNumber && <div className="t-xs">Rx {c.rxNumber}</div>}
                  </td>
                  <td className="t-xs">{c.plan}</td>
                  <td className="t-xs">{c.drug}</td>
                  <td className="t-num" style={{ textAlign: "right" }}>
                    ${c.billed.toFixed(2)}
                  </td>
                  <td
                    className="t-num"
                    style={{
                      textAlign: "right",
                      fontWeight: 500,
                      color: c.paid > 0 ? "var(--ok)" : "var(--ink-4)",
                    }}
                  >
                    ${c.paid.toFixed(2)}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StatusPill tone={TONE[c.status]} label={LBL[c.status]} />
                      {c.codeLabel !== "—" && <span className="t-xs">{c.codeLabel}</span>}
                    </div>
                  </td>
                  <td className="t-xs">{c.submitted}</td>
                  <td>
                    <I.ChevR style={{ color: "var(--ink-4)" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          {page > 1 && (
            <button onClick={() => navigate({ page: page - 1 })} className="btn btn-secondary btn-sm">
              ← Prev
            </button>
          )}
          <span className="t-xs" style={{ color: "var(--ink-3)", alignSelf: "center" }}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <button onClick={() => navigate({ page: page + 1 })} className="btn btn-secondary btn-sm">
              Next →
            </button>
          )}
        </div>
      )}
    </DesignPage>
  );
}
