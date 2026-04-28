"use server";

import { formatPatientName } from "@/lib/utils/formatters";

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

// ─── Recent Activity ──────────────────────────────────────────────

export interface RecentActivityItem {
  fillId: string;
  rxNum: string;
  patient: string;
  /** Most recent event for this fill — e.g. "verify → waiting_bin", "patient_notified", "pickup_checklist". */
  eventLabel: string;
  /** Who performed the event (tech / pharmacist). */
  performer: string;
  copay: string | null;
  minutesAgo: number;
}

/**
 * Returns the N most recent fill events across the pharmacy. This drives the
 * dashboard "Recent Activity" rail — previously hardcoded with fake data so
 * pharmacists couldn't see what was actually happening on the floor.
 *
 * We dedupe by fillId so a single fill that just transitioned doesn't push
 * older fills off the list with multiple events.
 */
export async function getRecentActivity(
  limit: number = 8
): Promise<RecentActivityItem[]> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const { FILL_STATUS_META } = await import("@/lib/workflow/fill-status");

    // Pull more than `limit` so dedupe-by-fill still leaves us enough rows.
    const events = await prisma.fillEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit * 4,
      include: {
        performer: { select: { firstName: true, lastName: true } },
        fill: {
          select: {
            id: true,
            copayAmount: true,
            prescription: {
              select: {
                rxNumber: true,
                patient: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    const seen = new Set<string>();
    const out: RecentActivityItem[] = [];
    const now = Date.now();

    for (const e of events) {
      if (out.length >= limit) break;
      if (!e.fill || seen.has(e.fillId)) continue;
      seen.add(e.fillId);

      const rx = e.fill.prescription;
      // formatPatientName cleans DRX artifacts and title-cases the name
      // so the dashboard activity feed matches the queue / pickup
      // surfaces.
      const patient = formatPatientName(rx?.patient) || "Unknown";

      // Translate the event into something a pharmacist actually wants to
      // read. status_change events get the status label; the others get a
      // human-readable summary.
      let eventLabel = e.eventType;
      if (e.eventType === "status_change" && e.fromValue && e.toValue) {
        const from = FILL_STATUS_META[e.fromValue]?.label || e.fromValue;
        const to = FILL_STATUS_META[e.toValue]?.label || e.toValue;
        eventLabel = `${from} → ${to}`;
      } else if (e.eventType === "verify_checklist") {
        eventLabel = "RPh verified";
      } else if (e.eventType === "pickup_checklist") {
        eventLabel = "Pickup confirmed";
      } else if (e.eventType === "patient_notified") {
        eventLabel = "Patient notified";
      } else if (e.eventType === "metadata_update") {
        eventLabel = "Metadata updated";
      }

      const minutesAgo = Math.max(
        0,
        Math.floor((now - e.createdAt.getTime()) / 60000)
      );

      out.push({
        fillId: e.fillId,
        rxNum: rx?.rxNumber || "—",
        patient,
        eventLabel,
        // Performer is a User row (internal), but funneling through the
        // shared formatter keeps title-casing consistent across surfaces.
        performer: formatPatientName(e.performer) || "—",
        copay: e.fill.copayAmount ? `$${Number(e.fill.copayAmount).toFixed(2)}` : null,
        minutesAgo,
      });
    }

    return out;
  } catch (err) {
    console.error("[getRecentActivity] Error:", err);
    return [];
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
    rph_rejected: 0,
    oos: 0,
    waiting_bin: 0,
    renewals: 0,
    todo: 0,
    price_check: 0,
    prepay: 0,
    ok_to_charge: 0,
    decline: 0,
    ok_to_charge_clinic: 0,
    compound_qa: 0,
    telehealth: 0,
    mochi: 0, // legacy
  };

  // Dual-mode: use DRX API when sync is enabled, otherwise read counts from
  // the local prescription_fills table. Default is OFF — see env.isDrxEnabled.
  const { env } = await import("@/lib/env");
  const drxEnabled = env.isDrxEnabled();

  if (drxEnabled) {
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
        rph_rejected: 0, // not in DRX — local-only queue added per pharmacist review
        oos: findCount("OOS"),
        waiting_bin: findCount("Waiting Bin"),
        renewals,
        todo: 0,
        price_check: findCount("price check"),
        prepay: findCount("prepay"),
        ok_to_charge: findCount("ok to charge"),
        decline: findCount("Decline"),
        ok_to_charge_clinic: findCount("ok to charge clinic"),
        compound_qa: 0, // not in DRX — local-only queue
        telehealth: 0,  // not in DRX — local-only queue
        mochi: findCount("mochi"), // legacy DRX mapping
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
