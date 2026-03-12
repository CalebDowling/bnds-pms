"use server";

import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fallback = {
    patientsToday: 0,
    rxToday: 0,
    activeItems: 0,
    doctorsOnFile: 0,
    pendingBatches: 0,
    lowStockItems: 0,
    salesToday: 0,
    rejectedClaims: 0,
  };

  try {
    const [p, r, i, d, b, l, s, c] = await Promise.all([
      prisma.patient.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
      prisma.prescription.count({ where: { dateReceived: { gte: today } } }).catch(() => 0),
      prisma.item.count({ where: { isActive: true } }).catch(() => 0),
      prisma.prescriber.count().catch(() => 0),
      prisma.batch.count({ where: { status: "in_progress" } }).catch(() => 0),
      prisma.item.count({ where: { isActive: true, reorderPoint: { gt: 0 } } }).catch(() => 0),
      prisma.posTransaction.count({ where: { processedAt: { gte: today } } }).catch(() => 0),
      prisma.claim.count({ where: { status: "rejected" } }).catch(() => 0),
    ]);
    return {
      patientsToday: p,
      rxToday: r,
      activeItems: i,
      doctorsOnFile: d,
      pendingBatches: b,
      lowStockItems: l,
      salesToday: s,
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
    waiting: 0,
    renewals: 0,
    todo: 0,
  };

  try {
    const [intake, sync, reject, print, scan, verify, oos, waiting, renewals, todo] =
      await Promise.all([
        prisma.prescription.count({ where: { status: "intake" } }).catch(() => 0),
        prisma.prescription.count({ where: { status: "sync" } }).catch(() => 0),
        prisma.prescription.count({ where: { status: "rejected" } }).catch(() => 0),
        prisma.prescription.count({ where: { status: "print" } }).catch(() => 0),
        prisma.prescription.count({ where: { status: "scan" } }).catch(() => 0),
        prisma.prescription.count({ where: { status: "verify" } }).catch(() => 0),
        prisma.item.count({ where: { isActive: true, reorderPoint: { gt: 0 } } }).catch(() => 0),
        prisma.prescriptionFill.count({ where: { status: "waiting" } }).catch(() => 0),
        prisma.renewal.count({ where: { status: "pending" } }).catch(() => 0),
        prisma.todo.count({ where: { status: "open" } }).catch(() => 0),
      ]);

    return { intake, sync, reject, print, scan, verify, oos, waiting, renewals, todo };
  } catch {
    return fallback;
  }
}
