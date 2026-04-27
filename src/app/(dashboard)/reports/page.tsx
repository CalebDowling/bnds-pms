"use client";

import * as React from "react";
import { DesignPage, I, KPI, Toolbar } from "@/components/design";

// ── Mock Reports (mirrors design-reference/screens/insights.jsx Reports) ──

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "fills", label: "Fills" },
  { id: "revenue", label: "Revenue" },
  { id: "inventory", label: "Inventory" },
  { id: "staff", label: "Staff" },
  { id: "compliance", label: "Compliance" },
];

const TOP_DRUGS = [
  { n: "Lisinopril 10mg", c: 184, color: "var(--bnds-forest)" },
  { n: "Atorvastatin 20mg", c: 142, color: "var(--bnds-leaf)" },
  { n: "Metformin 500mg", c: 128, color: "#7ab85f" },
  { n: "Levothyroxine 50mcg", c: 102, color: "var(--info)" },
  { n: "Amoxicillin 500mg", c: 86, color: "var(--warn)" },
  { n: "Sertraline 50mg", c: 74, color: "#d97a2a" },
];

const REVENUE_MIX = [
  { l: "Insurance reimb.", v: "$114,212", color: "var(--bnds-forest)" },
  { l: "Cash / OTC", v: "$40,520", color: "var(--bnds-leaf)" },
  { l: "Compounding", v: "$20,180", color: "var(--info)" },
  { l: "DME / Other", v: "$9,300", color: "var(--warn)" },
];

export default function ReportsPage() {
  const [tab, setTab] = React.useState("overview");

  return (
    <DesignPage
      sublabel="Insights"
      title="Reports"
      subtitle="April 2026 · Main St + 2 satellites"
      actions={
        <>
          <button className="btn btn-secondary btn-sm">Apr 2026 ▾</button>
          <button className="btn btn-secondary btn-sm">
            <I.Download className="ic-sm" /> Export PDF
          </button>
          <button className="btn btn-secondary btn-sm">
            <I.Print className="ic-sm" />
          </button>
        </>
      }
    >
      <Toolbar tabs={TABS} active={tab} onChange={setTab} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label="Fills MTD" value="2,184" trend={{ dir: "up", label: "+8.2% vs Mar" }} tone="forest" />
        <KPI label="Revenue MTD" value="$184,212" trend={{ dir: "up", label: "+5.4%" }} tone="ok" />
        <KPI label="Avg fill time" value="14.2 min" trend={{ dir: "up", label: "−1.8 min" }} tone="ok" />
        <KPI label="Patient sat (CSAT)" value="4.78" hint="118 surveys" tone="info" />
      </div>

      {/* Big chart */}
      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div className="t-eyebrow">Fills · daily</div>
            <h3 className="bnds-serif" style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>
              2,184 fills this month
            </h3>
            <div className="t-xs" style={{ marginTop: 2 }}>
              Avg 73/day · peak 112 (Apr 14)
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, background: "var(--bnds-forest)", borderRadius: 2 }} /> New
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, background: "var(--bnds-leaf)", borderRadius: 2 }} /> Refill
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, background: "var(--info)", borderRadius: 2 }} /> Transfer
            </div>
          </div>
        </div>
        {/* Stacked bar chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 220, paddingTop: 8 }}>
          {Array.from({ length: 26 }).map((_, i) => {
            const seed = (i * 7 + 13) % 9;
            const total = 50 + seed * 8 + (i % 5 === 0 ? 30 : 0);
            const newR = total * 0.25;
            const ref = total * 0.6;
            const tr = total - newR - ref;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 0,
                  height: "100%",
                }}
              >
                <div style={{ width: "100%", display: "flex", flexDirection: "column", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: newR, background: "var(--bnds-forest)" }} />
                  <div style={{ height: ref, background: "var(--bnds-leaf)" }} />
                  <div style={{ height: tr, background: "var(--info)" }} />
                </div>
                {i % 5 === 0 && (
                  <div className="t-xs" style={{ marginTop: 6, fontSize: 10, color: "var(--ink-4)" }}>
                    Apr {i + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top drugs */}
        <div className="card" style={{ padding: 18 }}>
          <div className="t-eyebrow">Top drugs by fills</div>
          {TOP_DRUGS.map((d) => (
            <div key={d.n} style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{d.n}</span>
                <span className="t-num" style={{ fontWeight: 500 }}>
                  {d.c}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--paper-2)", marginTop: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(d.c / 184) * 100}%`, background: d.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Revenue breakdown */}
        <div className="card" style={{ padding: 18 }}>
          <div className="t-eyebrow">Revenue mix</div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 14 }}>
            {/* Donut */}
            <svg width="140" height="140" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.91" fill="transparent" stroke="var(--paper-2)" strokeWidth="6" />
              <circle
                cx="21"
                cy="21"
                r="15.91"
                fill="transparent"
                stroke="var(--bnds-forest)"
                strokeWidth="6"
                strokeDasharray="62 38"
                strokeDashoffset="25"
                transform="rotate(-90 21 21)"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91"
                fill="transparent"
                stroke="var(--bnds-leaf)"
                strokeWidth="6"
                strokeDasharray="22 78"
                strokeDashoffset="-37"
                transform="rotate(-90 21 21)"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91"
                fill="transparent"
                stroke="var(--info)"
                strokeWidth="6"
                strokeDasharray="11 89"
                strokeDashoffset="-59"
                transform="rotate(-90 21 21)"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91"
                fill="transparent"
                stroke="var(--warn)"
                strokeWidth="6"
                strokeDasharray="5 95"
                strokeDashoffset="-70"
                transform="rotate(-90 21 21)"
              />
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {REVENUE_MIX.map((r) => (
                <div key={r.l} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />
                  <span style={{ flex: 1 }}>{r.l}</span>
                  <span className="t-num" style={{ fontWeight: 500 }}>
                    {r.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DesignPage>
  );
}
