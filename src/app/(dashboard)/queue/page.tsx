/**
 * /queue — Rx Queue landing page (real data).
 *
 * This page replaces the original mock-data redesign. It fetches active fills
 * directly from the database (not via DRX) and groups them into the four
 * pharmacist-facing visual buckets:
 *
 *   verify    → fill_status = "verify"
 *   filling   → fill_status in ("print", "scan")
 *   insurance → fill_status in ("intake", "adjudicating", "rejected", "rph_rejected")
 *   ready     → fill_status = "waiting_bin"
 *
 * Each row links to /queue/process/[fillId] — the actual workflow page where
 * the technician/pharmacist completes scan, verify, and pickup steps. The
 * server component fetches the data so initial load is fast; QueueClient
 * handles tab filtering and right-rail selection client-side.
 */
import { prisma } from "@/lib/prisma";
import { ACTIVE_FILL_STATUSES } from "@/lib/workflow/fill-status";
import QueueClient, { type QueueRow, type QueueBucket } from "./QueueClient";

export const dynamic = "force-dynamic";

// Map the four visual tabs to the real fill statuses behind them. Kept here so
// the client can render a buckets-by-status filter without re-importing the
// entire fill-status module.
const BUCKET_MAP: Record<QueueBucket, string[]> = {
  verify: ["verify"],
  filling: ["print", "scan"],
  insurance: ["intake", "adjudicating", "rejected", "rph_rejected"],
  ready: ["waiting_bin"],
};

function bucketForStatus(status: string): QueueBucket | null {
  for (const [bucket, list] of Object.entries(BUCKET_MAP)) {
    if (list.includes(status)) return bucket as QueueBucket;
  }
  return null;
}

export default async function QueuePage() {
  // We pull every active (non-terminal) fill in one shot so the client can
  // tab-filter without re-fetching. Pharmacy-scale volume tops out at a few
  // hundred active fills at any time, so this is well within the budget.
  // If this ever balloons, add pagination/server-side filtering with a
  // searchParams contract — but for now, simpler is better.
  let dbFills: Awaited<ReturnType<typeof prisma.prescriptionFill.findMany>> = [];
  try {
    dbFills = await prisma.prescriptionFill.findMany({
      where: { status: { in: ACTIVE_FILL_STATUSES } },
      include: {
        prescription: {
          select: {
            rxNumber: true,
            refillsRemaining: true,
            patient: {
              select: {
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                allergies: {
                  where: { status: "active" },
                  select: { id: true, severity: true, allergen: true },
                  take: 5,
                },
                insurance: {
                  where: { isActive: true },
                  orderBy: { priority: "asc" },
                  take: 1,
                  select: { thirdPartyPlan: { select: { planName: true } } },
                },
              },
            },
            item: {
              select: { name: true, deaSchedule: true, isControlled: true },
            },
            prescriber: { select: { firstName: true, lastName: true, suffix: true } },
          },
        },
        item: { select: { name: true, deaSchedule: true, isControlled: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
  } catch (e) {
    console.error("[/queue] Failed to fetch fills:", e);
    dbFills = [];
  }

  const rows: QueueRow[] = (dbFills as any[])
    .map((f) => {
      const bucket = bucketForStatus(f.status);
      if (!bucket) return null;
      const patient = f.prescription?.patient;
      const item = f.item ?? f.prescription?.item;
      const prescriber = f.prescription?.prescriber;
      const insurance = patient?.insurance?.[0]?.thirdPartyPlan?.planName ?? "Cash";
      const refillsRemaining = f.prescription?.refillsRemaining ?? 0;
      const allergies = patient?.allergies ?? [];
      const hasSevereAllergy = allergies.some(
        (a: any) => a.severity === "severe" || a.severity === "critical"
      );
      const deaSchedule = item?.deaSchedule?.toUpperCase().trim() ?? null;
      const isControlled =
        !!item?.isControlled ||
        (deaSchedule != null &&
          (deaSchedule.startsWith("C") ||
            ["II", "III", "IV", "V"].includes(deaSchedule)));
      const isCII =
        deaSchedule === "II" || deaSchedule === "C-II" || deaSchedule === "CII";

      return {
        fillId: f.id as string,
        rxNumber: f.prescription?.rxNumber ?? "—",
        patientName: patient
          ? `${patient.lastName ?? ""}, ${patient.firstName ?? ""}`.trim()
          : "Unknown",
        patientDob: patient?.dateOfBirth
          ? new Date(patient.dateOfBirth).toISOString().slice(0, 10)
          : null,
        itemName: item?.name ?? "Unknown drug",
        prescriberName: prescriber
          ? `Dr. ${prescriber.lastName}${prescriber.suffix ? `, ${prescriber.suffix}` : ""}`
          : "—",
        status: f.status as string,
        bucket,
        quantity: Number(f.quantity ?? 0),
        daysSupply: f.daysSupply ?? null,
        refillsRemaining,
        insurance,
        isControlled,
        isCII,
        deaSchedule,
        hasSevereAllergy,
        allergyList: allergies.map((a: any) => a.allergen).filter(Boolean),
        createdAt: (f.createdAt as Date)?.toISOString() ?? null,
      } as QueueRow;
    })
    .filter((r): r is QueueRow => r !== null);

  const counts = {
    all: rows.length,
    verify: rows.filter((r) => r.bucket === "verify").length,
    filling: rows.filter((r) => r.bucket === "filling").length,
    insurance: rows.filter((r) => r.bucket === "insurance").length,
    ready: rows.filter((r) => r.bucket === "ready").length,
  };

  return <QueueClient rows={rows} counts={counts} />;
}
