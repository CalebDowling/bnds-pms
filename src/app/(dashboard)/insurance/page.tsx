"use client";

import * as React from "react";
import { DesignPage, I, StatusPill, Toolbar } from "@/components/design";

// ── Mock claims (mirrors design-reference/screens/financial.jsx Insurance) ──
type ClaimStatus = "paid" | "rejected" | "pending" | "partial";

interface Claim {
  id: string;
  patient: string;
  plan: string;
  drug: string;
  billed: number;
  paid: number;
  status: ClaimStatus;
  code: string;
  submitted: string;
}

const CLAIMS: Claim[] = [
  { id: "CLM-44210", patient: "James Hebert", plan: "BCBS Louisiana", drug: "Atorvastatin 20mg", billed: 78.4, paid: 0, status: "rejected", code: "PA req", submitted: "04/26" },
  { id: "CLM-44209", patient: "Marie Comeaux", plan: "Medicare Pt D", drug: "Lisinopril 10mg", billed: 14.8, paid: 14.8, status: "paid", code: "—", submitted: "04/26" },
  { id: "CLM-44208", patient: "Yvette Robichaux", plan: "Medicare Pt D", drug: "Ozempic 0.5mg", billed: 932.0, paid: 0, status: "rejected", code: "NDC not covered", submitted: "04/26" },
  { id: "CLM-44207", patient: "Beau Thibodeaux", plan: "United HC", drug: "Oxycodone 5mg", billed: 32.0, paid: 0, status: "pending", code: "In review", submitted: "04/26" },
  { id: "CLM-44206", patient: "Pierre Boudreaux", plan: "Medicare Pt D", drug: "Metformin HCl", billed: 18.4, paid: 18.4, status: "paid", code: "—", submitted: "04/25" },
  { id: "CLM-44205", patient: "Annette LeBlanc", plan: "BCBS Louisiana", drug: "Levothyroxine", billed: 12.0, paid: 8.0, status: "partial", code: "Copay applied", submitted: "04/25" },
  { id: "CLM-44204", patient: "Camille Fontenot", plan: "Cash", drug: "Amoxicillin 500mg", billed: 22.0, paid: 0, status: "rejected", code: "No coverage", submitted: "04/24" },
  { id: "CLM-44203", patient: "Marcus Guidry", plan: "Cigna", drug: "Sertraline 50mg", billed: 18.0, paid: 18.0, status: "paid", code: "—", submitted: "04/24" },
];

const TABS = [
  { id: "rejected", label: "Need action", count: 3 },
  { id: "pending", label: "Pending", count: 1 },
  { id: "paid", label: "Paid", count: 412 },
  { id: "all", label: "All" },
];

const TONE: Record<ClaimStatus, "ok" | "danger" | "warn" | "info"> = {
  paid: "ok",
  rejected: "danger",
  pending: "warn",
  partial: "info",
};

const LBL: Record<ClaimStatus, string> = {
  paid: "Paid",
  rejected: "Rejected",
  pending: "Pending",
  partial: "Partial",
};

export default function InsurancePage() {
  const [tab, setTab] = React.useState("rejected");
  const [search, setSearch] = React.useState("");

  return (
    <DesignPage
      sublabel="Financial"
      title="Insurance"
      subtitle="3 claims need attention · 1 PA in progress"
      actions={
        <>
          <a href="/insurance/plans" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Plan formulary
          </a>
          <button className="btn btn-secondary btn-sm">
            <I.Refill className="ic-sm" /> Re-submit batch
          </button>
          <button className="btn btn-primary btn-sm">
            <I.Plus /> Submit claim
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
        searchPlaceholder="Search claim, patient, plan…"
        filters={[
          { label: "Plan" },
          { label: "Date", value: "Last 30d" },
        ]}
      />

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Claim #</th>
              <th>Patient</th>
              <th>Plan</th>
              <th>Drug</th>
              <th className="t-num" style={{ textAlign: "right" }}>
                Billed
              </th>
              <th className="t-num" style={{ textAlign: "right" }}>
                Paid
              </th>
              <th>Status / Reason</th>
              <th>Submitted</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {CLAIMS.map((c) => (
              <tr key={c.id} style={{ cursor: "pointer" }}>
                <td className="bnds-mono" style={{ fontSize: 12, color: "var(--bnds-forest)", fontWeight: 500 }}>
                  {c.id}
                </td>
                <td style={{ fontWeight: 500 }}>{c.patient}</td>
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
                    {c.code !== "—" && <span className="t-xs">{c.code}</span>}
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
      </div>
    </DesignPage>
  );
}
