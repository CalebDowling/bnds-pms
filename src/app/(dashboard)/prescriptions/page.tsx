"use client";

import * as React from "react";
import { DesignPage, I, StatusPill, Toolbar } from "@/components/design";

// ── Mock prescriptions (mirrors design-reference/screens/lists.jsx PrescriptionsList) ──
type RxStatus = "active" | "completed" | "transferred" | "expired";

interface RxRow {
  id: string;
  drug: string;
  qty: number;
  days: number;
  refills: string;
  patient: string;
  prescriber: string;
  filled: string;
  status: RxStatus;
}

const RXS: RxRow[] = [
  { id: "RX-77412", drug: "Atorvastatin 20mg", qty: 30, days: 30, refills: "3 of 5", patient: "James Hebert", prescriber: "Dr. Landry", filled: "04/26/26", status: "active" },
  { id: "RX-77389", drug: "Lisinopril 10mg", qty: 90, days: 90, refills: "4 of 5", patient: "Marie Comeaux", prescriber: "Dr. Landry", filled: "04/22/26", status: "active" },
  { id: "RX-77356", drug: "Metformin HCl 500mg", qty: 60, days: 30, refills: "2 of 11", patient: "Pierre Boudreaux", prescriber: "Dr. Hebert", filled: "04/19/26", status: "active" },
  { id: "RX-77301", drug: "Amoxicillin 500mg", qty: 21, days: 7, refills: "None", patient: "Camille Fontenot", prescriber: "Dr. Landry", filled: "04/14/26", status: "completed" },
  { id: "RX-77287", drug: "Oxycodone 5mg · C-II", qty: 30, days: 15, refills: "None", patient: "Beau Thibodeaux", prescriber: "Dr. Mouton", filled: "04/12/26", status: "active" },
  { id: "RX-77244", drug: "Levothyroxine 50mcg", qty: 90, days: 90, refills: "5 of 5", patient: "Annette LeBlanc", prescriber: "Dr. Hebert", filled: "04/08/26", status: "active" },
  { id: "RX-77198", drug: "Ozempic 0.5mg pen", qty: 1, days: 28, refills: "0 of 3", patient: "Yvette Robichaux", prescriber: "Dr. Landry", filled: "04/04/26", status: "transferred" },
  { id: "RX-77150", drug: "Sertraline 50mg", qty: 30, days: 30, refills: "1 of 5", patient: "Marcus Guidry", prescriber: "Dr. Mouton", filled: "03/30/26", status: "active" },
  { id: "RX-77103", drug: "Albuterol HFA inhaler", qty: 1, days: 30, refills: "2 of 5", patient: "Theo Doucet", prescriber: "Dr. Hebert", filled: "03/24/26", status: "expired" },
];

const STATUS_TONE: Record<RxStatus, "ok" | "mute" | "info" | "warn"> = {
  active: "ok",
  completed: "mute",
  transferred: "info",
  expired: "warn",
};
const STATUS_LABEL: Record<RxStatus, string> = {
  active: "Active",
  completed: "Completed",
  transferred: "Transferred",
  expired: "Expired",
};

const TABS = [
  { id: "active", label: "Active", count: 1024 },
  { id: "completed", label: "Completed", count: 412 },
  { id: "transferred", label: "Transferred" },
  { id: "expired", label: "Expired", count: 88 },
  { id: "all", label: "All" },
];

export default function PrescriptionsListPage() {
  const [tab, setTab] = React.useState("active");
  const [search, setSearch] = React.useState("");
  const [sel, setSel] = React.useState<string | null>(null);

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
          <button className="btn btn-secondary btn-sm">Open Workflow Queue →</button>
          <button className="btn btn-primary btn-sm">
            <I.Plus /> New Rx
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
              <th>Filled</th>
              <th>Status</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {RXS.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSel(r.id)}
                className={sel === r.id ? "selected" : ""}
                style={{ cursor: "pointer" }}
              >
                <td className="bnds-mono" style={{ fontSize: 12, fontWeight: 500, color: "var(--bnds-forest)" }}>
                  {r.id}
                </td>
                <td style={{ fontWeight: 500 }}>{r.drug}</td>
                <td>{r.patient}</td>
                <td className="t-xs">{r.prescriber}</td>
                <td className="t-num" style={{ textAlign: "right" }}>
                  {r.qty}
                </td>
                <td className="t-num" style={{ textAlign: "right" }}>
                  {r.days}
                </td>
                <td className="t-xs">{r.refills}</td>
                <td className="t-xs">{r.filled}</td>
                <td>
                  <StatusPill tone={STATUS_TONE[r.status]} label={STATUS_LABEL[r.status]} />
                </td>
                <td>
                  <I.ChevR style={{ color: "var(--ink-4)" }} />
                </td>
              </tr>
            ))}
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
          <div>Showing {RXS.length} of 1,524</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-sm">Prev</button>
            <button className="btn btn-secondary btn-sm">Next</button>
          </div>
        </div>
      </div>
    </DesignPage>
  );
}
