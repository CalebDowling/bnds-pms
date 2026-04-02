"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DateRange = {
  from: Date;
  to: Date;
};

export type KPISummary = {
  totalFills: number;
  totalRevenue: number;
  avgFillsPerDay: number;
  claimAcceptanceRate: number;
  activePatients: number;
  prevTotalFills: number;
  prevTotalRevenue: number;
  prevAvgFillsPerDay: number;
  prevClaimAcceptanceRate: number;
  prevActivePatients: number;
};

export type TrendPoint = {
  label: string;
  value: number;
};

export type RevenueByPayer = {
  payerType: string;
  revenue: number;
  fillCount: number;
  percentage: number;
};

export type RevenueByDay = {
  label: string;
  value: number;
};

export type ClaimsAnalytics = {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  acceptanceRate: number;
  rejectionRate: number;
  avgAdjudicationMinutes: number;
  topRejectionReasons: Array<{ code: string; count: number }>;
};

export type ProductivityMetrics = {
  fillsPerDay: number;
  avgTimeInQueue: Record<string, number>;
  techFills: Array<{ name: string; fills: number }>;
  verificationRate: number;
};

export type PatientMetric = {
  newPatientsThisPeriod: number;
  activeCount: number;
  inactiveCount: number;
  activeRatio: number;
  topPatients: Array<{ name: string; rxCount: number }>;
};

export type TopDrug = {
  name: string;
  ndc: string;
  fillCount: number;
  revenue: number;
  percentOfTotal: number;
};

export type PayerMixEntry = {
  planName: string;
  fillCount: number;
  revenue: number;
  percentage: number;
};

export type CompoundingMetrics = {
  totalBatches: number;
  topFormulas: Array<{ name: string; code: string; batchCount: number }>;
  avgBatchTimeMinutes: number;
  qaPassRate: number;
  qaTotalChecks: number;
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function getDateRange(preset: string): DateRange {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();

  switch (preset) {
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    case "ytd":
      from.setMonth(0, 1);
      break;
    default:
      from.setDate(from.getDate() - 30);
  }
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function getPreviousPeriod(range: DateRange): DateRange {
  const diff = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - diff),
    to: new Date(range.from.getTime() - 1),
  };
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export async function getAnalyticsDashboard(preset: string = "30d"): Promise<{
  kpis: KPISummary;
  range: { from: string; to: string; days: number; preset: string };
}> {
  await requireUser();

  const range = getDateRange(preset);
  const prev = getPreviousPeriod(range);
  const days = daysBetween(range.from, range.to);

  // Current period fills
  const currentFills = await prisma.prescriptionFill.aggregate({
    where: { createdAt: { gte: range.from, lte: range.to } },
    _count: true,
    _sum: { totalPrice: true },
  });

  // Previous period fills
  const prevFills = await prisma.prescriptionFill.aggregate({
    where: { createdAt: { gte: prev.from, lte: prev.to } },
    _count: true,
    _sum: { totalPrice: true },
  });

  // Current claims
  const currentClaims = await prisma.claim.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: { status: true },
  });
  const curApproved = currentClaims.filter((c) => c.status === "approved" || c.status === "paid").length;
  const curTotal = currentClaims.length || 1;

  // Previous claims
  const prevClaims = await prisma.claim.findMany({
    where: { createdAt: { gte: prev.from, lte: prev.to } },
    select: { status: true },
  });
  const prevApproved = prevClaims.filter((c) => c.status === "approved" || c.status === "paid").length;
  const prevTotal = prevClaims.length || 1;

  // Active patients
  const activePatients = await prisma.patient.count({
    where: { status: "active" },
  });
  // Approximate previous active by subtracting newly created in current period
  const newInPeriod = await prisma.patient.count({
    where: { createdAt: { gte: range.from, lte: range.to }, status: "active" },
  });

  const prevDays = daysBetween(prev.from, prev.to);

  return {
    kpis: {
      totalFills: currentFills._count,
      totalRevenue: Number(currentFills._sum.totalPrice ?? 0),
      avgFillsPerDay: Math.round((currentFills._count / days) * 10) / 10,
      claimAcceptanceRate: Math.round((curApproved / curTotal) * 1000) / 10,
      activePatients,
      prevTotalFills: prevFills._count,
      prevTotalRevenue: Number(prevFills._sum.totalPrice ?? 0),
      prevAvgFillsPerDay: Math.round((prevFills._count / prevDays) * 10) / 10,
      prevClaimAcceptanceRate: Math.round((prevApproved / prevTotal) * 1000) / 10,
      prevActivePatients: activePatients - newInPeriod,
    },
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      days,
      preset,
    },
  };
}

// ─── Dispensing Trends ───────────────────────────────────────────────────────

export async function getDispensingTrends(preset: string = "30d"): Promise<TrendPoint[]> {
  await requireUser();

  const range = getDateRange(preset);
  const days = daysBetween(range.from, range.to);

  const fills = await prisma.prescriptionFill.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: { createdAt: true },
  });

  // Build day buckets
  const dateMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(range.from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    dateMap[key] = 0;
  }

  fills.forEach((f) => {
    const key = f.createdAt.toISOString().split("T")[0];
    if (key in dateMap) dateMap[key]++;
  });

  return Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      label: date,
      value: count,
    }));
}

// ─── Revenue Analytics ───────────────────────────────────────────────────────

export async function getRevenueAnalytics(preset: string = "30d"): Promise<{
  byDay: RevenueByDay[];
  byPayer: RevenueByPayer[];
}> {
  await requireUser();

  const range = getDateRange(preset);
  const days = daysBetween(range.from, range.to);

  // Revenue by day from fills
  const fills = await prisma.prescriptionFill.findMany({
    where: { createdAt: { gte: range.from, lte: range.to }, totalPrice: { not: null } },
    select: { createdAt: true, totalPrice: true, claimId: true },
  });

  const dayMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(range.from);
    d.setDate(d.getDate() + i);
    dayMap[d.toISOString().split("T")[0]] = 0;
  }

  fills.forEach((f) => {
    const key = f.createdAt.toISOString().split("T")[0];
    if (key in dayMap) dayMap[key] += Number(f.totalPrice ?? 0);
  });

  const byDay: RevenueByDay[] = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({
      label: date,
      value: Math.round(val * 100) / 100,
    }));

  // Revenue by payer type: insurance vs cash vs charge
  const fillsWithClaims = await prisma.prescriptionFill.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: {
      totalPrice: true,
      claimId: true,
      claim: {
        select: {
          status: true,
          amountPaid: true,
        },
      },
      payments: {
        select: { paymentMethod: true, amount: true },
      },
    },
  });

  let insuranceRevenue = 0;
  let insuranceFills = 0;
  let cashRevenue = 0;
  let cashFills = 0;
  let chargeRevenue = 0;
  let chargeFills = 0;

  fillsWithClaims.forEach((f) => {
    const price = Number(f.totalPrice ?? 0);
    if (f.claim && (f.claim.status === "approved" || f.claim.status === "paid")) {
      insuranceRevenue += price;
      insuranceFills++;
    } else {
      // Check payment methods
      const hasCharge = f.payments.some((p) => p.paymentMethod === "charge_account");
      if (hasCharge) {
        chargeRevenue += price;
        chargeFills++;
      } else {
        cashRevenue += price;
        cashFills++;
      }
    }
  });

  const totalRev = insuranceRevenue + cashRevenue + chargeRevenue || 1;
  const byPayer: RevenueByPayer[] = [
    {
      payerType: "Insurance",
      revenue: Math.round(insuranceRevenue * 100) / 100,
      fillCount: insuranceFills,
      percentage: Math.round((insuranceRevenue / totalRev) * 1000) / 10,
    },
    {
      payerType: "Cash",
      revenue: Math.round(cashRevenue * 100) / 100,
      fillCount: cashFills,
      percentage: Math.round((cashRevenue / totalRev) * 1000) / 10,
    },
    {
      payerType: "Charge Account",
      revenue: Math.round(chargeRevenue * 100) / 100,
      fillCount: chargeFills,
      percentage: Math.round((chargeRevenue / totalRev) * 1000) / 10,
    },
  ];

  return { byDay, byPayer };
}

// ─── Claims Analytics ────────────────────────────────────────────────────────

export async function getClaimsAnalytics(preset: string = "30d"): Promise<ClaimsAnalytics> {
  await requireUser();

  const range = getDateRange(preset);

  const claims = await prisma.claim.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: {
      status: true,
      rejectionCodes: true,
      submittedAt: true,
      adjudicatedAt: true,
    },
  });

  const approved = claims.filter((c) => c.status === "approved" || c.status === "paid").length;
  const rejected = claims.filter((c) => c.status === "rejected").length;
  const pending = claims.filter((c) => c.status === "pending" || c.status === "submitted").length;
  const total = claims.length || 1;

  // Avg adjudication time
  let adjTimeSum = 0;
  let adjCount = 0;
  claims.forEach((c) => {
    if (c.submittedAt && c.adjudicatedAt) {
      const diffMs = c.adjudicatedAt.getTime() - c.submittedAt.getTime();
      adjTimeSum += diffMs / (1000 * 60); // minutes
      adjCount++;
    }
  });

  // Top rejection codes
  const codeMap: Record<string, number> = {};
  claims.forEach((c) => {
    if (c.rejectionCodes) {
      const codes = Array.isArray(c.rejectionCodes)
        ? (c.rejectionCodes as string[])
        : typeof c.rejectionCodes === "string"
          ? [c.rejectionCodes]
          : [];
      codes.forEach((code) => {
        const codeStr = String(code).trim();
        if (codeStr) codeMap[codeStr] = (codeMap[codeStr] || 0) + 1;
      });
    }
  });

  const topRejectionReasons = Object.entries(codeMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([code, count]) => ({ code, count }));

  return {
    total: claims.length,
    approved,
    rejected,
    pending,
    acceptanceRate: Math.round((approved / total) * 1000) / 10,
    rejectionRate: Math.round((rejected / total) * 1000) / 10,
    avgAdjudicationMinutes: adjCount > 0 ? Math.round(adjTimeSum / adjCount) : 0,
    topRejectionReasons,
  };
}

// ─── Productivity Metrics ────────────────────────────────────────────────────

export async function getProductivityMetrics(preset: string = "30d"): Promise<ProductivityMetrics> {
  await requireUser();

  const range = getDateRange(preset);
  const days = daysBetween(range.from, range.to);

  // Total fills in period
  const totalFills = await prisma.prescriptionFill.count({
    where: { createdAt: { gte: range.from, lte: range.to } },
  });

  // Fills per tech (filler)
  const techFills = await prisma.prescriptionFill.groupBy({
    by: ["filledBy"],
    where: {
      createdAt: { gte: range.from, lte: range.to },
      filledBy: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const techUsers = await Promise.all(
    techFills.map(async (tf) => {
      if (!tf.filledBy) return { name: "Unknown", fills: tf._count.id };
      const user = await prisma.user.findUnique({
        where: { id: tf.filledBy },
        select: { firstName: true, lastName: true },
      });
      return {
        name: user ? `${user.firstName} ${user.lastName}` : "Unknown",
        fills: tf._count.id,
      };
    })
  );

  // Avg time in each status (using fill events)
  const fills = await prisma.prescriptionFill.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: {
      createdAt: true,
      filledAt: true,
      verifiedAt: true,
      dispensedAt: true,
    },
  });

  let entryToFillSum = 0;
  let entryToFillCount = 0;
  let fillToVerifySum = 0;
  let fillToVerifyCount = 0;
  let verifyToDispenseSum = 0;
  let verifyToDispenseCount = 0;

  fills.forEach((f) => {
    if (f.filledAt) {
      const diff = (f.filledAt.getTime() - f.createdAt.getTime()) / (1000 * 60);
      entryToFillSum += diff;
      entryToFillCount++;
    }
    if (f.filledAt && f.verifiedAt) {
      const diff = (f.verifiedAt.getTime() - f.filledAt.getTime()) / (1000 * 60);
      fillToVerifySum += diff;
      fillToVerifyCount++;
    }
    if (f.verifiedAt && f.dispensedAt) {
      const diff = (f.dispensedAt.getTime() - f.verifiedAt.getTime()) / (1000 * 60);
      verifyToDispenseSum += diff;
      verifyToDispenseCount++;
    }
  });

  // Verification rate
  const verified = fills.filter((f) => f.verifiedAt !== null).length;
  const fillTotal = fills.length || 1;

  return {
    fillsPerDay: Math.round((totalFills / days) * 10) / 10,
    avgTimeInQueue: {
      "Entry to Fill": entryToFillCount > 0 ? Math.round(entryToFillSum / entryToFillCount) : 0,
      "Fill to Verify": fillToVerifyCount > 0 ? Math.round(fillToVerifySum / fillToVerifyCount) : 0,
      "Verify to Dispense": verifyToDispenseCount > 0 ? Math.round(verifyToDispenseSum / verifyToDispenseCount) : 0,
    },
    techFills: techUsers,
    verificationRate: Math.round((verified / fillTotal) * 1000) / 10,
  };
}

// ─── Patient Metrics ─────────────────────────────────────────────────────────

export async function getPatientMetrics(preset: string = "30d"): Promise<PatientMetric> {
  await requireUser();

  const range = getDateRange(preset);

  const newPatients = await prisma.patient.count({
    where: { createdAt: { gte: range.from, lte: range.to } },
  });

  const activeCount = await prisma.patient.count({
    where: { status: "active" },
  });

  const inactiveCount = await prisma.patient.count({
    where: { status: { not: "active" } },
  });

  const total = activeCount + inactiveCount || 1;

  // Top patients by Rx count in period
  const topPatientsRaw = await prisma.prescription.groupBy({
    by: ["patientId"],
    where: { createdAt: { gte: range.from, lte: range.to } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const topPatients = await Promise.all(
    topPatientsRaw.map(async (p) => {
      const patient = await prisma.patient.findUnique({
        where: { id: p.patientId },
        select: { firstName: true, lastName: true },
      });
      return {
        name: patient ? `${patient.lastName}, ${patient.firstName}` : "Unknown",
        rxCount: p._count.id,
      };
    })
  );

  return {
    newPatientsThisPeriod: newPatients,
    activeCount,
    inactiveCount,
    activeRatio: Math.round((activeCount / total) * 1000) / 10,
    topPatients,
  };
}

// ─── Top Drugs ───────────────────────────────────────────────────────────────

export async function getTopDrugs(
  preset: string = "30d",
  limit: number = 10
): Promise<TopDrug[]> {
  await requireUser();

  const range = getDateRange(preset);

  const drugFills = await prisma.prescriptionFill.groupBy({
    by: ["itemId"],
    where: {
      createdAt: { gte: range.from, lte: range.to },
      itemId: { not: null },
    },
    _count: { id: true },
    _sum: { totalPrice: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const totalFills = drugFills.reduce((sum, d) => sum + d._count.id, 0) || 1;

  const results = await Promise.all(
    drugFills.map(async (d) => {
      const item = await prisma.item.findUnique({
        where: { id: d.itemId! },
        select: { name: true, strength: true, ndc: true },
      });
      return {
        name: item ? `${item.name}${item.strength ? ` ${item.strength}` : ""}` : "Unknown",
        ndc: item?.ndc ?? "N/A",
        fillCount: d._count.id,
        revenue: Math.round(Number(d._sum.totalPrice ?? 0) * 100) / 100,
        percentOfTotal: Math.round((d._count.id / totalFills) * 1000) / 10,
      };
    })
  );

  return results;
}

// ─── Payer Mix ───────────────────────────────────────────────────────────────

export async function getPayerMix(preset: string = "30d"): Promise<PayerMixEntry[]> {
  await requireUser();

  const range = getDateRange(preset);

  // Get claims with insurance plan info
  const claims = await prisma.claim.findMany({
    where: {
      createdAt: { gte: range.from, lte: range.to },
      status: { in: ["approved", "paid"] },
    },
    select: {
      amountPaid: true,
      insurance: {
        select: {
          thirdPartyPlan: {
            select: { planName: true },
          },
        },
      },
    },
  });

  const planMap: Record<string, { fillCount: number; revenue: number }> = {};

  claims.forEach((c) => {
    const planName = c.insurance?.thirdPartyPlan?.planName ?? "Unknown Plan";
    if (!planMap[planName]) planMap[planName] = { fillCount: 0, revenue: 0 };
    planMap[planName].fillCount++;
    planMap[planName].revenue += Number(c.amountPaid ?? 0);
  });

  const totalFills = Object.values(planMap).reduce((s, p) => s + p.fillCount, 0) || 1;

  return Object.entries(planMap)
    .sort(([, a], [, b]) => b.fillCount - a.fillCount)
    .map(([planName, data]) => ({
      planName,
      fillCount: data.fillCount,
      revenue: Math.round(data.revenue * 100) / 100,
      percentage: Math.round((data.fillCount / totalFills) * 1000) / 10,
    }));
}

// ─── Compounding Metrics ─────────────────────────────────────────────────────

export async function getCompoundingMetrics(preset: string = "30d"): Promise<CompoundingMetrics> {
  await requireUser();

  const range = getDateRange(preset);

  // Total batches
  const totalBatches = await prisma.batch.count({
    where: { createdAt: { gte: range.from, lte: range.to } },
  });

  // Top formulas
  const batchesByFormula = await prisma.batch.groupBy({
    by: ["formulaVersionId"],
    where: { createdAt: { gte: range.from, lte: range.to } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const topFormulas = await Promise.all(
    batchesByFormula.map(async (b) => {
      const fv = await prisma.formulaVersion.findUnique({
        where: { id: b.formulaVersionId },
        select: {
          formula: {
            select: { name: true, formulaCode: true },
          },
        },
      });
      return {
        name: fv?.formula?.name ?? "Unknown",
        code: fv?.formula?.formulaCode ?? "N/A",
        batchCount: b._count.id,
      };
    })
  );

  // Avg batch time (compoundedAt - createdAt)
  const batches = await prisma.batch.findMany({
    where: {
      createdAt: { gte: range.from, lte: range.to },
      compoundedAt: { not: null },
    },
    select: { createdAt: true, compoundedAt: true },
  });

  let batchTimeSum = 0;
  let batchTimeCount = 0;
  batches.forEach((b) => {
    if (b.compoundedAt) {
      const diffMin = (b.compoundedAt.getTime() - b.createdAt.getTime()) / (1000 * 60);
      batchTimeSum += diffMin;
      batchTimeCount++;
    }
  });

  // QA pass rate
  const qaChecks = await prisma.batchQa.findMany({
    where: {
      performedAt: { gte: range.from, lte: range.to },
    },
    select: { result: true },
  });

  const qaPassed = qaChecks.filter((q) => q.result === "pass" || q.result === "passed").length;
  const qaTotal = qaChecks.length || 1;

  return {
    totalBatches,
    topFormulas,
    avgBatchTimeMinutes: batchTimeCount > 0 ? Math.round(batchTimeSum / batchTimeCount) : 0,
    qaPassRate: Math.round((qaPassed / qaTotal) * 1000) / 10,
    qaTotalChecks: qaChecks.length,
  };
}
