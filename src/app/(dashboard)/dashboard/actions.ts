"use server";

export async function getDashboardData() {
  const { prisma } = await import("@/lib/prisma");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const fallback = {
    patientsToday: 0,
    rxToday: 0,
    rxYesterday: 0,
    activeItems: 0,
    doctorsOnFile: 0,
    pendingBatches: 0,
    lowStockItems: 0,
    salesToday: 0,
    revenueToday: 0,
    pendingRefills: 0,
    expiringLots: 0,
    rejectedClaims: 0,
  };

  try {
    const [p, r, ry, i, d, b, l, s, rev, prf, exp, c] = await Promise.all([
      prisma.patient.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
      prisma.prescription.count({ where: { dateReceived: { gte: today } } }).catch(() => 0),
      prisma.prescription.count({ where: { dateReceived: { gte: yesterday, lt: today } } }).catch(() => 0),
      prisma.item.count({ where: { isActive: true } }).catch(() => 0),
      prisma.prescriber.count().catch(() => 0),
      prisma.batch.count({ where: { status: "in_progress" } }).catch(() => 0),
      prisma.item.count({ where: { isActive: true, reorderPoint: { gt: 0 } } }).catch(() => 0),
      prisma.posTransaction.count({ where: { processedAt: { gte: today } } }).catch(() => 0),
      prisma.posTransaction.aggregate({ where: { processedAt: { gte: today } }, _sum: { total: true } }).then(res => res._sum?.total?.toNumber() || 0).catch(() => 0),
      prisma.refillRequest.count({ where: { status: "pending" } }).catch(() => 0),
      prisma.itemLot.count({ where: { expirationDate: { lte: thirtyDaysFromNow, gt: today }, status: "available" } }).catch(() => 0),
      prisma.claim.count({ where: { status: "rejected" } }).catch(() => 0),
    ]);
    return {
      patientsToday: p,
      rxToday: r,
      rxYesterday: ry,
      activeItems: i,
      doctorsOnFile: d,
      pendingBatches: b,
      lowStockItems: l,
      salesToday: s,
      revenueToday: rev,
      pendingRefills: prf,
      expiringLots: exp,
      rejectedClaims: c,
    };
  } catch {
    return fallback;
  }
}

export async function getQueueCounts() {
  const fallback = {
    intake: 0,
    sync: 0,
    reject: 0,
    print: 0,
    scan: 0,
    verify: 0,
    oos: 0,
    waiting_bin: 0,
    renewals: 0,
    todo: 0,
    price_check: 0,
    prepay: 0,
    ok_to_charge: 0,
    decline: 0,
    ok_to_charge_clinic: 0,
    mochi: 0,
  };

  try {
    // Fetch live fill counts directly from DRX API (parallel calls with limit=1).
    // Reads the "total" field from each response — no DB sync needed.
    const { fetchAllQueueCounts } = await import("@/lib/drx/client");
    const { prisma } = await import("@/lib/prisma");

    const [drxCounts, renewals] = await Promise.all([
      fetchAllQueueCounts(),
      // Renewals = pending refill requests (from our DB)
      prisma.refillRequest.count({ where: { status: "pending" } }).catch(() => 0),
    ]);

    return {
      // Standard DRX statuses (mapped to QueueBar keys)
      intake: drxCounts["Pre-Check"] || 0,
      sync: drxCounts["Adjudicating"] || 0,
      reject: drxCounts["Rejected"] || 0,
      print: drxCounts["Print"] || 0,
      scan: drxCounts["Scan"] || 0,
      verify: drxCounts["Verify"] || 0,
      oos: drxCounts["OOS"] || 0,
      waiting_bin: drxCounts["Waiting Bin"] || 0,
      renewals,
      todo: 0, // DRX-internal feature, not exposed via API
      // Custom DRX queues (Boudreaux's-specific)
      price_check: drxCounts["price check"] || 0,
      prepay: drxCounts["prepay"] || 0,
      ok_to_charge: drxCounts["ok to charge"] || 0,
      decline: drxCounts["Decline"] || 0,
      ok_to_charge_clinic: drxCounts["ok to charge clinic"] || 0,
      mochi: drxCounts["mochi"] || 0,
    };
  } catch (e) {
    console.error("[getQueueCounts] Error fetching from DRX:", e);
    return fallback;
  }
}
