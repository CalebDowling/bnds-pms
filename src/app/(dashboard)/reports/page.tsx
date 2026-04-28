/**
 * /reports — Reports overview (real data).
 *
 * Replaces the previous mock-data Reports page (hardcoded "$184,212"
 * revenue, fake top-drugs list) with real numbers from getAnalytics()
 * and getTopDrugs(). The existing actions are comprehensive — this
 * page just connects them to the UI.
 *
 * Tabs (Overview / Fills / Revenue / Inventory / Staff / Compliance)
 * are still present; only Overview is fully populated below — the
 * other tabs link out to the existing dedicated pages
 * (/reports/builder, /compliance/*, /billing/*, /inventory).
 */
import { getAnalytics, getTopDrugs } from "./actions";
import { formatItemDisplayName } from "@/lib/utils/formatters";
import ReportsClient, { type ReportsData } from "./ReportsClient";

export const dynamic = "force-dynamic";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pctDelta(thisVal: number, lastVal: number): { dir: "up" | "down"; label: string } | null {
  if (lastVal <= 0) return null;
  const pct = ((thisVal - lastVal) / lastVal) * 100;
  return {
    dir: pct >= 0 ? "up" : "down",
    label: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs last`,
  };
}

export default async function ReportsPage() {
  // getAnalytics returns the heavy aggregate. getTopDrugs needs date-
  // ONLY strings (YYYY-MM-DD) — internally it appends a time-of-day
  // string. Passing toISOString() blows up because it concatenates two
  // time portions ("...000ZT00:00:00.000-06:00" → invalid Date).
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateOnly = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [analytics, topDrugs] = await Promise.all([
    getAnalytics(),
    getTopDrugs(dateOnly(startOfMonth), dateOnly(now), 6),
  ]);

  // Top drug colors — fixed palette so the bars stay BNDS heritage.
  const COLORS = [
    "var(--bnds-forest)",
    "var(--bnds-leaf)",
    "#7ab85f",
    "var(--info)",
    "var(--warn)",
    "#d97a2a",
  ];

  const data: ReportsData = {
    monthLabel: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    kpis: {
      fillsMtd: analytics.prescriptions.fillsThisMonth,
      fillsTrend: pctDelta(
        analytics.prescriptions.fillsThisMonth,
        analytics.prescriptions.fillsLastMonth
      ),
      revenueMtd: analytics.revenue.thisMonth + analytics.revenue.posThisMonth,
      revenueTrend: pctDelta(
        analytics.revenue.thisMonth + analytics.revenue.posThisMonth,
        analytics.revenue.lastMonth
      ),
      collectionRate: analytics.claims.collectionRate,
      avgDaysToPay: analytics.claims.avgDaysToPay,
    },
    dailyFills: analytics.prescriptions.dailyFillData,
    // getTopDrugs returns { name, fills, revenue } — name is already
    // formatted by the action ("Lisinopril (10mg)"), so we just trust
    // it. fills is the count we want; revenue is unused here.
    topDrugs: (topDrugs as Array<{ name: string; fills: number; revenue: number }>).map((d, i) => ({
      name: d.name,
      count: d.fills,
      color: COLORS[i % COLORS.length],
    })),
    revenueMix: [
      {
        label: "Insurance reimb.",
        value: fmtMoney(analytics.claims.totalPaid),
        rawValue: analytics.claims.totalPaid,
        color: "var(--bnds-forest)",
      },
      {
        label: "Cash / OTC (POS)",
        value: fmtMoney(analytics.revenue.posThisMonth),
        rawValue: analytics.revenue.posThisMonth,
        color: "var(--bnds-leaf)",
      },
    ],
    inventory: {
      activeLots: analytics.inventory.activeLots,
      lowStock: analytics.inventory.lowStock,
      expiringSoon: analytics.inventory.expiringSoon,
      expired: analytics.inventory.expired,
    },
  };

  return <ReportsClient data={data} />;
}
