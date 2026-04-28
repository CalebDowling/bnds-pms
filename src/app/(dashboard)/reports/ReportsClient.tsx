"use client";

/**
 * Reports client shell.
 *
 * Receives a ReportsData blob from the server page (no client-side
 * data fetching) and renders the Overview tab. Other tabs link out
 * to existing dedicated pages.
 */
import * as React from "react";
import { DesignPage, I, KPI, Toolbar } from "@/components/design";

export interface ReportsData {
  monthLabel: string;
  kpis: {
    fillsMtd: number;
    fillsTrend: { dir: "up" | "down"; label: string } | null;
    revenueMtd: number;
    revenueTrend: { dir: "up" | "down"; label: string } | null;
    collectionRate: number;
    avgDaysToPay: number | null;
  };
  dailyFills: Array<{ date: string; fills: number }>;
  topDrugs: Array<{ name: string; count: number; color: string }>;
  revenueMix: Array<{ label: string; value: string; rawValue: number; color: string }>;
  inventory: {
    activeLots: number;
    lowStock: number;
    expiringSoon: number;
    expired: number;
  };
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "fills", label: "Fills" },
  { id: "revenue", label: "Revenue" },
  { id: "inventory", label: "Inventory" },
  { id: "compliance", label: "Compliance" },
];

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function ReportsClient({ data }: { data: ReportsData }) {
  const [tab, setTab] = React.useState("overview");

  // Daily fills chart scaling — find max for proportional heights.
  const maxFills = Math.max(...data.dailyFills.map((d) => d.fills), 1);
  const totalFillsThisMonth = data.kpis.fillsMtd;
  const peakDay = data.dailyFills.reduce(
    (best, d) => (d.fills > best.fills ? d : best),
    { date: "—", fills: 0 }
  );
  const avgPerDay = data.dailyFills.length
    ? Math.round(data.dailyFills.reduce((s, d) => s + d.fills, 0) / data.dailyFills.length)
    : 0;

  // Revenue mix donut math — turn rawValue into stroke-dasharray %.
  const revenueTotal = data.revenueMix.reduce((s, r) => s + r.rawValue, 0);

  return (
    <DesignPage
      sublabel="Insights"
      title="Reports"
      subtitle={`${data.monthLabel} · BNDS Pharmacy`}
      actions={
        <>
          <a href="/reports/builder" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            <I.Sparkle className="ic-sm" /> Custom report
          </a>
          <a href="/compliance/audit-reports" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            Compliance reports
          </a>
        </>
      }
    >
      <Toolbar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <KPI
              label="Fills MTD"
              value={data.kpis.fillsMtd.toLocaleString()}
              trend={data.kpis.fillsTrend ?? undefined}
              tone="forest"
            />
            <KPI
              label="Revenue MTD"
              value={fmtMoney(data.kpis.revenueMtd)}
              trend={data.kpis.revenueTrend ?? undefined}
              tone="ok"
            />
            <KPI
              label="Collection rate"
              value={`${data.kpis.collectionRate.toFixed(1)}%`}
              hint="Paid ÷ billed"
              tone="info"
            />
            <KPI
              label="Avg days to pay"
              value={data.kpis.avgDaysToPay != null ? data.kpis.avgDaysToPay.toString() : "—"}
              hint="Submitted → paid"
              tone="info"
            />
          </div>

          {/* Daily fills bar chart */}
          <div className="card" style={{ padding: 22, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div className="t-eyebrow">Fills · daily (last 14 days)</div>
                <h3 className="bnds-serif" style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>
                  {totalFillsThisMonth.toLocaleString()} fills this month
                </h3>
                <div className="t-xs" style={{ marginTop: 2 }}>
                  Avg {avgPerDay}/day · peak {peakDay.fills} ({peakDay.date})
                </div>
              </div>
            </div>
            {data.dailyFills.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                No fills recorded in the last 14 days.
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 220, paddingTop: 8 }}>
                {data.dailyFills.map((d, i) => (
                  <div
                    key={d.date + i}
                    title={`${d.date}: ${d.fills} fill${d.fills === 1 ? "" : "s"}`}
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
                    <div
                      style={{
                        width: "100%",
                        height: `${(d.fills / maxFills) * 100}%`,
                        background: "var(--bnds-forest)",
                        borderRadius: 3,
                      }}
                    />
                    {i % 3 === 0 && (
                      <div className="t-xs" style={{ marginTop: 6, fontSize: 10, color: "var(--ink-4)" }}>
                        {d.date}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Top drugs */}
            <div className="card" style={{ padding: 18 }}>
              <div className="t-eyebrow">Top drugs by fills (this month)</div>
              {data.topDrugs.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                  No fills this month yet.
                </div>
              ) : (
                data.topDrugs.map((d) => {
                  const max = Math.max(...data.topDrugs.map((x) => x.count), 1);
                  return (
                    <div key={d.name} style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span>{d.name}</span>
                        <span className="t-num" style={{ fontWeight: 500 }}>
                          {d.count.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "var(--paper-2)", marginTop: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(d.count / max) * 100}%`, background: d.color }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Revenue mix */}
            <div className="card" style={{ padding: 18 }}>
              <div className="t-eyebrow">Revenue mix (this month)</div>
              {revenueTotal <= 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "var(--ink-3)", fontSize: 13, marginTop: 14 }}>
                  No revenue recorded yet this month.
                </div>
              ) : (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.revenueMix.map((r) => (
                    <div key={r.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />
                          {r.label}
                        </span>
                        <span className="t-num" style={{ fontWeight: 500 }}>
                          {r.value}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "var(--paper-2)", marginTop: 4, overflow: "hidden" }}>
                        <div
                          style={{ height: "100%", width: `${(r.rawValue / revenueTotal) * 100}%`, background: r.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Inventory snapshot */}
          <div className="card" style={{ padding: 18, marginTop: 16 }}>
            <div className="t-eyebrow">Inventory snapshot</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 12 }}>
              <SnapshotCell label="Active lots" value={data.inventory.activeLots} />
              <SnapshotCell label="Low stock SKUs" value={data.inventory.lowStock} tone="warn" />
              <SnapshotCell label="Expiring < 90 days" value={data.inventory.expiringSoon} tone="warn" />
              <SnapshotCell label="Expired in stock" value={data.inventory.expired} tone="danger" />
            </div>
          </div>
        </>
      )}

      {tab !== "overview" && (
        <div className="card" style={{ padding: 32, textAlign: "center", marginTop: 12 }}>
          <div style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 8 }}>
            {tab === "compliance" ? "Compliance reports" : `${tab} reports`} →{" "}
            <a
              href={
                tab === "compliance"
                  ? "/compliance/audit-reports"
                  : tab === "fills"
                  ? "/reports/builder?dataset=fills"
                  : tab === "revenue"
                  ? "/billing"
                  : tab === "inventory"
                  ? "/inventory"
                  : "/reports/builder"
              }
              style={{ color: "var(--bnds-forest)", fontWeight: 500 }}
            >
              open dedicated view
            </a>
          </div>
          <div className="t-xs" style={{ color: "var(--ink-3)" }}>
            This tab is a placeholder for the in-page report; the dedicated page has the full export-ready table.
          </div>
        </div>
      )}
    </DesignPage>
  );
}

function SnapshotCell({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" }) {
  const color = tone === "danger" ? "var(--danger)" : tone === "warn" ? "var(--warn)" : "var(--ink)";
  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{label}</div>
      <div className="bnds-serif t-num" style={{ fontSize: 24, fontWeight: 500, color, marginTop: 4 }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
