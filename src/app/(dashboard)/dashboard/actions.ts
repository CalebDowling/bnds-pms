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
  const { prisma } = await import("@/lib/prisma");
  const fallback = {
    intake: 0,
    pre_check: 0,
    adjudicating: 0,
    print: 0,
    scan: 0,
    verify: 0,
    oos: 0,
    hold: 0,
    waiting_bin: 0,
    rejected: 0,
    refills: 0,
  };

  try {
    // Query prescription_fills by DRX fill status using case-insensitive matching.
    // DRX fill statuses: Pre-Check, Adjudicating, Print, Scan, Verify, OOS, Hold,
    // Waiting Bin, Rejected, Sold
    const [pre_check, adjudicating, print, scan, verify, oos, hold, waiting_bin, rejected, refills] =
      await Promise.all([
        prisma.prescriptionFill.count({ where: { status: { equals: "Pre-Check", mode: "insensitive" } } }).catch(() => 0),
        prisma.prescriptionFill.count({ where: { status: { equals: "Adjudicating", mode: "insensitive" } } }).catch(() => 0),
        prisma.prescriptionFill.count({ where: { status: { equals: "Print", mode: "insensitive" } } }).catch(() => 0),
        prisma.prescriptionFill.count({ where: { status: { equals: "Scan", mode: "insensitive" } } }).catch(() => 0),
        prisma.prescriptionFill.count({ where: { status: { equals: "Verify", mode: "insensitive" } } }).catch(() => 0),
        prisma.prescriptionFill.count({ where: { status: { equals: "OOS", mode: "insensitive" } } }).catch(() => 0),
        prisma.prescriptionFill.count({ where: { status: { equals: "Hold", mode: "insensitive" } } }).catch(() => 0),
        prisma.prescriptionFill.count({ where: { status: { equals: "Waiting Bin", mode: "insensitive" } } }).catch(() => 0),
        prisma.prescriptionFill.count({ where: { status: { equals: "Rejected", mode: "insensitive" } } }).catch(() => 0),
        prisma.refillRequest.count({ where: { status: "pending" } }).catch(() => 0),
      ]);

    // Count intake from prescriptions (new Rx without fills yet)
    const intake = await prisma.prescription.count({ where: { status: "intake" } }).catch(() => 0);

    return { intake, pre_check, adjudicating, print, scan, verify, oos, hold, waiting_bin, rejected, refills };
  } catch {
    return fallback;
  }
}
