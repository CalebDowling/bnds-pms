"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getDailyFillReport(date?: string) {
  const targetDate = date || new Date().toISOString().split("T")[0];
  // Use the date string directly to avoid timezone issues
  // Target: midnight to midnight in local time (CST/CDT = UTC-5/6)
  const startOfDay = new Date(`${targetDate}T00:00:00.000-06:00`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999-06:00`);

  const fills = await prisma.prescriptionFill.findMany({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    include: {
      prescription: {
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
          prescriber: { select: { firstName: true, lastName: true } },
          item: { select: { name: true, strength: true } },
          formula: { select: { name: true } },
        },
      },
      filler: { select: { firstName: true, lastName: true } },
      verifier: { select: { firstName: true, lastName: true } },
      itemLot: { select: { lotNumber: true } },
      batch: { select: { batchNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return fills;
}

export async function getInventoryReport() {
  const items = await prisma.item.findMany({
    where: { isActive: true },
    include: {
      lots: {
        where: { status: "available" },
        select: { quantityOnHand: true, expirationDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return items.map((item) => {
    const totalOnHand = item.lots.reduce((sum, l) => sum + Number(l.quantityOnHand), 0);
    const earliestExp = item.lots.length > 0
      ? item.lots.reduce((earliest, l) =>
          l.expirationDate < earliest ? l.expirationDate : earliest,
          item.lots[0].expirationDate
        )
      : null;
    const isLow = item.reorderPoint ? totalOnHand < Number(item.reorderPoint) : false;

    return {
      id: item.id,
      name: item.name,
      genericName: item.genericName,
      strength: item.strength,
      ndc: item.ndc,
      unitOfMeasure: item.unitOfMeasure,
      totalOnHand,
      reorderPoint: item.reorderPoint ? Number(item.reorderPoint) : null,
      lotCount: item.lots.length,
      earliestExp,
      isLow,
      isCompoundIngredient: item.isCompoundIngredient,
      isRefrigerated: item.isRefrigerated,
      isControlled: item.isControlled,
    };
  });
}
export async function getBatchReport(startDate?: string, endDate?: string) {
  const where: Prisma.BatchWhereInput = {};
  const dateFilter: any = {};
  
  if (startDate) {
    dateFilter.gte = new Date(`${startDate}T00:00:00.000-06:00`);
  }
  if (endDate) {
    dateFilter.lte = new Date(`${endDate}T23:59:59.999-06:00`);
  }
  
  if (Object.keys(dateFilter).length > 0) {
    where.createdAt = dateFilter;
  }

  return prisma.batch.findMany({
    where,
    include: {
      formulaVersion: {
        include: { formula: { select: { name: true, formulaCode: true } } },
      },
      compounder: { select: { firstName: true, lastName: true } },
      verifier: { select: { firstName: true, lastName: true } },
      _count: { select: { qa: true, fills: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ═══════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════

export async function getAnalytics() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  // ─── Revenue & Financial ───
  const [
    revenueThisMonth,
    revenueLastMonth,
    revenueToday,
    posToday,
    posThisMonth,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { processedAt: { gte: startOfMonth }, status: "completed" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { processedAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: "completed" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { processedAt: { gte: today }, status: "completed" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.posTransaction.aggregate({
      where: { processedAt: { gte: today } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.posTransaction.aggregate({
      where: { processedAt: { gte: startOfMonth } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  // ─── Prescription KPIs ───
  const [
    fillsToday,
    fillsThisWeek,
    fillsThisMonth,
    fillsLastMonth,
    newRxThisMonth,
    refillsThisMonth,
  ] = await Promise.all([
    prisma.prescriptionFill.count({ where: { createdAt: { gte: today } } }),
    prisma.prescriptionFill.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.prescriptionFill.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.prescriptionFill.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.prescriptionFill.count({ where: { createdAt: { gte: startOfMonth }, fillNumber: 0 } }),
    prisma.prescriptionFill.count({ where: { createdAt: { gte: startOfMonth }, fillNumber: { gt: 0 } } }),
  ]);

  // ─── Claims Performance ───
  const [
    claimsByStatus,
    claimsPaidThisMonth,
    claimsRejectedThisMonth,
    avgTimeToPayRaw,
  ] = await Promise.all([
    prisma.claim.groupBy({
      by: ["status"],
      _count: true,
      _sum: { amountBilled: true, amountPaid: true },
    }),
    prisma.claim.count({ where: { paidAt: { gte: startOfMonth }, status: { in: ["paid", "partial"] } } }),
    prisma.claim.count({ where: { adjudicatedAt: { gte: startOfMonth }, status: "rejected" } }),
    // Calculate average days to payment for paid claims this month
    prisma.claim.findMany({
      where: { paidAt: { gte: startOfMonth }, submittedAt: { not: null }, status: { in: ["paid", "partial"] } },
      select: { submittedAt: true, paidAt: true },
    }),
  ]);

  const avgDaysToPay = avgTimeToPayRaw.length > 0
    ? avgTimeToPayRaw.reduce((sum, c) => {
        const submitted = new Date(c.submittedAt!).getTime();
        const paid = new Date(c.paidAt!).getTime();
        return sum + (paid - submitted) / (1000 * 60 * 60 * 24);
      }, 0) / avgTimeToPayRaw.length
    : null;

  const totalClaims = claimsByStatus.reduce((sum, g) => sum + g._count, 0);
  const rejectedCount = claimsByStatus.find(g => g.status === "rejected")?._count || 0;
  const rejectionRate = totalClaims > 0 ? (rejectedCount / totalClaims * 100) : 0;
  const totalBilled = claimsByStatus.reduce((sum, g) => sum + Number(g._sum.amountBilled || 0), 0);
  const totalPaid = claimsByStatus.reduce((sum, g) => sum + Number(g._sum.amountPaid || 0), 0);
  const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled * 100) : 0;

  // ─── Inventory Metrics ───
  const [
    totalActiveLots,
    lowStockCount,
    expiringSoonCount,
    expiredCount,
  ] = await Promise.all([
    prisma.itemLot.count({ where: { quantityOnHand: { gt: 0 }, status: "available" } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT i.id) as count FROM items i
      JOIN item_lots l ON l.item_id = i.id
      WHERE i.is_active = true
        AND i.reorder_point IS NOT NULL
        AND i.reorder_point > 0
        AND (SELECT COALESCE(SUM(il.quantity_on_hand), 0) FROM item_lots il WHERE il.item_id = i.id AND il.status = 'available') < i.reorder_point
    `.then(r => Number(r[0]?.count || 0)),
    prisma.itemLot.count({
      where: {
        quantityOnHand: { gt: 0 },
        status: "available",
        expirationDate: {
          gt: now,
          lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.itemLot.count({
      where: {
        quantityOnHand: { gt: 0 },
        status: "available",
        expirationDate: { lt: now },
      },
    }),
  ]);

  // ─── Daily fill counts for last 14 days (chart data) ───
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 13);

  const dailyFills = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT DATE(created_at AT TIME ZONE 'America/Chicago') as day, COUNT(*) as count
    FROM prescription_fills
    WHERE created_at >= ${fourteenDaysAgo}
    GROUP BY day
    ORDER BY day ASC
  `;

  const dailyFillData = dailyFills.map(d => ({
    date: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    fills: Number(d.count),
  }));

  return {
    revenue: {
      today: Number(revenueToday._sum.amount || 0),
      thisMonth: Number(revenueThisMonth._sum.amount || 0),
      lastMonth: Number(revenueLastMonth._sum.amount || 0),
      paymentsThisMonth: revenueThisMonth._count,
      posToday: Number(posToday._sum.total || 0),
      posTxToday: posToday._count,
      posThisMonth: Number(posThisMonth._sum.total || 0),
    },
    prescriptions: {
      fillsToday,
      fillsThisWeek,
      fillsThisMonth,
      fillsLastMonth,
      newRxThisMonth,
      refillsThisMonth,
      dailyFillData,
    },
    claims: {
      byStatus: claimsByStatus.map(g => ({
        status: g.status,
        count: g._count,
        billed: Number(g._sum.amountBilled || 0),
        paid: Number(g._sum.amountPaid || 0),
      })),
      paidThisMonth: claimsPaidThisMonth,
      rejectedThisMonth: claimsRejectedThisMonth,
      rejectionRate: Math.round(rejectionRate * 10) / 10,
      collectionRate: Math.round(collectionRate * 10) / 10,
      avgDaysToPay: avgDaysToPay !== null ? Math.round(avgDaysToPay * 10) / 10 : null,
      totalBilled,
      totalPaid,
    },
    inventory: {
      activeLots: totalActiveLots,
      lowStock: lowStockCount,
      expiringSoon: expiringSoonCount,
      expired: expiredCount,
    },
  };
}

// ═══════════════════════════════════════════════
// REPORTING DASHBOARD - NEW FUNCTIONS
// ═══════════════════════════════════════════════

export async function getRxVolumeData(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000-06:00`);
  const end = new Date(`${endDate}T23:59:59.999-06:00`);

  const dailyData = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT DATE(created_at AT TIME ZONE 'America/Chicago') as day, COUNT(*) as count
    FROM prescription_fills
    WHERE created_at >= ${start}
      AND created_at <= ${end}
    GROUP BY day
    ORDER BY day ASC
  `;

  return dailyData.map(d => ({
    date: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    volume: Number(d.count),
  }));
}

export async function getRevenueByCategory(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000-06:00`);
  const end = new Date(`${endDate}T23:59:59.999-06:00`);

  // Get revenue breakdown by prescription type (compound vs retail vs mail-order)
  const data = await prisma.prescriptionFill.groupBy({
    by: ["status"],
    where: {
      createdAt: { gte: start, lte: end },
    },
    _sum: { totalPrice: true },
    _count: true,
  });

  // Get compound vs non-compound breakdown
  const byCompound = await prisma.prescriptionFill.aggregate({
    where: {
      createdAt: { gte: start, lte: end },
      prescription: { isCompound: true },
    },
    _sum: { totalPrice: true },
  });

  const nonCompound = await prisma.prescriptionFill.aggregate({
    where: {
      createdAt: { gte: start, lte: end },
      prescription: { isCompound: false },
    },
    _sum: { totalPrice: true },
  });

  const compoundRevenue = Number(byCompound._sum.totalPrice || 0);
  const retailRevenue = Number(nonCompound._sum.totalPrice || 0);

  return [
    {
      name: "Compounds",
      value: compoundRevenue,
      percentage: compoundRevenue + retailRevenue > 0
        ? Math.round((compoundRevenue / (compoundRevenue + retailRevenue)) * 100)
        : 0,
    },
    {
      name: "Retail",
      value: retailRevenue,
      percentage: compoundRevenue + retailRevenue > 0
        ? Math.round((retailRevenue / (compoundRevenue + retailRevenue)) * 100)
        : 0,
    },
    {
      name: "Mail Order",
      value: 0, // Would need additional field in schema to track
      percentage: 0,
    },
  ];
}

export async function getTopDrugs(startDate: string, endDate: string, limit: number = 10) {
  const start = new Date(`${startDate}T00:00:00.000-06:00`);
  const end = new Date(`${endDate}T23:59:59.999-06:00`);

  const topDrugs = await prisma.prescriptionFill.groupBy({
    by: ["itemId"],
    where: {
      createdAt: { gte: start, lte: end },
      itemId: { not: null },
    },
    _count: true,
    _sum: { totalPrice: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  // Get item details
  const itemIds = topDrugs.map(d => d.itemId).filter(Boolean) as string[];
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, strength: true },
  });

  const itemMap = new Map(items.map(i => [i.id, i]));

  return topDrugs.map(d => {
    const item = itemMap.get(d.itemId || "");
    const name = item
      ? `${item.name}${item.strength ? ` (${item.strength})` : ""}`
      : "Unknown";
    return {
      name,
      fills: typeof d._count === "number" ? d._count : 0,
      revenue: Number(d._sum?.totalPrice || 0),
    };
  });
}

export async function getTurnaroundTimes(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000-06:00`);
  const end = new Date(`${endDate}T23:59:59.999-06:00`);

  // Get intake to fill times
  const fills = await prisma.prescriptionFill.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      filledAt: { not: null },
    },
    select: {
      id: true,
      createdAt: true,
      filledAt: true,
      prescription: {
        select: {
          dateReceived: true,
        },
      },
    },
  });

  if (fills.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      percentile95: 0,
      byHour: [] as Array<{ hour: string; avgMinutes: number }>,
    };
  }

  // Calculate turnaround times in minutes
  const turnaroundTimes = fills
    .map(f => {
      const received = new Date(f.prescription.dateReceived).getTime();
      const filled = new Date(f.filledAt!).getTime();
      return (filled - received) / (1000 * 60); // minutes
    })
    .filter(t => t > 0);

  if (turnaroundTimes.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      percentile95: 0,
      byHour: [] as Array<{ hour: string; avgMinutes: number }>,
    };
  }

  const sorted = [...turnaroundTimes].sort((a, b) => a - b);
  const average = turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length;
  const percentile95 = sorted[Math.floor(sorted.length * 0.95)];

  // Group by hour of day
  const byHour: Record<number, number[]> = {};
  fills.forEach(f => {
    const hour = new Date(f.filledAt!).getHours();
    const received = new Date(f.prescription.dateReceived).getTime();
    const filled = new Date(f.filledAt!).getTime();
    const minutes = (filled - received) / (1000 * 60);
    if (minutes > 0) {
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push(minutes);
    }
  });

  const byHourData = Object.entries(byHour)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([hour, times]) => ({
      hour: `${hour}:00`,
      avgMinutes: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    }));

  return {
    average: Math.round(average),
    min: Math.round(Math.min(...turnaroundTimes)),
    max: Math.round(Math.max(...turnaroundTimes)),
    percentile95: Math.round(percentile95),
    byHour: byHourData,
  };
}

// ═══════════════════════════════════════════════
// REVENUE & TURNAROUND REPORTS
// ═══════════════════════════════════════════════

export async function getRevenueSummary(startDate?: string, endDate?: string) {
  const where: Prisma.PrescriptionFillWhereInput = {};

  if (startDate || endDate) {
    where.dispensedAt = {};
    if (startDate) {
      (where.dispensedAt as any).gte = new Date(`${startDate}T00:00:00.000-06:00`);
    }
    if (endDate) {
      (where.dispensedAt as any).lte = new Date(`${endDate}T23:59:59.999-06:00`);
    }
  }

  const fills = await prisma.prescriptionFill.findMany({
    where,
    select: {
      copayAmount: true,
      dispensingFee: true,
      ingredientCost: true,
      totalPrice: true,
    },
  });

  const copayTotal = fills.reduce((sum, f) => sum + (Number(f.copayAmount || 0)), 0);
  const feeTotal = fills.reduce((sum, f) => sum + (Number(f.dispensingFee || 0)), 0);
  const costTotal = fills.reduce((sum, f) => sum + (Number(f.ingredientCost || 0)), 0);
  const priceTotal = fills.reduce((sum, f) => sum + (Number(f.totalPrice || 0)), 0);

  return {
    fillCount: fills.length,
    copayTotal,
    insurancePayments: priceTotal - copayTotal,
    totalRevenue: priceTotal,
    totalCost: costTotal,
    totalFees: feeTotal,
    grossMargin: priceTotal > 0 ? ((priceTotal - costTotal) / priceTotal) * 100 : 0,
  };
}

export async function getTurnaroundReport(startDate?: string, endDate?: string) {
  const where: Prisma.PrescriptionFillWhereInput = {};

  if (startDate || endDate) {
    where.dispensedAt = {};
    if (startDate) {
      (where.dispensedAt as any).gte = new Date(`${startDate}T00:00:00.000-06:00`);
    }
    if (endDate) {
      (where.dispensedAt as any).lte = new Date(`${endDate}T23:59:59.999-06:00`);
    }
  }

  where.dispensedAt = { not: null };

  const fills = await prisma.prescriptionFill.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      filledAt: true,
      verifiedAt: true,
      dispensedAt: true,
    },
  });

  const turnarounds = fills
    .filter((f) => f.filledAt && f.dispensedAt)
    .map((f) => {
      const filledTime = new Date(f.filledAt!).getTime();
      const dispensedTime = new Date(f.dispensedAt!).getTime();
      const hours = (dispensedTime - filledTime) / (1000 * 60 * 60);
      return { intakeToFilled: 0, filledToDispensed: hours, totalHours: hours };
    });

  const avgFilledToDispensed = turnarounds.length > 0
    ? turnarounds.reduce((sum, t) => sum + t.filledToDispensed, 0) / turnarounds.length
    : 0;

  return {
    sampleCount: turnarounds.length,
    avgHoursFilledToDispensed: Math.round(avgFilledToDispensed * 10) / 10,
    medianHours: turnarounds.length > 0
      ? turnarounds.sort((a, b) => a.filledToDispensed - b.filledToDispensed)[
          Math.floor(turnarounds.length / 2)
        ].filledToDispensed
      : 0,
    minHours: turnarounds.length > 0
      ? Math.min(...turnarounds.map((t) => t.filledToDispensed))
      : 0,
    maxHours: turnarounds.length > 0
      ? Math.max(...turnarounds.map((t) => t.filledToDispensed))
      : 0,
  };
}

export async function getInventoryValueReport() {
  const lots = await prisma.itemLot.findMany({
    where: { status: "available" },
    include: {
      item: {
        select: { name: true, strength: true, unitOfMeasure: true },
      },
    },
  });

  const items = lots.map((lot) => ({
    itemName: `${lot.item.name}${lot.item.strength ? ` ${lot.item.strength}` : ""}`,
    quantity: Number(lot.quantityOnHand),
    unitCost: Number(lot.unitCost || 0),
    value: Number(lot.quantityOnHand) * Number(lot.unitCost || 0),
  }));

  const totalValue = items.reduce((sum, i) => sum + i.value, 0);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    totalQuantity,
    itemCount: lots.length,
    items: items.sort((a, b) => b.value - a.value).slice(0, 10),
  };
}

export async function getClaimsPerformanceReport(startDate?: string, endDate?: string) {
  const where: Prisma.ClaimWhereInput = {};

  if (startDate || endDate) {
    where.submittedAt = {};
    if (startDate) {
      (where.submittedAt as any).gte = new Date(`${startDate}T00:00:00.000-06:00`);
    }
    if (endDate) {
      (where.submittedAt as any).lte = new Date(`${endDate}T23:59:59.999-06:00`);
    }
  }

  where.submittedAt = { not: null };

  const claims = await prisma.claim.findMany({
    where,
    select: {
      id: true,
      status: true,
      amountBilled: true,
      amountPaid: true,
      submittedAt: true,
      adjudicatedAt: true,
    },
  });

  const submitted = claims.length;
  const approved = claims.filter((c) => c.status === "paid").length;
  const rejected = claims.filter((c) => c.status === "rejected").length;
  const pending = claims.filter((c) => c.status === "pending").length;

  const totalBilled = claims.reduce((sum, c) => sum + Number(c.amountBilled), 0);
  const totalPaid = claims.reduce((sum, c) => sum + Number(c.amountPaid || 0), 0);

  return {
    submitted,
    approved,
    rejected,
    pending,
    approvalRate: submitted > 0 ? Math.round((approved / submitted) * 1000) / 10 : 0,
    rejectionRate: submitted > 0 ? Math.round((rejected / submitted) * 1000) / 10 : 0,
    totalBilled,
    totalPaid,
    collectionRate: totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 1000) / 10 : 0,
  };
}
