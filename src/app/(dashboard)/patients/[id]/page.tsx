"use client";

import * as React from "react";
import { DesignPage, I } from "@/components/design";

// ── Mock patient (mirrors design-reference/screens/patient.jsx) ──
const PATIENT = {
  initials: "JH",
  name: "James L. Hebert",
  dob: "03/14/1958",
  age: 68,
  mrn: "B-04881",
  phone: "(337) 555-0142",
  email: "jh@example.com",
  status: "Active",
  allergy: "Sulfa",
  insurance: ["Medicare Part D", "BCBS LA · supplemental"],
  rxPcn: "CTRX",
};

interface MedRow {
  drug: string;
  sig: string;
  since: string;
  status: "active" | "completed";
  lastFill: string;
  rfRemaining: number;
}

const MEDS: MedRow[] = [
  { drug: "Lisinopril 10mg", sig: "1 tab daily", since: "2019", status: "active", lastFill: "Apr 12, 2026", rfRemaining: 5 },
  { drug: "Metformin 500mg", sig: "1 tab BID w/ food", since: "2017", status: "active", lastFill: "Apr 04, 2026", rfRemaining: 3 },
  { drug: "Atorvastatin 20mg", sig: "1 tab QHS", since: "2020", status: "active", lastFill: "Mar 28, 2026", rfRemaining: 2 },
  { drug: "Amoxicillin 500mg", sig: "1 cap TID × 7d", since: "2024", status: "completed", lastFill: "Aug 11, 2024", rfRemaining: 0 },
];

type TabKey = "rx" | "history" | "clinical" | "insurance" | "notes";

export default function PatientProfilePage() {
  const [tab, setTab] = React.useState<TabKey>("rx");

  return (
    <DesignPage dense>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "calc(100vh - 56px)" }}>
        {/* Patient header */}
        <div style={{ padding: "20px 24px", background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <div
              className="bnds-serif"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--bnds-forest)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 500,
              }}
            >
              {PATIENT.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 className="bnds-serif" style={{ fontSize: 26, fontWeight: 500, color: "var(--ink)" }}>
                  {PATIENT.name}
                </h1>
                <span className="pill pill-leaf">
                  <span className="dot dot-ok" /> {PATIENT.status}
                </span>
                <span className="pill pill-warn">
                  <I.Alert className="ic-sm" /> Allergy: {PATIENT.allergy}
                </span>
              </div>
              <div style={{ display: "flex", gap: 22, marginTop: 6, fontSize: 13, color: "var(--ink-2)", flexWrap: "wrap" }}>
                <span>
                  DOB <strong>{PATIENT.dob}</strong> ({PATIENT.age})
                </span>
                <span>
                  MRN <span className="bnds-mono">{PATIENT.mrn}</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <I.Phone className="ic-sm" /> {PATIENT.phone}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <I.Mail className="ic-sm" /> {PATIENT.email}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                {PATIENT.insurance.map((ins) => (
                  <span key={ins} className="pill">
                    {ins}
                  </span>
                ))}
                <span className="pill pill-mute">
                  RxPCN <span className="bnds-mono">{PATIENT.rxPcn}</span>
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm">
                <I.Phone className="ic-sm" /> Call
              </button>
              <button className="btn btn-secondary btn-sm">
                <I.Mail className="ic-sm" /> Message
              </button>
              <button className="btn btn-primary btn-sm">
                <I.Plus /> New Rx
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, padding: "0 24px", background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
          {(
            [
              { id: "rx" as TabKey, l: "Medications", n: MEDS.filter((m) => m.status === "active").length },
              { id: "history" as TabKey, l: "Fill history" },
              { id: "clinical" as TabKey, l: "Clinical" },
              { id: "insurance" as TabKey, l: "Insurance" },
              { id: "notes" as TabKey, l: "Notes" },
            ] as Array<{ id: TabKey; l: string; n?: number }>
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: "none",
                border: 0,
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 500,
                color: tab === t.id ? "var(--ink)" : "var(--ink-3)",
                borderBottom: tab === t.id ? "2px solid var(--bnds-forest)" : "2px solid transparent",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: -1,
                fontFamily: "inherit",
              }}
            >
              {t.l}
              {t.n != null && (
                <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: "var(--paper-2)", color: "var(--ink-3)" }}>
                  {t.n}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: 24, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          {/* Med list */}
          <div className="card">
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Active medications</div>
              <button className="btn btn-ghost btn-sm">
                <I.Plus /> Add
              </button>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Sig</th>
                  <th>Status</th>
                  <th>Last fill</th>
                  <th>Refills</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {MEDS.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>
                      {m.drug}
                      <div className="t-xs">since {m.since}</div>
                    </td>
                    <td className="t-xs" style={{ color: "var(--ink-2)" }}>
                      {m.sig}
                    </td>
                    <td>
                      {m.status === "active" ? (
                        <span className="pill pill-leaf">
                          <span className="dot dot-ok" /> Active
                        </span>
                      ) : (
                        <span className="pill pill-mute">Done</span>
                      )}
                    </td>
                    <td className="t-xs">{m.lastFill}</td>
                    <td>
                      <div style={{ display: "flex", gap: 3 }}>
                        {Array.from({ length: 5 }).map((_, k) => (
                          <span
                            key={k}
                            style={{
                              width: 6,
                              height: 16,
                              borderRadius: 2,
                              background: k < m.rfRemaining ? "var(--bnds-forest)" : "var(--line-2)",
                            }}
                          />
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm">
                        Refill <I.ChevR className="ic-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right rail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Clinical highlights</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <Row label="Conditions" value="HTN · T2DM · Hyperlipidemia" />
                <Row label="Allergies" value="Sulfa (rash)" valueStyle={{ color: "var(--danger)", fontWeight: 500 }} />
                <Row label="Last A1c" value="6.8% · Mar 2026" />
                <Row label="BP avg (90d)" value="132 / 84" />
              </div>
            </div>

            <div
              className="card"
              style={{ padding: 16, background: "var(--bnds-leaf-100)", borderColor: "rgba(90,168,69,0.3)" }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--bnds-forest-900)" }}>Adherence</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                <div className="bnds-serif t-num" style={{ fontSize: 36, fontWeight: 500, color: "var(--bnds-forest)" }}>
                  92%
                </div>
                <span className="pill pill-leaf">+4% vs last quarter</span>
              </div>
              <div className="t-xs" style={{ marginTop: 4, color: "var(--bnds-forest-900)", opacity: 0.8 }}>
                PDC across 3 chronic meds, last 90 days
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Recent activity</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                {[
                  { when: "Today 9:42 AM", what: "RX-7741 received from Dr. Comeaux" },
                  { when: "Apr 12", what: "Lisinopril 10mg — picked up" },
                  { when: "Apr 04", what: "Metformin 500mg — picked up" },
                  { when: "Mar 28", what: "Atorvastatin 20mg — delivered" },
                ].map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 999, background: "var(--bnds-leaf)", marginTop: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--ink)" }}>{a.what}</div>
                      <div className="t-xs">{a.when}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DesignPage>
  );
}

function Row({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--ink)", textAlign: "right", ...valueStyle }}>{value}</span>
    </div>
  );
}
