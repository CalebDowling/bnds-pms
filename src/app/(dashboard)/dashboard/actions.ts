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

  // Dual-mode: use DRX API when sync is enabled (DRX is still primary),
  // fall back to local DB when DRX sync is disabled (independence mode).
  const drxDisabled = process.env.DRX_SYNC_ENABLED === "false";

  if (!drxDisabled) {
    // ── DRX Mode: fetch live counts from DRX API ──
    try {
      const { fetchAllQueueCounts } = await import("@/lib/drx/client");
      const { prisma } = await import("@/lib/prisma");

      const [drxCounts, renewals] = await Promise.all([
        fetchAllQueueCounts(),
        prisma.refillRequest.count({ where: { status: "pending" } }).catch(() => 0),
      ]);

      function findCount(name: string): number {
        if (drxCounts[name] !== undefined) return drxCounts[name];
        const lower = name.toLowerCase().trim();
        for (const [key, val] of Object.entries(drxCounts)) {
          if (key.toLowerCase().trim() === lower) return val;
        }
        return 0;
      }

      return {
        intake: findCount("Pre-Check"),
        sync: findCount("Adjudicating"),
        reject: findCount("Rejected"),
        print: findCount("Print"),
        scan: findCount("Scan"),
        verify: findCount("Verify"),
        oos: findCount("OOS"),
        waiting_bin: findCount("Waiting Bin"),
        renewals,
        todo: 0,
        price_check: findCount("price check"),
        prepay: findCount("prepay"),
        ok_to_charge: findCount("ok to charge"),
        decline: findCount("Decline"),
        ok_to_charge_clinic: findCount("ok to charge clinic"),
        mochi: findCount("mochi"),
      };
    } catch (e) {
      console.error("[getQueueCounts] DRX API error, falling back to local DB:", e);
      // Fall through to local DB mode
    }
  }

  // ── Local DB Mode: query prescription_fills table ──
  try {
    const { prisma } = await import("@/lib/prisma");
    const { QUEUE_TO_FILL_STATUS } = await import("@/lib/workflow/fill-status");

    const [statusCounts, renewals] = await Promise.all([
      prisma.prescriptionFill.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.refillRequest.count({ where: { status: "pending" } }).catch(() => 0),
    ]);

    const countByStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      countByStatus[row.status] = row._count;
    }

    const result: Record<string, number> = { ...fallback };
    for (const [queueKey, statuses] of Object.entries(QUEUE_TO_FILL_STATUS)) {
      result[queueKey] = statuses.reduce((sum, s) => sum + (countByStatus[s] || 0), 0);
    }
    result.renewals = renewals;
    result.todo = 0;

    return result as typeof fallback;
  } catch (e) {
    console.error("[getQueueCounts] Error:", e);
    return fallback;
  }
}
