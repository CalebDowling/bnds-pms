"use client";

import * as React from "react";
import { DesignPage, I, StatusPill, Toolbar } from "@/components/design";

// ── Mock compounding queue (mirrors design-reference/screens/dispensing.jsx Compounding) ──
type Priority = "high" | "normal";
type CmpStatus = "in-progress" | "queued" | "qc";

interface CompoundJob {
  id: string;
  formula: string;
  patient: string;
  qty: number;
  due: string;
  priority: Priority;
  status: CmpStatus;
}

interface Formula {
  name: string;
  cat: string;
  last: string;
  uses: number;
}

const QUEUE: CompoundJob[] = [
  { id: "CMP-0412", formula: "Progesterone 100mg capsules", patient: "Yvette Robichaux", qty: 60, due: "Today 4 PM", priority: "high", status: "in-progress" },
  { id: "CMP-0413", formula: "Ketoprofen 10% / Lidocaine cream", patient: "Marcus Guidry", qty: 60, due: "Tomorrow 12 PM", priority: "normal", status: "queued" },
  { id: "CMP-0414", formula: "Tacrolimus 0.03% ointment", patient: "Camille Fontenot", qty: 30, due: "Apr 28", priority: "normal", status: "queued" },
  { id: "CMP-0415", formula: "Estradiol 0.1mg/g vaginal cream", patient: "Annette LeBlanc", qty: 30, due: "Apr 28", priority: "normal", status: "queued" },
  { id: "CMP-0411", formula: "BLT topical (Benzo/Lido/Tetra)", patient: "Beau Thibodeaux", qty: 30, due: "Today 2 PM", priority: "high", status: "qc" },
  { id: "CMP-0410", formula: "Sildenafil 20mg troches", patient: "Pierre Boudreaux", qty: 30, due: "Today 5 PM", priority: "normal", status: "qc" },
];

const FORMULAS: Formula[] = [
  { name: "BLT topical (Benzo/Lido/Tetra)", cat: "Topical · pain", last: "2 days ago", uses: 142 },
  { name: "Progesterone 100mg capsules", cat: "HRT · oral", last: "Today", uses: 312 },
  { name: "Ketoprofen 10% / Lidocaine 5%", cat: "Topical · pain", last: "4 days ago", uses: 98 },
  { name: "Tacrolimus 0.03% ointment", cat: "Derm", last: "1 week ago", uses: 47 },
  { name: "Estradiol 0.1mg/g vaginal cream", cat: "HRT · topical", last: "3 days ago", uses: 86 },
  { name: "Magic mouthwash", cat: "Oral · rinse", last: "Today", uses: 204 },
];

const TABS = [
  { id: "queue", label: "Active queue", count: 6 },
  { id: "formulas", label: "Formulas", count: 38 },
  { id: "history", label: "History" },
  { id: "ingredients", label: "Ingredients" },
];

const STATUS_TONE: Record<CmpStatus, "info" | "mute" | "warn"> = {
  "in-progress": "info",
  queued: "mute",
  qc: "warn",
};

const STATUS_LABEL: Record<CmpStatus, string> = {
  "in-progress": "In progress",
  queued: "Queued",
  qc: "QC review",
};

export default function CompoundingPage() {
  const [tab, setTab] = React.useState("queue");

  return (
    <DesignPage
      sublabel="Dispensing"
      title="Compounding"
      subtitle="6 formulas in queue · 2 awaiting QC"
      actions={
        <>
          <button className="btn btn-secondary btn-sm">
            <I.Beaker className="ic-sm" /> Lab status
          </button>
          <a href="/compounding/batch-record" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Batch records
          </a>
          <button className="btn btn-primary btn-sm">
            <I.Plus /> New compound
          </button>
        </>
      }
    >
      <Toolbar
        tabs={TABS}
        active={tab}
        onChange={setTab}
        filters={[
          { label: "Category", value: "All" },
          { label: "Pharmacist" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 13.5 }}>
            Active queue
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Formula</th>
                <th>Patient</th>
                <th className="t-num" style={{ textAlign: "right" }}>
                  Qty
                </th>
                <th>Due</th>
                <th>Priority</th>
                <th>Status</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {QUEUE.map((q) => (
                <tr key={q.id} style={{ cursor: "pointer" }}>
                  <td className="bnds-mono" style={{ fontSize: 12, color: "var(--bnds-forest)" }}>
                    {q.id}
                  </td>
                  <td style={{ fontWeight: 500 }}>{q.formula}</td>
                  <td className="t-xs">{q.patient}</td>
                  <td className="t-num" style={{ textAlign: "right" }}>
                    {q.qty}
                  </td>
                  <td
                    className="t-xs"
                    style={{
                      color: q.due.startsWith("Today") ? "var(--warn)" : "var(--ink-3)",
                      fontWeight: q.due.startsWith("Today") ? 500 : 400,
                    }}
                  >
                    {q.due}
                  </td>
                  <td>
                    {q.priority === "high" ? (
                      <StatusPill tone="danger" label="High" />
                    ) : (
                      <span className="pill pill-mute">Normal</span>
                    )}
                  </td>
                  <td>
                    <StatusPill tone={STATUS_TONE[q.status]} label={STATUS_LABEL[q.status]} />
                  </td>
                  <td>
                    <I.ChevR style={{ color: "var(--ink-4)" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <div className="t-eyebrow">Most-used formulas</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>Quick start</div>
          </div>
          {FORMULAS.map((f) => (
            <div
              key={f.name}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: "var(--bnds-leaf-100)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--bnds-forest)",
                }}
              >
                <I.Beaker />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{f.name}</div>
                <div className="t-xs">
                  {f.cat} · last {f.last} · {f.uses} uses
                </div>
              </div>
              <button className="btn btn-ghost btn-sm">Use</button>
            </div>
          ))}
        </div>
      </div>
    </DesignPage>
  );
}
