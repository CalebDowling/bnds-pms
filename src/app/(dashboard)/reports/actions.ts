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
