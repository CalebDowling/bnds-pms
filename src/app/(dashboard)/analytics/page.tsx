import {
  getAnalyticsDashboard,
  getDispensingTrends,
  getRevenueAnalytics,
  getClaimsAnalytics,
  getProductivityMetrics,
  getPatientMetrics,
  getTopDrugs,
  getPayerMix,
  getCompoundingMetrics,
} from "./actions";
import PermissionGuard from "@/components/auth/PermissionGuard";
import KPICard from "./components/KPICard";
import TrendChart from "./components/TrendChart";
import TopDrugsTable from "./TopDrugsClient";
import PayerMixTable from "./PayerMixClient";
import PatientTable from "./PatientTableClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function AnalyticsPage({ searchParams }: Props) {
  const params = await searchParams;
  const preset = params.range ?? "30d";

  try {
    const [dashboard, trends, revenue, claims, productivity, patients, topDrugs, payerMix, compounding] =
      await Promise.all([
        getAnalyticsDashboard(preset),
        getDispensingTrends(preset),
        getRevenueAnalytics(preset),
        getClaimsAnalytics(preset),
        getProductivityMetrics(preset),
        getPatientMetrics(preset),
        getTopDrugs(preset, 10),
        getPayerMix(preset),
        getCompoundingMetrics(preset),
      ]);

    const { kpis } = dashboard;

    // Calculate change percentages
    function pctChange(current: number, previous: number): number {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    }

    const rangeLabels: Record<string, string> = {
      "7d": "Last 7 Days",
      "30d": "Last 30 Days",
      "90d": "Last 90 Days",
      "ytd": "Year to Date",
    };

    return (
      <PermissionGuard resource="reports" action="read">
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary, #2D2416)", margin: 0 }}>
                Analytics Dashboard
              </h1>
              <p style={{ fontSize: "14px", color: "var(--text-muted, #8B7E6A)", marginTop: "4px" }}>
                Pharmacy operations intelligence and performance metrics
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted, #8B7E6A)", marginRight: "8px", fontWeight: 500 }}>
                Period:
              </span>
              {(["7d", "30d", "90d", "ytd"] as const).map((r) => (
                <a
                  key={r}
                  href={`?range=${r}`}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "13px",
                    backgroundColor: preset === r ? "var(--green-700, #40721D)" : "var(--card-bg, #F5F0E8)",
                    color: preset === r ? "#fff" : "var(--text-secondary, #5C4F3C)",
                    border: preset === r ? "none" : "1px solid var(--border, #D4C9B8)",
                    transition: "all 0.15s",
                  }}
                >
                  {rangeLabels[r]}
                </a>
              ))}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <KPICard
              title="Total Fills"
              value={kpis.totalFills.toLocaleString()}
              changePercent={pctChange(kpis.totalFills, kpis.prevTotalFills)}
              changeLabel="vs prior period"
            />
            <KPICard
              title="Revenue"
              value={`$${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              changePercent={pctChange(kpis.totalRevenue, kpis.prevTotalRevenue)}
              changeLabel="vs prior period"
            />
            <KPICard
              title="Avg Fills/Day"
              value={kpis.avgFillsPerDay.toFixed(1)}
              changePercent={pctChange(kpis.avgFillsPerDay, kpis.prevAvgFillsPerDay)}
              changeLabel="vs prior period"
            />
            <KPICard
              title="Claim Acceptance"
              value={`${kpis.claimAcceptanceRate}%`}
              changePercent={pctChange(kpis.claimAcceptanceRate, kpis.prevClaimAcceptanceRate)}
              changeLabel="vs prior period"
            />
            <KPICard
              title="Active Patients"
              value={kpis.activePatients.toLocaleString()}
              changePercent={pctChange(kpis.activePatients, kpis.prevActivePatients)}
              changeLabel="vs prior period"
            />
          </div>

          {/* Dispensing Trends */}
          <Section title="Dispensing Trends" subtitle="Daily prescription fills over the selected period">
            <TrendChart
              data={trends}
              height={240}
              mode="bar"
              color="var(--green-700, #40721D)"
            />
          </Section>

          {/* Revenue Section */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
            <Section title="Revenue Trend" subtitle="Daily revenue from prescription fills">
              <TrendChart
                data={revenue.byDay}
                height={220}
                mode="line"
                color="var(--green-700, #40721D)"
                valuePrefix="$"
              />
            </Section>
            <Section title="Revenue Breakdown" subtitle="By payment type">
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "8px 0" }}>
                {revenue.byPayer.map((p) => (
                  <div key={p.payerType} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary, #2D2416)" }}>
                        {p.payerType}
                      </span>
                      <span style={{ fontSize: "13px", color: "var(--text-secondary, #5C4F3C)" }}>
                        ${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({p.percentage}%)
                      </span>
                    </div>
                    <div style={{ height: "8px", borderRadius: "4px", backgroundColor: "var(--border, #D4C9B8)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(p.percentage, 100)}%`,
                          borderRadius: "4px",
                          backgroundColor: p.payerType === "Insurance" ? "var(--green-700, #40721D)" : p.payerType === "Cash" ? "#2563EB" : "#D97706",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted, #8B7E6A)" }}>
                      {p.fillCount} fills
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* Top 10 Drugs */}
          <Section title="Top 10 Drugs" subtitle="Most dispensed drugs by fill count and revenue">
            <TopDrugsTable data={topDrugs} />
          </Section>

          {/* Claims Performance */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <Section title="Claims Performance" subtitle="Insurance claim adjudication results">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
                <div style={{ display: "flex", gap: "24px" }}>
                  <StatBox label="Total Claims" value={claims.total.toLocaleString()} />
                  <StatBox label="Acceptance Rate" value={`${claims.acceptanceRate}%`} color="var(--green-700, #40721D)" />
                  <StatBox label="Rejection Rate" value={`${claims.rejectionRate}%`} color="#DC2626" />
                  <StatBox label="Avg Adjudication" value={`${claims.avgAdjudicationMinutes} min`} />
                </div>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted, #8B7E6A)" }}>Approved</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--green-700, #40721D)" }}>{claims.approved}</span>
                    </div>
                    <ProgressBar value={claims.acceptanceRate} color="var(--green-700, #40721D)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted, #8B7E6A)" }}>Rejected</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#DC2626" }}>{claims.rejected}</span>
                    </div>
                    <ProgressBar value={claims.rejectionRate} color="#DC2626" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted, #8B7E6A)" }}>Pending</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#D97706" }}>{claims.pending}</span>
                    </div>
                    <ProgressBar value={claims.total > 0 ? (claims.pending / claims.total) * 100 : 0} color="#D97706" />
                  </div>
                </div>
              </div>
            </Section>
            <Section title="Top Rejection Codes" subtitle="Most frequent claim rejection reasons">
              {claims.topRejectionReasons.length === 0 ? (
                <p style={{ color: "var(--text-muted, #8B7E6A)", fontSize: "14px", textAlign: "center", padding: "24px 0" }}>
                  No rejections in this period
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "8px 0" }}>
                  {claims.topRejectionReasons.map((r, i) => (
                    <div key={r.code} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "6px",
                        backgroundColor: "var(--card-bg, #F5F0E8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "var(--text-secondary, #5C4F3C)",
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "var(--text-primary, #2D2416)", fontFamily: "monospace" }}>
                        {r.code}
                      </span>
                      <span style={{
                        padding: "2px 10px",
                        borderRadius: "12px",
                        backgroundColor: "#FEE2E2",
                        color: "#DC2626",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}>
                        {r.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Payer Mix */}
          <Section title="Payer Mix" subtitle="Fill volume and revenue by insurance plan">
            <PayerMixTable data={payerMix} />
          </Section>

          {/* Productivity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <Section title="Productivity" subtitle="Staff throughput and workflow timing">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
                <div style={{ display: "flex", gap: "24px" }}>
                  <StatBox label="Fills/Day" value={String(productivity.fillsPerDay)} color="var(--green-700, #40721D)" />
                  <StatBox label="RPh Verification Rate" value={`${productivity.verificationRate}%`} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary, #5C4F3C)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Average Queue Time (minutes)
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Object.entries(productivity.avgTimeInQueue).map(([stage, minutes]) => (
                      <div key={stage} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ width: "140px", fontSize: "13px", color: "var(--text-primary, #2D2416)" }}>{stage}</span>
                        <div style={{ flex: 1, height: "8px", borderRadius: "4px", backgroundColor: "var(--border, #D4C9B8)", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min((minutes / Math.max(...Object.values(productivity.avgTimeInQueue), 1)) * 100, 100)}%`,
                              borderRadius: "4px",
                              backgroundColor: "var(--green-700, #40721D)",
                              minWidth: minutes > 0 ? "4px" : "0px",
                            }}
                          />
                        </div>
                        <span style={{ width: "60px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "var(--text-primary, #2D2416)" }}>
                          {minutes} min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
            <Section title="Top Techs by Fill Count" subtitle="Technician productivity ranking">
              {productivity.techFills.length === 0 ? (
                <p style={{ color: "var(--text-muted, #8B7E6A)", fontSize: "14px", textAlign: "center", padding: "24px 0" }}>
                  No fill data in this period
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
                  {productivity.techFills.map((tech, i) => {
                    const maxFills = productivity.techFills[0]?.fills || 1;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "6px",
                          backgroundColor: i < 3 ? "var(--green-700, #40721D)" : "var(--card-bg, #F5F0E8)",
                          color: i < 3 ? "#fff" : "var(--text-secondary, #5C4F3C)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ width: "140px", fontSize: "13px", color: "var(--text-primary, #2D2416)", fontWeight: 500 }}>
                          {tech.name}
                        </span>
                        <div style={{ flex: 1, height: "8px", borderRadius: "4px", backgroundColor: "var(--border, #D4C9B8)", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${(tech.fills / maxFills) * 100}%`,
                              borderRadius: "4px",
                              backgroundColor: "var(--green-700, #40721D)",
                              minWidth: "4px",
                            }}
                          />
                        </div>
                        <span style={{ width: "50px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "var(--text-primary, #2D2416)" }}>
                          {tech.fills}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>

          {/* Patients */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <Section title="Patient Metrics" subtitle="Patient population overview">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  <StatBox label="New Patients" value={patients.newPatientsThisPeriod.toLocaleString()} color="var(--green-700, #40721D)" />
                  <StatBox label="Active" value={patients.activeCount.toLocaleString()} />
                  <StatBox label="Inactive" value={patients.inactiveCount.toLocaleString()} />
                  <StatBox label="Active Ratio" value={`${patients.activeRatio}%`} />
                </div>
              </div>
            </Section>
            <Section title="Top Patients by Rx Count" subtitle="Highest prescription volume patients">
              <PatientTable data={patients.topPatients} />
            </Section>
          </div>

          {/* Compounding */}
          <Section title="Compounding" subtitle="Batch production and quality assurance metrics">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  <StatBox label="Total Batches" value={compounding.totalBatches.toLocaleString()} color="var(--green-700, #40721D)" />
                  <StatBox label="Avg Batch Time" value={`${compounding.avgBatchTimeMinutes} min`} />
                  <StatBox label="QA Pass Rate" value={`${compounding.qaPassRate}%`} color={compounding.qaPassRate >= 95 ? "var(--green-700, #40721D)" : "#DC2626"} />
                  <StatBox label="QA Checks" value={compounding.qaTotalChecks.toLocaleString()} />
                </div>
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary, #5C4F3C)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Top Formulas
                </p>
                {compounding.topFormulas.length === 0 ? (
                  <p style={{ color: "var(--text-muted, #8B7E6A)", fontSize: "14px" }}>
                    No batches in this period
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {compounding.topFormulas.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "6px",
                          backgroundColor: "var(--card-bg, #F5F0E8)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "var(--text-secondary, #5C4F3C)",
                        }}>
                          {i + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary, #2D2416)" }}>
                            {f.name}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted, #8B7E6A)", marginLeft: "8px", fontFamily: "monospace" }}>
                            {f.code}
                          </span>
                        </div>
                        <span style={{
                          padding: "2px 10px",
                          borderRadius: "12px",
                          backgroundColor: "rgba(64, 114, 29, 0.1)",
                          color: "var(--green-700, #40721D)",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}>
                          {f.batchCount} batches
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

        </div>
      </PermissionGuard>
    );
  } catch (error) {
    console.error("Analytics error:", error);
    return (
      <PermissionGuard resource="reports" action="read">
        <div style={{
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: "12px",
          padding: "24px",
        }}>
          <p style={{ fontSize: "14px", color: "#DC2626", fontWeight: 500 }}>
            Failed to load analytics dashboard. Please try again or contact support.
          </p>
        </div>
      </PermissionGuard>
    );
  }
}

// ─── Helper Components ───────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--card-bg, #F5F0E8)",
        border: "1px solid var(--border, #D4C9B8)",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary, #2D2416)", margin: 0 }}>
          {title}
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-muted, #8B7E6A)", marginTop: "2px" }}>
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p style={{ fontSize: "12px", color: "var(--text-muted, #8B7E6A)", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
        {label}
      </p>
      <p style={{ fontSize: "22px", fontWeight: 700, color: color ?? "var(--text-primary, #2D2416)", lineHeight: 1.2 }}>
        {value}
      </p>
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: "8px", borderRadius: "4px", backgroundColor: "var(--border, #D4C9B8)", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(value, 100)}%`,
          borderRadius: "4px",
          backgroundColor: color,
          transition: "width 0.3s ease",
          minWidth: value > 0 ? "4px" : "0px",
        }}
      />
    </div>
  );
}
