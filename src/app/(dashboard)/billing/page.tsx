"use client";

import * as React from "react";
import { DesignPage, I, StatusPill, Toolbar } from "@/components/design";

// ── Mock invoices (mirrors design-reference/screens/financial.jsx Billing) ──
type InvStatus = "paid" | "unpaid" | "partial" | "overdue";

interface Invoice {
  id: string;
  patient: string;
  date: string;
  amount: number;
  paid: number;
  status: InvStatus;
  age: string;
  method: string;
}

const INVOICES: Invoice[] = [
  { id: "INV-8842", patient: "Pierre Boudreaux", date: "04/26/26", amount: 142.5, paid: 0, status: "unpaid", age: "1d", method: "—" },
  { id: "INV-8841", patient: "James Hebert", date: "04/26/26", amount: 14.2, paid: 14.2, status: "paid", age: "1d", method: "Card" },
  { id: "INV-8840", patient: "Yvette Robichaux", date: "04/25/26", amount: 86.0, paid: 0, status: "unpaid", age: "2d", method: "—" },
  { id: "INV-8839", patient: "Marie Comeaux", date: "04/25/26", amount: 12.0, paid: 12.0, status: "paid", age: "2d", method: "HSA" },
  { id: "INV-8838", patient: "Beau Thibodeaux", date: "04/22/26", amount: 28.0, paid: 28.0, status: "paid", age: "5d", method: "Card" },
  { id: "INV-8837", patient: "Annette LeBlanc", date: "04/20/26", amount: 188.4, paid: 50.0, status: "partial", age: "7d", method: "Charge" },
  { id: "INV-8836", patient: "Marcus Guidry", date: "04/05/26", amount: 64.0, paid: 0, status: "overdue", age: "22d", method: "—" },
  { id: "INV-8835", patient: "Camille Fontenot", date: "03/24/26", amount: 22.0, paid: 0, status: "overdue", age: "34d", method: "—" },
];

const TABS = [
  { id: "outstanding", label: "Outstanding", count: 42 },
  { id: "paid", label: "Paid", count: 312 },
  { id: "overdue", label: "Overdue", count: 3 },
  { id: "all", label: "All" },
];

const TONE: Record<InvStatus, "ok" | "mute" | "warn" | "danger"> = {
  paid: "ok",
  unpaid: "mute",
  partial: "warn",
  overdue: "danger",
};

const LBL: Record<InvStatus, string> = {
  paid: "Paid",
  unpaid: "Unpaid",
  partial: "Partial",
  overdue: "Overdue",
};

export default function BillingPage() {
  const [tab, setTab] = React.useState("outstanding");
  const [search, setSearch] = React.useState("");

  return (
    <DesignPage
      sublabel="Financial"
      title="Billing"
      subtitle="$8,412 outstanding · 3 invoices > 30 days"
      actions={
        <>
          <a href="/billing/claims" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Insurance claims
          </a>
          <button className="btn btn-secondary btn-sm">
            <I.Send className="ic-sm" /> Send statements
          </button>
          <button className="btn btn-secondary btn-sm">
            <I.Download className="ic-sm" /> Export
          </button>
          <button className="btn btn-primary btn-sm">
            <I.Plus /> New invoice
          </button>
        </>
      }
    >
      <Toolbar
        tabs={TABS}
        active={tab}
        onChange={setTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoice #, patient…"
        filters={[
          { label: "Date", value: "Last 30d" },
          { label: "Method", icon: I.Card },
        ]}
      />

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Patient</th>
              <th>Date</th>
              <th className="t-num" style={{ textAlign: "right" }}>
                Amount
              </th>
              <th className="t-num" style={{ textAlign: "right" }}>
                Paid
              </th>
              <th className="t-num" style={{ textAlign: "right" }}>
                Balance
              </th>
              <th>Age</th>
              <th>Method</th>
              <th>Status</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((i) => {
              const balance = i.amount - i.paid;
              const aged = i.age.includes("d") && parseInt(i.age, 10) > 14;
              return (
                <tr key={i.id} style={{ cursor: "pointer" }}>
                  <td className="bnds-mono" style={{ fontSize: 12, color: "var(--bnds-forest)", fontWeight: 500 }}>
                    {i.id}
                  </td>
                  <td style={{ fontWeight: 500 }}>{i.patient}</td>
                  <td className="t-xs">{i.date}</td>
                  <td className="t-num" style={{ textAlign: "right", fontWeight: 500 }}>
                    ${i.amount.toFixed(2)}
                  </td>
                  <td className="t-num" style={{ textAlign: "right", color: "var(--ink-3)" }}>
                    ${i.paid.toFixed(2)}
                  </td>
                  <td
                    className="t-num"
                    style={{
                      textAlign: "right",
                      fontWeight: 500,
                      color: balance > 0 ? "var(--ink)" : "var(--ink-4)",
                    }}
                  >
                    ${balance.toFixed(2)}
                  </td>
                  <td className="t-xs" style={{ color: aged ? "var(--danger)" : "var(--ink-3)" }}>
                    {i.age}
                  </td>
                  <td className="t-xs">{i.method}</td>
                  <td>
                    <StatusPill tone={TONE[i.status]} label={LBL[i.status]} />
                  </td>
                  <td>
                    <I.ChevR style={{ color: "var(--ink-4)" }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DesignPage>
  );
}
