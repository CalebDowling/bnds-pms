import { getDailyFillReport, getInventoryReport, getBatchReport, getAnalytics, getRxVolumeData, getRevenueByCategory, getTopDrugs, getTurnaroundTimes } from "./actions";
import { formatDate } from "@/lib/utils";
import { formatPatientName, formatDrugName, formatFillNumber } from "@/lib/utils/formatters";
import Link from "next/link";
import ReportsExportButton from "@/components/dashboard/ReportsExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import ReportsDashboard from "./ReportsDashboard";

export const dynamic = "force-dynamic";

// BNDS PMS Redesign — heritage reports palette (forest, leaf, lake, amber, burgundy)
async function refreshDashboardData(startDate: string, endDate: string) {
  "use server";
  const [rxVolume, revenueByCategory, topDrugs, turnaroundTimes] = await Promise.all([
    getRxVolumeData(startDate, endDate),
    getRevenueByCategory(startDate, endDate),
    getTopDrugs(startDate, endDate, 10),
    getTurnaroundTimes(startDate, endDate),
  ]);
  return {
    rxVolume,
    revenueByCategory,
    topDrugs,
    turnaroundTimes,
  };
}

async function ReportsPageContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string; startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "dashboard";

  const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "analytics", label: "Analytics" },
    { id: "fills", label: "Daily Fills" },
    { id: "inventory", label: "Inventory" },
    { id: "batches", label: "Batch Log" },
  ];

  return (
    <PageShell
      eyebrow="Insights"
      title="Reports"
      subtitle="Pharmacy operations reports and analytics"
      toolbar={
        <FilterBar
          filters={
            <div
              className="inline-flex items-center"
              style={{
                gap: 2,
                padding: 3,
                backgroundColor: "#f3efe7",
                borderRadius: 8,
                border: "1px solid #e3ddd1",
              }}
            >
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <Link
                    key={t.id}
                    href={`/reports?tab=${t.id}`}
                    className="inline-flex items-center no-underline transition-all"
                    style={{
                      padding: "6px 12px",
                      fontSize: 12.5,
                      fontWeight: active ? 600 : 500,
                      color: active ? "#14201a" : "#6b7a72",
                      backgroundColor: active ? "#ffffff" : "transparent",
                      borderRadius: 6,
                      boxShadow: active
                        ? "0 1px 0 rgba(20,32,26,0.04), 0 1px 2px rgba(20,32,26,0.04)"
                        : "none",
                    }}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>
          }
        />
      }
    >
      {tab === "dashboard" && <DashboardTab startDate={params.startDate} endDate={params.endDate} />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "fills" && <DailyFillsTab date={params.date} />}
      {tab === "inventory" && <InventoryTab />}
      {tab === "batches" && <BatchTab startDate={params.startDate} endDate={params.endDate} />}
    </PageShell>
  );
}

async function DashboardTab({
  startDate: initialStartDate = "",
  endDate: initialEndDate = "",
}: {
  startDate?: string;
  endDate?: string;
}) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const startDate = initialStartDate || thirtyDaysAgo.toISOString().split("T")[0];
  const endDate = initialEndDate || today.toISOString().split("T")[0];

  const [rxVolume, revenueByCategory, topDrugs, turnaroundTimes] = await Promise.all([
    getRxVolumeData(startDate, endDate),
    getRevenueByCategory(startDate, endDate),
    getTopDrugs(startDate, endDate, 10),
    getTurnaroundTimes(startDate, endDate),
  ]);

  return (
    <ReportsDashboard
      initialRxVolume={rxVolume}
      initialRevenueByCategory={revenueByCategory}
      initialTopDrugs={topDrugs}
      initialTurnaroundTimes={turnaroundTimes}
      startDate={startDate}
      endDate={endDate}
      onDataRefresh={refreshDashboardData}
    />
  );
}

async function AnalyticsTab() {
  const data = await getAnalytics();
  const monthChange = data.revenue.lastMonth > 0
    ? ((data.revenue.thisMonth - data.revenue.lastMonth) / data.revenue.lastMonth * 100)
    : 0;
  const fillChange = data.prescriptions.fillsLastMonth > 0
    ? ((data.prescriptions.fillsThisMonth - data.prescriptions.fillsLastMonth) / data.prescriptions.fillsLastMonth * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Revenue Row */}
      <div>
        <h2 className="font-serif mb-3" style={{ fontSize: 16, color: "#0f2e1f", fontWeight: 600 }}>Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today (Payments)" value={`$${data.revenue.today.toFixed(2)}`} sub={`${data.revenue.posTxToday} POS tx — $${data.revenue.posToday.toFixed(2)}`} />
          <StatCard label="This Month" value={`$${data.revenue.thisMonth.toFixed(2)}`}
            sub={`${data.revenue.paymentsThisMonth} payments`}
            trend={monthChange} />
          <StatCard label="Last Month" value={`$${data.revenue.lastMonth.toFixed(2)}`} sub="Comparison period" />
          <StatCard label="POS This Month" value={`$${data.revenue.posThisMonth.toFixed(2)}`} sub="Counter sales" />
        </div>
      </div>

      {/* Prescription KPIs */}
      <div>
        <h2 className="font-serif mb-3" style={{ fontSize: 16, color: "#0f2e1f", fontWeight: 600 }}>Prescriptions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Fills Today" value={data.prescriptions.fillsToday.toString()} accent />
          <StatCard label="This Week" value={data.prescriptions.fillsThisWeek.toString()} />
          <StatCard label="This Month" value={data.prescriptions.fillsThisMonth.toString()} trend={fillChange} />
          <StatCard label="New Rx" value={data.prescriptions.newRxThisMonth.toString()} sub="This month" />
          <StatCard label="Refills" value={data.prescriptions.refillsThisMonth.toString()} sub="This month" />
        </div>
        {/* Daily fills mini-chart */}
        {data.prescriptions.dailyFillData.length > 0 && (
          <div className="mt-4 rounded-lg p-4" style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}>
            <h3 className="text-[10px] font-semibold uppercase mb-3" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Daily Fills (Last 14 Days)</h3>
            <div className="flex items-end gap-1 h-24">
              {data.prescriptions.dailyFillData.map((d, i) => {
                const max = Math.max(...data.prescriptions.dailyFillData.map(x => x.fills), 1);
                const height = Math.max((d.fills / max) * 100, 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px]" style={{ color: "#5a6b58" }}>{d.fills}</span>
                    <div className="w-full rounded-t" style={{ height: `${height}%`, backgroundColor: "#1f5a3a" }} />
                    <span className="text-[8px] truncate w-full text-center" style={{ color: "#7a8a78" }}>{d.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Claims Performance */}
      <div>
        <h2 className="font-serif mb-3" style={{ fontSize: 16, color: "#0f2e1f", fontWeight: 600 }}>Claims Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Collection Rate" value={`${data.claims.collectionRate}%`}
            sub={`$${data.claims.totalPaid.toFixed(0)} / $${data.claims.totalBilled.toFixed(0)}`}
            accent={data.claims.collectionRate >= 90} warn={data.claims.collectionRate < 80} />
          <StatCard label="Rejection Rate" value={`${data.claims.rejectionRate}%`}
            warn={data.claims.rejectionRate > 5} />
          <StatCard label="Avg Days to Pay" value={data.claims.avgDaysToPay !== null ? `${data.claims.avgDaysToPay}` : "—"} sub="Submitted → Paid" />
          <StatCard label="Paid (Month)" value={data.claims.paidThisMonth.toString()} />
          <StatCard label="Rejected (Month)" value={data.claims.rejectedThisMonth.toString()} warn={data.claims.rejectedThisMonth > 0} />
        </div>
        {/* Claims by status breakdown */}
        {data.claims.byStatus.length > 0 && (
          <div className="mt-4 rounded-lg p-4" style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}>
            <h3 className="text-[10px] font-semibold uppercase mb-3" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Claims by Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.claims.byStatus.map(s => (
                <div key={s.status} className="flex items-center justify-between py-1 px-2 rounded-md" style={{ backgroundColor: "#faf8f4" }}>
                  <span className="text-xs font-medium capitalize" style={{ color: "#3a4a3c" }}>{s.status}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: "#0f2e1f" }}>{s.count}</span>
                    <span className="text-xs ml-1" style={{ color: "#7a8a78" }}>(${s.billed.toFixed(0)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inventory Health */}
      <div>
        <h2 className="font-serif mb-3" style={{ fontSize: 16, color: "#0f2e1f", fontWeight: 600 }}>Inventory Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active Lots" value={data.inventory.activeLots.toString()} />
          <StatCard label="Low Stock Items" value={data.inventory.lowStock.toString()} warn={data.inventory.lowStock > 0} />
          <StatCard label="Expiring (90d)" value={data.inventory.expiringSoon.toString()} warn={data.inventory.expiringSoon > 0} />
          <StatCard label="Expired (Still On-Hand)" value={data.inventory.expired.toString()} warn={data.inventory.expired > 0} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, trend, accent, warn }: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  accent?: boolean;
  warn?: boolean;
}) {
  const trendColor = trend && trend > 0 ? "#1f5a3a" : trend && trend < 0 ? "#9a2c1f" : "#7a8a78";
  const valueColor = warn ? "#9a2c1f" : accent ? "#1f5a3a" : "#0f2e1f";
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: "#ffffff", border: warn ? "1px solid rgba(184,58,47,0.30)" : "1px solid #e3ddd1" }}>
      <p className="text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>{label}</p>
      <p className="font-serif mt-1" style={{ fontSize: 24, fontWeight: 700, color: valueColor, lineHeight: 1.1 }}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {sub && <p className="text-xs" style={{ color: "#7a8a78" }}>{sub}</p>}
        {trend !== undefined && trend !== 0 && (
          <span className="text-xs font-medium" style={{ color: trendColor }}>
            {trend > 0 ? "+" : ""}{Math.round(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

async function DailyFillsTab({ date }: { date?: string }) {
  const targetDate = date || new Date().toISOString().split("T")[0];
  const fills = await getDailyFillReport(targetDate);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <form className="flex items-center gap-2">
          <label className="text-sm" style={{ color: "#3a4a3c" }}>Date:</label>
          <input type="date" name="date" defaultValue={targetDate}
            className="rounded-md"
            style={{ border: "1px solid #d9d2c2", padding: "5px 11px", fontSize: 12, backgroundColor: "#ffffff" }} />
          <input type="hidden" name="tab" value="fills" />
          <button
            type="submit"
            className="inline-flex items-center font-semibold rounded-md transition-colors"
            style={{ backgroundColor: "#1f5a3a", color: "#ffffff", border: "1px solid #1f5a3a", padding: "5px 11px", fontSize: 12 }}
          >
            Go
          </button>
        </form>
        <div className="flex items-center gap-4">
          <p className="text-sm" style={{ color: "#7a8a78" }}>{fills.length} fill(s) on {targetDate}</p>
          <ReportsExportButton tab="fills" date={targetDate} />
        </div>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}>
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: "#f4ede0", borderBottom: "1px solid #e3ddd1" }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Time</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Rx#</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Patient</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Drug / Formula</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Qty</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Lot / Batch</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Fill #</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {fills.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: "#7a8a78" }}>No fills for this date</td></tr>
            ) : fills.map((fill: any, idx: number) => (
              <tr key={fill.id} style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}>
                <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                  {new Date(fill.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#1f5a3a", fontWeight: 600, fontSize: 12 }}>
                  <Link href={`/prescriptions/${fill.prescription.id}`} className="hover:underline">
                    {fill.prescription.rxNumber}
                  </Link>
                </td>
                <td className="px-4 py-3" style={{ color: "#0f2e1f" }}>
                  {formatPatientName({ firstName: fill.prescription.patient.firstName, lastName: fill.prescription.patient.lastName }, { format: "last-first" })}
                </td>
                <td className="px-4 py-3" style={{ color: "#3a4a3c" }}>
                  {fill.prescription.item?.name
                    ? formatDrugName(fill.prescription.item.name)
                    : fill.prescription.formula?.name
                      ? formatDrugName(fill.prescription.formula.name)
                      : "—"}
                  {fill.prescription.item?.strength && <span className="ml-1" style={{ color: "#7a8a78" }}>{fill.prescription.item.strength}</span>}
                </td>
                <td className="px-4 py-3" style={{ color: "#3a4a3c" }}>{Number(fill.quantity)}</td>
                <td className="px-4 py-3" style={{ color: "#5a6b58", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                  {fill.itemLot?.lotNumber || fill.batch?.batchNumber || "—"}
                </td>
                <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                  Fill #{formatFillNumber(fill.fillNumber)} {fill.fillNumber === 0 ? "(Orig)" : "(Refill)"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center"
                    style={{
                      backgroundColor:
                        fill.status === "dispensed" ? "rgba(31,90,58,0.14)"
                          : fill.status === "pending" ? "rgba(212,138,40,0.14)"
                          : "rgba(56,109,140,0.12)",
                      color:
                        fill.status === "dispensed" ? "#1f5a3a"
                          : fill.status === "pending" ? "#8a5a17"
                          : "#2c5e7a",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {fill.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function InventoryTab() {
  const items = await getInventoryReport();
  const lowStock = items.filter(i => i.isLow);
  const expiring = items.filter(i => {
    if (!i.earliestExp) return false;
    const d = new Date(i.earliestExp);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff > 0;
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="grid grid-cols-4 gap-4 flex-1">
          <StatCard label="Total Items" value={items.length.toString()} />
          <StatCard label="Low Stock" value={lowStock.length.toString()} warn={lowStock.length > 0} />
          <StatCard label="Expiring (90d)" value={expiring.length.toString()} warn={expiring.length > 0} />
          <StatCard label="Compound Items" value={items.filter(i => i.isCompoundIngredient).length.toString()} />
        </div>
        <ReportsExportButton tab="inventory" />
      </div>

      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}>
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: "#f4ede0", borderBottom: "1px solid #e3ddd1" }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Item</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>NDC</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>On Hand</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Reorder Pt</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Lots</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Earliest Exp</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Flags</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={item.id}
                style={{
                  borderTop: idx > 0 ? "1px solid #ede6d6" : undefined,
                  backgroundColor: item.isLow ? "rgba(184,58,47,0.05)" : undefined,
                }}
              >
                <td className="px-4 py-3">
                  <Link href={`/inventory/${item.id}`} className="hover:underline" style={{ color: "#1f5a3a", fontWeight: 600 }}>
                    {formatDrugName(item.name)}
                  </Link>
                  {item.strength && <p className="text-xs" style={{ color: "#7a8a78" }}>{item.strength}</p>}
                </td>
                <td className="px-4 py-3" style={{ color: "#5a6b58", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{item.ndc || "—"}</td>
                <td className="px-4 py-3" style={{ color: "#0f2e1f", fontWeight: 500 }}>
                  {item.totalOnHand} {item.unitOfMeasure || ""}
                </td>
                <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{item.reorderPoint ?? "—"}</td>
                <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{item.lotCount}</td>
                <td className="px-4 py-3" style={{ color: "#5a6b58" }}>
                  {item.earliestExp ? formatDate(item.earliestExp) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {item.isLow && (
                      <span style={{ backgroundColor: "rgba(184,58,47,0.10)", color: "#9a2c1f", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>LOW</span>
                    )}
                    {item.isCompoundIngredient && (
                      <span style={{ backgroundColor: "rgba(120,80,160,0.12)", color: "#5a4a78", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>CPD</span>
                    )}
                    {item.isRefrigerated && (
                      <span style={{ backgroundColor: "rgba(56,109,140,0.12)", color: "#2c5e7a", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>COLD</span>
                    )}
                    {item.isControlled && (
                      <span style={{ backgroundColor: "rgba(212,138,40,0.14)", color: "#8a5a17", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>C-II</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function BatchTab({ startDate, endDate }: { startDate?: string; endDate?: string }) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const end = endDate || new Date().toISOString().split("T")[0];
  const batches = await getBatchReport(start, end);

  const STATUS_PALETTE: Record<string, { bg: string; color: string }> = {
    in_progress: { bg: "rgba(212,138,40,0.14)", color: "#8a5a17" },
    completed: { bg: "rgba(56,109,140,0.12)", color: "#2c5e7a" },
    verified: { bg: "rgba(31,90,58,0.14)", color: "#1f5a3a" },
    failed: { bg: "rgba(184,58,47,0.10)", color: "#9a2c1f" },
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <form className="flex items-center gap-2">
          <label className="text-sm" style={{ color: "#3a4a3c" }}>From:</label>
          <input type="date" name="startDate" defaultValue={start}
            className="rounded-md"
            style={{ border: "1px solid #d9d2c2", padding: "5px 11px", fontSize: 12, backgroundColor: "#ffffff" }} />
          <label className="text-sm" style={{ color: "#3a4a3c" }}>To:</label>
          <input type="date" name="endDate" defaultValue={end}
            className="rounded-md"
            style={{ border: "1px solid #d9d2c2", padding: "5px 11px", fontSize: 12, backgroundColor: "#ffffff" }} />
          <input type="hidden" name="tab" value="batches" />
          <button
            type="submit"
            className="inline-flex items-center font-semibold rounded-md transition-colors"
            style={{ backgroundColor: "#1f5a3a", color: "#ffffff", border: "1px solid #1f5a3a", padding: "5px 11px", fontSize: 12 }}
          >
            Go
          </button>
        </form>
        <div className="flex items-center gap-4">
          <p className="text-sm" style={{ color: "#7a8a78" }}>{batches.length} batch(es)</p>
          <ReportsExportButton tab="batches" startDate={start} endDate={end} />
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid #e3ddd1" }}>
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: "#f4ede0", borderBottom: "1px solid #e3ddd1" }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Batch #</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Formula</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Qty</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>BUD</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Compounder</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>QA</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Fills</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase" style={{ color: "#7a8a78", letterSpacing: "0.10em" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: "#7a8a78" }}>No batches in this range</td></tr>
            ) : batches.map((b: any, idx: number) => {
              const sp = STATUS_PALETTE[b.status] || { bg: "rgba(122,138,120,0.14)", color: "#5a6b58" };
              return (
                <tr key={b.id} style={{ borderTop: idx > 0 ? "1px solid #ede6d6" : undefined }}>
                  <td className="px-4 py-3">
                    <Link href={`/compounding/batches/${b.id}`} className="hover:underline" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#1f5a3a", fontWeight: 600, fontSize: 12 }}>
                      {b.batchNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#0f2e1f" }}>
                    {b.formulaVersion.formula.name}
                    <span className="ml-1 text-xs" style={{ color: "#7a8a78" }}>{b.formulaVersion.formula.formulaCode}</span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#3a4a3c" }}>{Number(b.quantityPrepared)} {b.unit}</td>
                  <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{formatDate(b.budDate)}</td>
                  <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{formatPatientName({ firstName: b.compounder.firstName, lastName: b.compounder.lastName })}</td>
                  <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{b.qa.length}</td>
                  <td className="px-4 py-3" style={{ color: "#5a6b58" }}>{b.fills.length}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center capitalize"
                      style={{
                        backgroundColor: sp.bg,
                        color: sp.color,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string; startDate?: string; endDate?: string }>;
}) {
  return (
    <PermissionGuard resource="reports" action="read">
      <ReportsPageContent searchParams={searchParams} />
    </PermissionGuard>
  );
}
