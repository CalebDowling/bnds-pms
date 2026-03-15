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
  const where: any = {};
  if (startDate) {
    where.createdAt = { ...(where.createdAt || {}), gte: new Date(`${startDate}T00:00:00.000-06:00`) };
  }
  if (endDate) {
    where.createdAt = { ...(where.createdAt || {}), lte: new Date(`${endDate}T23:59:59.999-06:00`) };
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
