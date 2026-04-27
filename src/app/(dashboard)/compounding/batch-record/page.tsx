"use client";

import * as React from "react";
import { DesignPage, I, StatusPill, Toolbar } from "@/components/design";

// ── Mock batch records (mirrors design-reference/screens/dispensing.jsx BatchRecords) ──
type BatchStatus = "released" | "qc" | "recalled";

interface Batch {
  id: string;
  formula: string;
  qty: number;
  lot: string;
  expires: string;
  made: string;
  pharmacist: string;
  qc: string;
  status: BatchStatus;
}

const BATCHES: Batch[] = [
  { id: "BR-2026-0412", formula: "Progesterone 100mg caps", qty: 60, lot: "PG2026-0412", expires: "10/2026", made: "Today 11:42", pharmacist: "Marie B.", qc: "Sara C.", status: "released" },
  { id: "BR-2026-0411", formula: "BLT topical", qty: 30, lot: "BL2026-0411", expires: "07/2026", made: "Today 09:18", pharmacist: "Marie B.", qc: "Sara C.", status: "released" },
  { id: "BR-2026-0410", formula: "Sildenafil 20mg troches", qty: 30, lot: "SD2026-0410", expires: "10/2026", made: "Today 08:04", pharmacist: "David L.", qc: "—", status: "qc" },
  { id: "BR-2026-0409", formula: "Estradiol 0.1mg/g cream", qty: 30, lot: "ES2026-0409", expires: "07/2026", made: "Yesterday 16:22", pharmacist: "Marie B.", qc: "Sara C.", status: "released" },
  { id: "BR-2026-0408", formula: "Magic mouthwash", qty: 480, lot: "MM2026-0408", expires: "05/2026", made: "Yesterday 14:10", pharmacist: "David L.", qc: "Marie B.", status: "released" },
  { id: "BR-2026-0407", formula: "Tacrolimus 0.03% ointment", qty: 30, lot: "TC2026-0407", expires: "10/2026", made: "Apr 24", pharmacist: "Marie B.", qc: "Sara C.", status: "released" },
  { id: "BR-2026-0406", formula: "BLT topical", qty: 60, lot: "BL2026-0406", expires: "07/2026", made: "Apr 24", pharmacist: "David L.", qc: "—", status: "recalled" },
];

const TABS = [
  { id: "all", label: "All", count: 1842 },
  { id: "released", label: "Released" },
  { id: "qc", label: "In QC", count: 2 },
  { id: "recalled", label: "Recalled", count: 1 },
];

const TONE: Record<BatchStatus, "ok" | "warn" | "danger"> = {
  released: "ok",
  qc: "warn",
  recalled: "danger",
};

const LBL: Record<BatchStatus, string> = {
  released: "Released",
  qc: "In QC",
  recalled: "Recalled",
};

export default function BatchRecordsPage() {
  const [tab, setTab] = React.useState("all");
  const [search, setSearch] = React.useState("");

  return (
    <DesignPage
      sublabel="Dispensing · Compounding"
      title="Batch Records"
      subtitle="USP 795/797 compliant · 7-year retention"
      actions={
        <>
          <a href="/compounding" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Back to compounding
          </a>
          <button className="btn btn-secondary btn-sm">
            <I.Download className="ic-sm" /> Export CSV
          </button>
          <button className="btn btn-secondary btn-sm">
            <I.Print className="ic-sm" /> Print log
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
        searchPlaceholder="Search by lot #, formula, pharmacist…"
        filters={[
          { label: "Date", value: "Last 30d" },
          { label: "Pharmacist" },
        ]}
      />

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Formula</th>
              <th className="t-num" style={{ textAlign: "right" }}>
                Qty
              </th>
              <th>Lot</th>
              <th>Expires</th>
              <th>Made</th>
              <th>Pharmacist</th>
              <th>QC</th>
              <th>Status</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {BATCHES.map((b) => (
              <tr key={b.id} style={{ cursor: "pointer" }}>
                <td className="bnds-mono" style={{ fontSize: 12, color: "var(--bnds-forest)", fontWeight: 500 }}>
                  {b.id}
                </td>
                <td style={{ fontWeight: 500 }}>{b.formula}</td>
                <td className="t-num" style={{ textAlign: "right" }}>
                  {b.qty}
                </td>
                <td className="t-xs bnds-mono">{b.lot}</td>
                <td className="t-xs">{b.expires}</td>
                <td className="t-xs">{b.made}</td>
                <td className="t-xs">{b.pharmacist}</td>
                <td className="t-xs" style={{ color: b.qc === "—" ? "var(--ink-4)" : "var(--ink-2)" }}>
                  {b.qc}
                </td>
                <td>
                  <StatusPill tone={TONE[b.status]} label={LBL[b.status]} />
                </td>
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
