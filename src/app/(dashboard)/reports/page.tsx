import { getDailyFillReport, getInventoryReport, getBatchReport, getAnalytics, getRxVolumeData, getRevenueByCategory, getTopDrugs, getTurnaroundTimes } from "./actions";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import ReportsExportButton from "@/components/dashboard/ReportsExportButton";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageShell from "@/components/layout/PageShell";
import FilterBar from "@/components/layout/FilterBar";
import ReportsDashboard from "./ReportsDashboard";
import type { PrescriptionFillWithRelations, CompoundingBatchWithRelations } from "@/types";

export const dynamic = "force-dynamic";

// Wrapper action to refresh dashboard data
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
      title="Reports"
      subtitle="Pharmacy operations reports"
      toolbar={
        <FilterBar
          filters={
            <>
              {TABS.map((t) => (
                <Link
                  key={t.id}
                  href={`/reports?tab=${t.id}`}
                  className="px-4 py-1.5 text-xs font-semibold rounded-full border no-underline transition-colors"
                  style={{
                    backgroundColor: tab === t.id ? "var(--color-primary)" : "transparent",
                    color: tab === t.id ? "#fff" : "var(--text-secondary)",
                    borderColor: tab === t.id ? "var(--color-primary)" : "var(--border)",
                  }}
                >
                  {t.label}
                </Link>
              ))}
            </>
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
  // Calculate default date range (last 30 days)
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
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Revenue</h2>
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
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Prescriptions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Fills Today" value={data.prescriptions.fillsToday.toString()} accent />
          <StatCard label="This Week" value={data.prescriptions.fillsThisWeek.toString()} />
          <StatCard label="This Month" value={data.prescriptions.fillsThisMonth.toString()} trend={fillChange} />
          <StatCard label="New Rx" value={data.prescriptions.newRxThisMonth.toString()} sub="This month" />
          <StatCard label="Refills" value={data.prescriptions.refillsThisMonth.toString()} sub="This month" />
        </div>
        {/* Daily fills mini-chart */}
        {data.prescriptions.dailyFillData.length > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Daily Fills (Last 14 Days)</h3>
            <div className="flex items-end gap-1 h-24">
              {data.prescriptions.dailyFillData.map((d, i) => {
                const max = Math.max(...data.prescriptions.dailyFillData.map(x => x.fills), 1);
                const height = Math.max((d.fills / max) * 100, 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-gray-500">{d.fills}</span>
                    <div className="w-full bg-[#40721D] rounded-t" style={{ height: `${height}%` }} />
                    <span className="text-[8px] text-gray-400 truncate w-full text-center">{d.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Claims Performance */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Claims Performance</h2>
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
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Claims by Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.claims.byStatus.map(s => (
                <div key={s.status} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded-lg">
                  <span className="text-xs font-medium text-gray-700 capitalize">{s.status}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">{s.count}</span>
                    <span className="text-xs text-gray-400 ml-1">(${s.billed.toFixed(0)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inventory Health */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Inventory Health</h2>
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
  const trendColor = trend && trend > 0 ? "text-green-600" : trend && trend < 0 ? "text-red-600" : "";
  return (
    <div className={`bg-white rounded-xl border p-4 ${warn ? "border-red-200" : "border-gray-200"}`}>
      <p className="text-xs font-semibold text-gray-400 uppercase">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${warn ? "text-red-600" : accent ? "text-[#40721D]" : "text-gray-900"}`}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-0.5">
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
        {trend !== undefined && trend !== 0 && (
          <span className={`text-xs font-medium ${trendColor}`}>
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
          <label className="text-sm text-gray-600">Date:</label>
          <input type="date" name="date" defaultValue={targetDate}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
          <input type="hidden" name="tab" value="fills" />
          <button type="submit" className="px-3 py-1.5 bg-[#40721D] text-white text-sm rounded-lg hover:bg-[#2D5114]">Go</button>
        </form>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{fills.length} fill(s) on {targetDate}</p>
          <ReportsExportButton tab="fills" date={targetDate} />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rx#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Drug / Formula</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lot / Batch</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fill #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fills.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No fills for this date</td></tr>
            ) : fills.map((fill: any) => (
              <tr key={fill.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(fill.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-[#40721D]">
                  <Link href={`/prescriptions/${fill.prescription.id}`} className="hover:underline">
                    {fill.prescription.rxNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {fill.prescription.patient.lastName}, {fill.prescription.patient.firstName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {fill.prescription.item?.name || fill.prescription.formula?.name || "—"}
                  {fill.prescription.item?.strength && <span className="text-gray-400 ml-1">{fill.prescription.item.strength}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{Number(fill.quantity)}</td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                  {fill.itemLot?.lotNumber || fill.batch?.batchNumber || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  #{fill.fillNumber} {fill.fillNumber === 0 ? "(Orig)" : "(Refill)"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    fill.status === "dispensed" ? "bg-green-50 text-green-700"
                      : fill.status === "pending" ? "bg-yellow-50 text-yellow-700"
                      : "bg-blue-50 text-blue-700"
                  }`}>{fill.status}</span>
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
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Items</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <p className="text-xs font-semibold text-red-400 uppercase">Low Stock</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{lowStock.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-yellow-200 p-4">
            <p className="text-xs font-semibold text-yellow-500 uppercase">Expiring (90d)</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{expiring.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase">Compound Items</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{items.filter(i => i.isCompoundIngredient).length}</p>
          </div>
        </div>
        <ReportsExportButton tab="inventory" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">NDC</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">On Hand</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reorder Pt</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lots</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Earliest Exp</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className={`hover:bg-gray-50 ${item.isLow ? "bg-red-50" : ""}`}>
                <td className="px-4 py-3">
                  <Link href={`/inventory/${item.id}`} className="text-sm font-medium text-[#40721D] hover:underline">
                    {item.name}
                  </Link>
                  {item.strength && <p className="text-xs text-gray-400">{item.strength}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.ndc || "—"}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {item.totalOnHand} {item.unitOfMeasure || ""}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.reorderPoint ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.lotCount}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {item.earliestExp ? formatDate(item.earliestExp) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {item.isLow && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">LOW</span>}
                    {item.isCompoundIngredient && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">CPD</span>}
                    {item.isRefrigerated && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">COLD</span>}
                    {item.isControlled && <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">C-II</span>}
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

  const STATUS_COLORS: Record<string, string> = {
    in_progress: "bg-yellow-50 text-yellow-700",
    completed: "bg-blue-50 text-blue-700",
    verified: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <form className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From:</label>
          <input type="date" name="startDate" defaultValue={start}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
          <label className="text-sm text-gray-600">To:</label>
          <input type="date" name="endDate" defaultValue={end}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg" />
          <input type="hidden" name="tab" value="batches" />
          <button type="submit" className="px-3 py-1.5 bg-[#40721D] text-white text-sm rounded-lg hover:bg-[#2D5114]">Go</button>
        </form>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{batches.length} batch(es)</p>
          <ReportsExportButton tab="batches" startDate={start} endDate={end} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Batch #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Formula</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">BUD</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Compounder</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">QA</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fills</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {batches.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No batches in this range</td></tr>
            ) : batches.map((b: any) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/compounding/batches/${b.id}`} className="text-sm font-mono text-[#40721D] hover:underline">
                    {b.batchNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {b.formulaVersion.formula.name}
                  <span className="text-gray-400 ml-1 text-xs">{b.formulaVersion.formula.formulaCode}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{Number(b.quantityPrepared)} {b.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(b.budDate)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{b.compounder.firstName} {b.compounder.lastName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{b.qa.length}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{b.fills.length}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-700"}`}>
                    {b.status}
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
