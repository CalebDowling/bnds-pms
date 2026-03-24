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
    // Fetch live fill counts from DRX:
    // - Standard statuses via external API (/external_api/v1/prescription-fills?status=X)
    // - Custom queues via internal API (/api/v1/custom_workflow_queue)
    const { fetchAllQueueCounts } = await import("@/lib/drx/client");
    const { prisma } = await import("@/lib/prisma");

    const [drxCounts, renewals] = await Promise.all([
      fetchAllQueueCounts(),
      // Renewals = pending refill requests (from our DB)
      prisma.refillRequest.count({ where: { status: "pending" } }).catch(() => 0),
    ]);

    // Helper: DRX custom queue names may have trailing spaces or case differences
    function findCount(name: string): number {
      // Try exact match first
      if (drxCounts[name] !== undefined) return drxCounts[name];
      // Try trimmed case-insensitive match
      const lower = name.toLowerCase().trim();
      for (const [key, val] of Object.entries(drxCounts)) {
        if (key.toLowerCase().trim() === lower) return val;
      }
      return 0;
    }

    return {
      // Standard DRX statuses (mapped to QueueBar keys)
      intake: findCount("Pre-Check"),
      sync: findCount("Adjudicating"),
      reject: findCount("Rejected"),
      print: findCount("Print"),
      scan: findCount("Scan"),
      verify: findCount("Verify"),
      oos: findCount("OOS"),
      waiting_bin: findCount("Waiting Bin"),
      renewals,
      todo: 0, // DRX-internal feature, not exposed via API
      // Custom DRX queues (from /api/v1/custom_workflow_queue)
      price_check: findCount("price check"),
      prepay: findCount("prepay"),
      ok_to_charge: findCount("ok to charge"),
      decline: findCount("Decline"),
      ok_to_charge_clinic: findCount("ok to charge clinic"),
      mochi: findCount("mochi"),
    };
  } catch (e) {
    console.error("[getQueueCounts] Error fetching from DRX:", e);
    return fallback;
  }
}
