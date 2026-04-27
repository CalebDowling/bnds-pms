"use client";

import * as React from "react";
import { DesignPage, I, Toolbar } from "@/components/design";

// ── Mock POS history (transactions + sessions archive view) ──
interface Tx {
  id: string;
  date: string;
  patient: string;
  type: string;
  items: number;
  total: number;
  payment: string;
  cardLast4?: string;
  cashier: string;
}

const TXS: Tx[] = [
  { id: "TX-1042", date: "Today 11:42 AM", patient: "James Hebert", type: "Rx + OTC", items: 4, total: 47.52, payment: "Card", cardLast4: "4012", cashier: "Sara Comeaux" },
  { id: "TX-1041", date: "Today 11:18 AM", patient: "Marie Comeaux", type: "Rx", items: 1, total: 0.0, payment: "Insurance", cashier: "Sara Comeaux" },
  { id: "TX-1040", date: "Today 10:55 AM", patient: "Walk-in", type: "OTC", items: 2, total: 18.4, payment: "Cash", cashier: "Sara Comeaux" },
  { id: "TX-1039", date: "Today 10:21 AM", patient: "Pierre Boudreaux", type: "Rx", items: 4, total: 0.0, payment: "Insurance", cashier: "Daniel H." },
  { id: "TX-1038", date: "Yesterday", patient: "Annette LeBlanc", type: "Rx + OTC", items: 3, total: 22.85, payment: "HSA", cardLast4: "8821", cashier: "Daniel H." },
];

const TABS = [
  { id: "transactions", label: "Transactions", count: 142 },
  { id: "sessions", label: "Sessions", count: 8 },
];

export default function PosHistoryPage() {
  const [tab, setTab] = React.useState("transactions");
  const [search, setSearch] = React.useState("");

  return (
    <DesignPage
      sublabel="Operations · POS"
      title="Sales history"
      subtitle="Transactions, sessions, and register management"
      actions={
        <>
          <button className="btn btn-secondary btn-sm">
            <I.Download className="ic-sm" /> Export
          </button>
          <a href="/pos" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
            <I.Card className="ic-sm" /> Active sale
          </a>
        </>
      }
    >
      <Toolbar
        tabs={TABS}
        active={tab}
        onChange={setTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by patient, Rx#, card last 4…"
        filters={[
          { label: "Date", value: "Today" },
          { label: "Cashier", value: "Any" },
          { label: "Payment", value: "All" },
        ]}
      />

      <div className="card" style={{ overflow: "hidden" }}>
        {tab === "transactions" ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Tx #</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Type</th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  Items
                </th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  Total
                </th>
                <th>Payment</th>
                <th>Cashier</th>
              </tr>
            </thead>
            <tbody>
              {TXS.map((t) => (
                <tr key={t.id}>
                  <td className="bnds-mono" style={{ fontSize: 12, color: "var(--bnds-forest)" }}>
                    {t.id}
                  </td>
                  <td className="t-xs">{t.date}</td>
                  <td style={{ fontWeight: 500 }}>{t.patient}</td>
                  <td className="t-xs">{t.type}</td>
                  <td className="t-num" style={{ textAlign: "right" }}>
                    {t.items}
                  </td>
                  <td className="t-num" style={{ textAlign: "right", fontWeight: 600 }}>
                    ${t.total.toFixed(2)}
                  </td>
                  <td>
                    {t.payment}
                    {t.cardLast4 && (
                      <span className="bnds-mono" style={{ marginLeft: 6, color: "var(--ink-3)" }}>
                        ····{t.cardLast4}
                      </span>
                    )}
                  </td>
                  <td className="t-xs">{t.cashier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 32, textAlign: "center" }}>
            <I.Receipt className="ic-lg" style={{ color: "var(--ink-4)" }} />
            <div style={{ marginTop: 8, fontWeight: 500, color: "var(--ink-2)" }}>No open sessions</div>
            <div className="t-xs" style={{ marginTop: 4 }}>
              Open a register from the active sale screen to start a session.
            </div>
          </div>
        )}
      </div>
    </DesignPage>
  );
}
