"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DesignPage, I, KPI, StatusPill, Toolbar } from "@/components/design";

export interface BillingPaymentRow {
  id: string;
  referenceNumber: string;
  patient: string;
  rxNumber: string | null;
  amount: number;
  method: string;
  status: "completed" | "pending" | "failed" | "refunded";
  processedAt: string;
  processor: string | null;
}

interface BillingStats {
  pendingClaims: number;
  rejectedClaims: number;
  paymentsMtd: number;       // sum
  paymentCountMtd: number;   // count
  outstandingAR: number;     // sum of submitted/pending claim billed
}

const TONE: Record<BillingPaymentRow["status"], "ok" | "warn" | "danger" | "mute"> = {
  completed: "ok",
  pending: "warn",
  failed: "danger",
  refunded: "mute",
};
const LBL: Record<BillingPaymentRow["status"], string> = {
  completed: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

interface Props {
  rows: BillingPaymentRow[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  stats: BillingStats;
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function BillingClient({ rows, total, page, totalPages, search: initialSearch, stats }: Props) {
  const router = useRouter();
  const [searchInput, setSearchInput] = React.useState(initialSearch);

  const submitSearch = (q: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/billing${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <DesignPage
      sublabel="Financial"
      title="Billing"
      subtitle={`${stats.paymentCountMtd.toLocaleString()} payments this month · ${fmtMoney(
        stats.outstandingAR
      )} outstanding AR`}
      actions={
        <>
          <a href="/insurance" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Insurance claims
          </a>
          <a href="/billing/reconciliation" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Reconciliation
          </a>
          <a href="/billing/dir-fees" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            DIR fees
          </a>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label="Payments MTD" value={fmtMoney(stats.paymentsMtd)} hint={`${stats.paymentCountMtd} txns`} tone="ok" />
        <KPI label="Outstanding AR" value={fmtMoney(stats.outstandingAR)} hint="Submitted + pending claims" tone="info" />
        <KPI label="Pending claims" value={stats.pendingClaims.toLocaleString()} hint="Waiting on payer" tone="info" />
        <KPI
          label="Rejected claims"
          value={stats.rejectedClaims.toLocaleString()}
          hint="Need re-submit"
          tone={stats.rejectedClaims > 0 ? "warn" : "ok"}
        />
      </div>

      <Toolbar
        search={searchInput}
        onSearchChange={(v) => setSearchInput(v)}
        searchPlaceholder="Search payment ref, patient name, Rx#…"
      />

      <div className="card" style={{ overflow: "hidden", marginTop: 12 }}>
        {rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            {initialSearch ? `No payments matching "${initialSearch}".` : "No payments recorded."}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Patient</th>
                <th>Method</th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  Amount
                </th>
                <th>Status</th>
                <th>Processed</th>
                <th>Cashier</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    p.rxNumber && router.push(`/prescriptions?q=${encodeURIComponent(p.rxNumber)}`)
                  }
                >
                  <td className="bnds-mono" style={{ fontSize: 12, color: "var(--bnds-forest)", fontWeight: 500 }}>
                    {p.referenceNumber}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {p.patient}
                    {p.rxNumber && <div className="t-xs">Rx {p.rxNumber}</div>}
                  </td>
                  <td className="t-xs">{p.method}</td>
                  <td className="t-num" style={{ textAlign: "right", fontWeight: 500 }}>
                    {fmtMoney(p.amount)}
                  </td>
                  <td>
                    <StatusPill tone={TONE[p.status]} label={LBL[p.status]} />
                  </td>
                  <td className="t-xs">{p.processedAt}</td>
                  <td className="t-xs">{p.processor ?? "—"}</td>
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
          <span className="t-xs" style={{ color: "var(--ink-3)", alignSelf: "center" }}>
            Page {page} of {totalPages} · {total.toLocaleString()} total
          </span>
        </div>
      )}
    </DesignPage>
  );
}
