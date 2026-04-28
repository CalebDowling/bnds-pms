"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DesignPage, I, StatusPill, Toolbar } from "@/components/design";

export interface PosTxRow {
  id: string;
  date: string;
  patient: string;
  type: string;
  items: number;
  total: number;
  payment: string;
  cardLast4: string | null;
  cashier: string;
}

export interface PosSessionRow {
  id: string;
  openedAt: string;
  closedAt: string | null;
  opener: string;
  closer: string | null;
  txCount: number;
  status: "open" | "closed";
}

interface Props {
  txRows: PosTxRow[];
  sessionRows: PosSessionRow[];
  txTotal: number;
  txPage: number;
  txTotalPages: number;
  search: string;
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function PosHistoryClient({
  txRows,
  sessionRows,
  txTotal,
  txPage,
  txTotalPages,
  search: initialSearch,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"transactions" | "sessions">("transactions");
  const [searchInput, setSearchInput] = React.useState(initialSearch);

  const TABS = [
    { id: "transactions", label: "Transactions", count: txTotal },
    { id: "sessions", label: "Sessions", count: sessionRows.length },
  ];

  return (
    <DesignPage
      sublabel="Operations · POS"
      title="Sales history"
      subtitle="Real transactions and drawer sessions"
      actions={
        <a href="/pos" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
          <I.Card className="ic-sm" /> Active register
        </a>
      }
    >
      <Toolbar
        tabs={TABS}
        active={tab}
        onChange={(t) => setTab(t as typeof tab)}
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search by patient, card last 4…"
      />

      {tab === "transactions" && (
        <div className="card" style={{ overflow: "hidden", marginTop: 12 }}>
          {txRows.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              {initialSearch ? `No transactions matching "${initialSearch}".` : "No transactions recorded."}
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Tx</th>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th className="t-num" style={{ textAlign: "right" }}>Items</th>
                  <th className="t-num" style={{ textAlign: "right" }}>Total</th>
                  <th>Payment</th>
                  <th>Cashier</th>
                </tr>
              </thead>
              <tbody>
                {txRows.map((t) => (
                  <tr key={t.id}>
                    <td className="bnds-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{t.id}</td>
                    <td className="t-xs">{t.date}</td>
                    <td style={{ fontWeight: 500 }}>{t.patient}</td>
                    <td className="t-xs">{t.type}</td>
                    <td className="t-num" style={{ textAlign: "right" }}>{t.items}</td>
                    <td className="t-num" style={{ textAlign: "right", fontWeight: 500 }}>{fmtMoney(t.total)}</td>
                    <td className="t-xs">
                      {t.payment}
                      {t.cardLast4 && <span style={{ color: "var(--ink-3)" }}> ••{t.cardLast4}</span>}
                    </td>
                    <td className="t-xs">{t.cashier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "sessions" && (
        <div className="card" style={{ overflow: "hidden", marginTop: 12 }}>
          {sessionRows.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              No drawer sessions yet.
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Opened</th>
                  <th>Closed</th>
                  <th>Opener</th>
                  <th>Closer</th>
                  <th className="t-num" style={{ textAlign: "right" }}>Tx count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.map((s) => (
                  <tr key={s.id}>
                    <td className="bnds-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.id}</td>
                    <td className="t-xs">{s.openedAt}</td>
                    <td className="t-xs">{s.closedAt ?? "—"}</td>
                    <td className="t-xs">{s.opener}</td>
                    <td className="t-xs">{s.closer ?? "—"}</td>
                    <td className="t-num" style={{ textAlign: "right" }}>{s.txCount}</td>
                    <td>
                      <StatusPill
                        tone={s.status === "open" ? "info" : "ok"}
                        label={s.status === "open" ? "Open" : "Closed"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </DesignPage>
  );
}
